import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { pinchadaService, Pinchada } from '../services/pinchadaService';
import { canillaService, Canilla } from '../services/canillaService';
import { productoService, Producto } from '../services/productoService';
import './Pinchadas.css';

const today = (): string => new Date().toISOString().slice(0, 10);

const createEmptyForm = (): Pinchada => ({
  canilla_id: null,
  producto_id: 0,
  fecha_inicio: today(),
  fecha_fin: '',
  cantidad_vendida: 0,
});

const PinchadasPage = () => {
  const [items, setItems] = useState<Pinchada[]>([]);
  const [canillas, setCanillas] = useState<Canilla[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Pinchada>(() => createEmptyForm());

  const fetchItems = async () => {
    try {
      const data = await pinchadaService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar pinchadas:', error);
    }
  };

  const fetchSelects = async () => {
    try {
      const [canillasData, productosData] = await Promise.all([
        canillaService.getAll({ activo: true }),
        productoService.getAll({ activo: true }),
      ]);
      setCanillas(canillasData);
      setProductos(productosData);
    } catch (error) {
      console.error('Error al cargar canillas o productos:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchItems(), fetchSelects()]).finally(() => setLoading(false));
  }, []);

  const cervezas = productos.filter((p) => Number(p.grupo1prod) === 1);

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value || 0) : value === '' && name !== 'fecha_inicio' ? null : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fechaInicio = String(formData.fecha_inicio ?? '').trim();
    const fechaFinRaw = formData.fecha_fin;
    const fechaFin = fechaFinRaw === '' || fechaFinRaw === null || fechaFinRaw === undefined ? null : String(fechaFinRaw).trim();

    if (!fechaInicio) {
      alert('La fecha de inicio es obligatoria');
      return;
    }

    if (!formData.canilla_id) {
      alert('Debe seleccionar primero la canilla a pinchar');
      return;
    }

    if (!Number(formData.producto_id)) {
      alert('Debe seleccionar la cerveza pinchada');
      return;
    }

    if (fechaFin && fechaFin < fechaInicio) {
      alert('La fecha fin no puede ser anterior a la fecha inicio');
      return;
    }

    const payload: Pinchada = {
      canilla_id: formData.canilla_id === null || formData.canilla_id === undefined
        ? null
        : Number(formData.canilla_id),
      producto_id: Number(formData.producto_id),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      cantidad_vendida: Math.max(0, Number(formData.cantidad_vendida || 0)),
    };

    try {
      if (editingId) {
        const updated = await pinchadaService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      } else {
        const created = await pinchadaService.create(payload);
        setItems((prev) => [...prev, created]);
        if (created.aviso) {
          alert(created.aviso);
        }
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar pinchada:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar la pinchada');
    }
  };

  const handleEdit = (item: Pinchada) => {
    setEditingId(item.id ?? null);
    setFormData({
      canilla_id: item.canilla_id ?? null,
      producto_id: Number(item.producto_id) || 0,
      fecha_inicio: String(item.fecha_inicio ?? today()).slice(0, 10),
      fecha_fin: item.fecha_fin ? String(item.fecha_fin).slice(0, 10) : null,
      cantidad_vendida: Number(item.cantidad_vendida ?? 0),
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar esta pinchada?')) {
      return;
    }

    try {
      await pinchadaService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar pinchada:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar la pinchada');
    }
  };

  const handleExportExcel = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      items.map((item) => ({
        id: item.id,
        canilla: item.canilla_nombre ?? 'Sin canilla',
        cerveza: item.producto_nombre ?? `Producto #${item.producto_id}`,
        fecha_inicio: item.fecha_inicio,
        fecha_fin: item.fecha_fin ?? '',
        cantidad_vendida: Number(item.cantidad_vendida ?? 0),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pinchadas');
    XLSX.writeFile(workbook, 'pinchadas.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Pinchadas de Canillas', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 10, y);
    pdf.text('Canilla', 26, y);
    pdf.text('Cerveza', 60, y);
    pdf.text('Inicio', 116, y);
    pdf.text('Fin', 145, y);
    pdf.text('Vendido', 172, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 10, y);
      pdf.text(String(item.canilla_nombre ?? 'Sin canilla'), 26, y);
      pdf.text(String(item.producto_nombre ?? '#'), 60, y);
      pdf.text(String(item.fecha_inicio ?? ''), 116, y);
      pdf.text(item.fecha_fin ? String(item.fecha_fin) : '—', 145, y);
      pdf.text(String(Number(item.cantidad_vendida ?? 0)), 172, y);
      y += 8;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('pinchadas.pdf');
  };

  if (loading) {
    return <div>Cargando pinchadas...</div>;
  }

  return (
    <div className="pinchadas">
      <div className="pinchadas-header">
        <div>
          <h1>Pinchadas de Canillas</h1>
          <p className="subtitle">Registro de cerveza pinchada en cada canilla (barriles de 50 litros)</p>
        </div>
        <div className="pinchadas-actions">
          <button className="btn-secondary" type="button" onClick={handleExportExcel}>
            Exportar Excel
          </button>
          <button className="btn-secondary" type="button" onClick={handleExportPdf}>
            Exportar PDF
          </button>
          <button className="btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Cancelar' : '+ Nueva pinchada'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="pinchadas-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Canilla</label>
              <select name="canilla_id" value={formData.canilla_id ?? ''} onChange={handleInputChange} required>
                <option value="">— Seleccionar canilla —</option>
                {canillas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cerveza pinchada</label>
              <select name="producto_id" value={formData.producto_id || ''} onChange={handleInputChange} required>
                <option value="">— Seleccionar cerveza —</option>
                {cervezas.length === 0
                  ? productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))
                  : cervezas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha inicio</label>
              <input
                type="date"
                name="fecha_inicio"
                value={formData.fecha_inicio ?? ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha fin</label>
              <input type="date" name="fecha_fin" value={formData.fecha_fin ?? ''} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Cantidad vendida (litros)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="cantidad_vendida"
                value={formData.cantidad_vendida ?? 0}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Limpiar</button>
          </div>
        </form>
      )}

      <div className="pinchadas-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay pinchadas registradas</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="pinchada-card">
              <div className="pinchada-kind">🍺</div>
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.producto_nombre || `Cerveza #${item.producto_id}`}</h3>
              <p><strong>Canilla:</strong> {item.canilla_nombre || 'Sin canilla'}</p>
              <p><strong>Fecha inicio:</strong> {item.fecha_inicio}</p>
              <p><strong>Fecha fin:</strong> {item.fecha_fin || '—'}</p>
              <p><strong>Cantidad vendida:</strong> {Number(item.cantidad_vendida ?? 0).toFixed(2)} litros</p>
              <div className="card-actions">
                <button className="btn-primary" onClick={() => handleEdit(item)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(item.id)}>Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PinchadasPage;