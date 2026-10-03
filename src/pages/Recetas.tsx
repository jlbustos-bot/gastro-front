import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { recetaService, Receta, RecetaComponente, RecetaComponenteInput, RecetaInput } from '../services/recetaService';
import { productoService, Producto } from '../services/productoService';
import './Recetas.css';

interface RecetaForm {
  nombre: string;
  producto_id: number | null;
  descripcion: string;
  cantidad_rinde: string;
  unidad: string;
  observaciones: string;
  activo: boolean;
}

interface ComponenteForm {
  key: string;
  producto_id: number | null;
  nombre: string;
  cantidad: string;
  unidad: string;
  costo_unitario: string;
}

const UNIDADES = ['unidad', 'gramo', 'kg', 'ml', 'litro', 'cc', 'dosis', 'barril'];

const crearComponenteForm = (): ComponenteForm => ({
  key: `${Date.now()}-${Math.random()}`,
  producto_id: null,
  nombre: '',
  cantidad: '1',
  unidad: 'unidad',
  costo_unitario: '0',
});

const costoDeFila = (fila: ComponenteForm): number =>
  Math.round((Number(fila.cantidad) || 0) * (Number(fila.costo_unitario) || 0) * 100) / 100;

const createEmptyForm = (): RecetaForm => ({
  nombre: '',
  producto_id: null,
  descripcion: '',
  cantidad_rinde: '1',
  unidad: 'unidad',
  observaciones: '',
  activo: true,
});

const RecetasPage = () => {
  const [items, setItems] = useState<Receta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RecetaForm>(() => createEmptyForm());
  const [componentes, setComponentes] = useState<ComponenteForm[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchItems = async () => {
    try {
      const data = await recetaService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar recetas:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const data = await productoService.getAll({ activo: true });
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchProductos()]).finally(() => setLoading(false));
  }, []);

  const comidas = productos.filter((p) => Number(p.grupo1prod) !== 1);

  const comidasMostrables = useMemo(() => {
    const seleccionada = productos.find((p) => p.id === formData.producto_id);
    if (!seleccionada || comidas.some((p) => p.id === seleccionada.id)) {
      return comidas;
    }
    return [...comidas, seleccionada];
  }, [productos, comidas, formData.producto_id]);

  const costoTotalForm = componentes.reduce((acc, fila) => acc + costoDeFila(fila), 0);
  const costoUnitarioEstimado = (() => {
    const rinde = Number(formData.cantidad_rinde) || 0;
    if (rinde <= 0) {
      return 0;
    }
    return Math.round((costoTotalForm / rinde) * 100) / 100;
  })();

  const resetForm = () => {
    setFormData(createEmptyForm());
    setComponentes([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    } as RecetaForm));
  };

  const handleComponenteChange = (key: string, field: keyof ComponenteForm, value: string) => {
    setComponentes((prev) =>
      prev.map((fila) => {
        if (fila.key !== key) {
          return fila;
        }
        if (field === 'producto_id') {
          const producto = productos.find((p) => String(p.id) === value);
          return {
            ...fila,
            producto_id: value === '' ? null : Number(value),
            nombre: producto ? producto.nombre : fila.nombre,
            costo_unitario: producto ? String(producto.preciocompra ?? 0) : fila.costo_unitario,
          };
        }
        return { ...fila, [field]: value };
      })
    );
  };

  const addComponenteFila = () => {
    setComponentes((prev) => [...prev, crearComponenteForm()]);
  };

  const removeComponenteFila = (key: string) => {
    setComponentes((prev) => prev.filter((fila) => fila.key !== key));
  };

  const buildComponentesPayload = (): RecetaComponenteInput[] =>
    componentes
      .filter((fila) => fila.nombre.trim())
      .map((fila) => ({
        producto_id: fila.producto_id,
        nombre: fila.nombre.trim(),
        cantidad: Number(fila.cantidad) || 0,
        unidad: fila.unidad || 'unidad',
        costo_unitario: Number(fila.costo_unitario) || 0,
      }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = String(formData.nombre ?? '').trim();
    if (!nombre) {
      alert('El nombre de la receta es obligatorio');
      return;
    }

    const cantidad_rinde = Number(formData.cantidad_rinde) || 0;
    if (cantidad_rinde <= 0) {
      alert('La cantidad que rinde debe ser mayor a cero');
      return;
    }

    const payload: RecetaInput = {
      nombre,
      producto_id: formData.producto_id,
      descripcion: formData.descripcion,
      cantidad_rinde,
      unidad: formData.unidad || 'unidad',
      observaciones: formData.observaciones,
      activo: formData.activo,
      componentes: buildComponentesPayload(),
    };

    try {
      if (editingId) {
        await recetaService.update(editingId, payload);
      } else {
        await recetaService.create(payload);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar receta:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar la receta');
    }
  };

  const handleEdit = (item: Receta) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      producto_id: item.producto_id ?? null,
      descripcion: item.descripcion ?? '',
      cantidad_rinde: String(item.cantidad_rinde ?? 1),
      unidad: item.unidad ?? 'unidad',
      observaciones: item.observaciones ?? '',
      activo: item.activo ?? true,
    });
    setComponentes(
      (item.componentes ?? []).map((componente: RecetaComponente) => {
        const producto = productos.find((p) => p.id === componente.producto_id);
        return {
          key: `edit-${componente.id}-${Math.random()}`,
          producto_id: componente.producto_id ?? null,
          nombre: componente.nombre,
          cantidad: String(componente.cantidad ?? 1),
          unidad: componente.unidad ?? 'unidad',
          costo_unitario: producto ? String(producto.preciocompra ?? 0) : String(componente.costo_unitario ?? 0),
        };
      })
    );
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar esta receta y sus componentes?')) {
      return;
    }

    try {
      await recetaService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar receta:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar la receta');
    }
  };

  const filasParaExport = () =>
    items.flatMap((item) => {
      const costoUnitario = (Number(item.cantidad_rinde) || 0) > 0
        ? Math.round((Number(item.costo_total) / Number(item.cantidad_rinde)) * 100) / 100
        : 0;
      const cabecera = {
        receta_id: item.id,
        receta: item.nombre,
        producto: item.producto_nombre ?? 'Sin producto',
        rinde: item.cantidad_rinde,
        unidad_receta: item.unidad,
        componente: '—',
        cantidad: '',
        unidad_componente: '',
        costo_unitario_componente: '',
        costo_componente: '',
        costo_total_receta: item.costo_total,
        costo_unitario_receta: costoUnitario,
        margen: item.producto_precioventa ? Math.round(((Number(item.producto_precioventa) - costoUnitario) / Number(item.producto_precioventa)) * 100) : '',
        activo: item.activo === false ? 'FALSE' : 'TRUE',
      };
      const detalle = (item.componentes ?? []).map((componente) => ({
        ...cabecera,
        componente: componente.nombre,
        cantidad: componente.cantidad,
        unidad_componente: componente.unidad,
        costo_unitario_componente: componente.costo_unitario,
        costo_componente: componente.costo_total,
      }));
      return [cabecera, ...detalle];
    });

  const handleExportExcel = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filasParaExport());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recetas');
    XLSX.writeFile(workbook, 'recetas.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(14);
    pdf.text('Recetas y costo de componentes', 14, 15);

    let y = 28;
    pdf.setFontSize(9);
    pdf.text('Receta', 14, y);
    pdf.text('Componente', 70, y);
    pdf.text('Cant.', 150, y);
    pdf.text('Unid.', 172, y);
    pdf.text('Costo unit.', 192, y);
    pdf.text('Costo comp.', 226, y);
    pdf.text('Costo receta', 264, y);

    y += 6;
    pdf.line(14, y, 285, y);
    y += 5;

    items.forEach((item) => {
      const componentes = item.componentes ?? [];
      const costoUnitario = (Number(item.cantidad_rinde) || 0) > 0
        ? Math.round((Number(item.costo_total) / Number(item.cantidad_rinde)) * 100) / 100
        : 0;

      if (componentes.length === 0) {
        pdf.setFontSize(9);
        pdf.text(`${item.nombre} (rinde ${item.cantidad_rinde} ${item.unidad ?? ''})`, 14, y);
        pdf.text(`$${Number(item.costo_total).toFixed(2)}`, 264, y);
        y += 7;
      }

      componentes.forEach((componente, index) => {
        if (y > 190) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFontSize(9);
        if (index === 0) {
          pdf.text(`${item.nombre} (rinde ${item.cantidad_rinde} ${item.unidad ?? ''})`, 14, y);
          pdf.text(`$${Number(item.costo_total).toFixed(2)}`, 264, y);
        }
        pdf.text(String(componente.nombre ?? ''), 70, y);
        pdf.text(String(componente.cantidad ?? ''), 150, y);
        pdf.text(String(componente.unidad ?? ''), 172, y);
        pdf.text(`$${Number(componente.costo_unitario ?? 0).toFixed(2)}`, 192, y);
        pdf.text(`$${Number(componente.costo_total ?? 0).toFixed(2)}`, 226, y);
        y += 7;
      });

      pdf.setFontSize(8);
      pdf.text(`Costo unitario por ${item.cantidad_rinde} ${item.unidad ?? ''}: $${costoUnitario.toFixed(2)}`, 70, y);
      y += 9;
    });

    pdf.save('recetas.pdf');
  };

  if (loading) {
    return <div>Cargando recetas...</div>;
  }

  return (
    <div className="recetas">
      <div className="recetas-header">
        <h1>Recetas</h1>
        <p className="subtitle">Recetas con sus componentes y el costo de elaboración de cada uno</p>
        <div className="recetas-actions">
          <button className="btn-secondary" type="button" onClick={handleExportExcel}>
            Exportar Excel
          </button>
          <button className="btn-secondary" type="button" onClick={handleExportPdf}>
            Exportar PDF
          </button>
          <button className="btn-primary" type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Cancelar' : '+ Nueva receta'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="recetas-form">
          <h2 className="form-section-title">Datos de la receta</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                placeholder="Ej: Pizza muzzarella"
                value={formData.nombre ?? ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Comida que se expende</label>
              <select
                name="producto_id"
                value={formData.producto_id === null || formData.producto_id === undefined ? '' : String(formData.producto_id)}
                onChange={handleInputChange}
              >
                <option value="">— Sin producto —</option>
                {comidasMostrables.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad que rinde</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="cantidad_rinde"
                value={formData.cantidad_rinde ?? 1}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Unidad de rinde</label>
              <select name="unidad" value={formData.unidad ?? 'unidad'} onChange={handleInputChange}>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="form-group form-group-wide">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                rows={2}
                value={formData.descripcion ?? ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Activo</label>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  name="activo"
                  checked={Boolean(formData.activo)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                <span>{formData.activo ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          <h2 className="form-section-title">Componentes</h2>
          <div className="componentes-table">
            <div className="componentes-row componentes-row-head">
              <span>Componente</span>
              <span>Cantidad</span>
              <span>Unidad</span>
              <span>Costo unitario</span>
              <span>Costo total</span>
              <span></span>
            </div>
            {componentes.length === 0 && (
              <p className="empty-hint">Agregue los componentes que componen la receta</p>
            )}
            {componentes.map((fila) => (
              <div key={fila.key} className="componentes-row">
                <div className="componentes-nombre">
                  <select
                    value={fila.producto_id === null ? '' : String(fila.producto_id)}
                    onChange={(e) => handleComponenteChange(fila.key, 'producto_id', e.target.value)}
                  >
                    <option value="">— Producto —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Nombre del componente"
                    value={fila.nombre}
                    onChange={(e) => handleComponenteChange(fila.key, 'nombre', e.target.value)}
                  />
                </div>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={fila.cantidad}
                  onChange={(e) => handleComponenteChange(fila.key, 'cantidad', e.target.value)}
                />
                <select
                  value={fila.unidad}
                  onChange={(e) => handleComponenteChange(fila.key, 'unidad', e.target.value)}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fila.costo_unitario}
                  onChange={(e) => handleComponenteChange(fila.key, 'costo_unitario', e.target.value)}
                />
                <span className="componentes-costo">${costoDeFila(fila).toFixed(2)}</span>
                <button
                  type="button"
                  className="btn-danger btn-icon"
                  onClick={() => removeComponenteFila(fila.key)}
                  title="Quitar componente"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="componentes-footer">
            <button type="button" className="btn-secondary" onClick={addComponenteFila}>
              + Agregar componente
            </button>
            <div className="costo-resumen">
              <span>Costo total receta: <strong>${costoTotalForm.toFixed(2)}</strong></span>
              <span>Costo por {formData.cantidad_rinde} {formData.unidad ?? 'unidad'}: <strong>${costoUnitarioEstimado.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="form-group form-group-wide">
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              rows={2}
              value={formData.observaciones ?? ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Limpiar</button>
          </div>
        </form>
      )}

      <div className="recetas-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay recetas registradas</div>
        ) : (
          items.map((item) => {
            const componentes = item.componentes ?? [];
            const costoUnitario = (Number(item.cantidad_rinde) || 0) > 0
              ? Math.round((Number(item.costo_total) / Number(item.cantidad_rinde)) * 100) / 100
              : 0;
            const precioVenta = Number(item.producto_precioventa ?? 0);
            const margen = precioVenta > 0 ? Math.round(((precioVenta - costoUnitario) / precioVenta) * 100) : null;
            const isOpen = expandedId === item.id;

            return (
              <div key={item.id} className="receta-card">
                <div className="receta-kind">📋</div>
                <div className="product-id">ID: {item.id}</div>
                <h3>{item.nombre}</h3>
                <p><strong>Producto:</strong> {item.producto_nombre || 'Sin producto'}</p>
                <p><strong>Rinde:</strong> {item.cantidad_rinde} {item.unidad}</p>
                <p><strong>Costo total:</strong> ${Number(item.costo_total).toFixed(2)}</p>
                <p><strong>Costo unitario:</strong> ${costoUnitario.toFixed(2)}</p>
                {precioVenta > 0 && (
                  <p>
                    <strong>Precio venta:</strong> ${precioVenta.toFixed(2)}
                    {margen !== null && (
                      <>
                        {' — Margen: '}
                        <span className={margen < 0 ? 'margen-negativo' : 'margen-positivo'}>{margen}%</span>
                      </>
                    )}
                  </p>
                )}
                {item.descripcion && <p className="receta-nota"><strong>Descripción:</strong> {item.descripcion}</p>}
                {item.observaciones && <p className="receta-nota"><strong>Observaciones:</strong> {item.observaciones}</p>}

                <button
                  type="button"
                  className="btn-secondary btn-toggle"
                  onClick={() => setExpandedId(isOpen ? null : item.id ?? null)}
                >
                  {isOpen ? 'Ocultar componentes' : `Ver componentes (${componentes.length})`}
                </button>

                {isOpen && (
                  <div className="componentes-lista">
                    {componentes.length === 0 ? (
                      <p className="empty-hint">Esta receta no tiene componentes</p>
                    ) : (
                      <table className="componentes-tabla">
                        <thead>
                          <tr>
                            <th>Componente</th>
                            <th>Cantidad</th>
                            <th>Costo unit.</th>
                            <th>Costo total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {componentes.map((componente) => (
                            <tr key={componente.id}>
                              <td>{componente.nombre}</td>
                              <td>{componente.cantidad} {componente.unidad}</td>
                              <td>${Number(componente.costo_unitario).toFixed(2)}</td>
                              <td>${Number(componente.costo_total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                <div className="tags">
                  <span className={`badge ${item.activo === false ? 'inactive' : 'active'}`}>
                    {item.activo === false ? 'Inactiva' : 'Activa'}
                  </span>
                </div>
                <div className="card-actions">
                  <button className="btn-primary" onClick={() => handleEdit(item)}>Editar</button>
                  <button className="btn-danger" onClick={() => handleDelete(item.id)}>Eliminar</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecetasPage;
