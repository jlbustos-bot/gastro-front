import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { canillaService, Canilla } from '../services/canillaService';
import { productoService, Producto } from '../services/productoService';
import './Canillas.css';

const createEmptyForm = (): Canilla => ({
  nombre: '',
  producto_id: null,
  activo: true,
});

const CanillasPage = () => {
  const [items, setItems] = useState<Canilla[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Canilla>(() => createEmptyForm());

  const fetchItems = async () => {
    try {
      const data = await canillaService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar canillas:', error);
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

  const cervezas = productos.filter((p) => Number(p.grupo1prod) === 1);

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value === '' ? null : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Canilla = {
      nombre: String(formData.nombre ?? '').trim(),
      producto_id: formData.producto_id === null || formData.producto_id === undefined
        ? null
        : Number(formData.producto_id),
      activo: formData.activo ?? true,
    };

    if (!payload.nombre) {
      alert('El nombre de la canilla es obligatorio');
      return;
    }

    try {
      if (editingId) {
        const updated = await canillaService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      } else {
        const created = await canillaService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar canilla:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar la canilla');
    }
  };

  const handleEdit = (item: Canilla) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      producto_id: item.producto_id ?? null,
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar esta canilla?')) {
      return;
    }

    try {
      await canillaService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar canilla:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar la canilla');
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
        nombre: item.nombre,
        producto: item.producto_nombre ?? 'Sin producto',
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Canillas');
    XLSX.writeFile(workbook, 'canillas.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Canillas', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nombre', 36, y);
    pdf.text('Producto', 100, y);
    pdf.text('Activo', 175, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 36, y);
      pdf.text(String(item.producto_nombre ?? 'Sin producto'), 100, y);
      pdf.text(item.activo ? 'Sí' : 'No', 175, y);
      y += 8;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('canillas.pdf');
  };

  if (loading) {
    return <div>Cargando canillas...</div>;
  }

  return (
    <div className="canillas">
      <div className="canillas-header">
        <h1>Canillas</h1>
        <p className="subtitle">Canillas para expender cerveza de barril (barriles de 50 litros)</p>
        <div className="canillas-actions">
          <button className="btn-secondary" type="button" onClick={handleExportExcel}>
            Exportar Excel
          </button>
          <button className="btn-secondary" type="button" onClick={handleExportPdf}>
            Exportar PDF
          </button>
          <button className="btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Cancelar' : '+ Nueva canilla'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="canillas-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                placeholder="Ej: Canilla 1"
                value={formData.nombre ?? ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Cerveza (producto que expende)</label>
              <select name="producto_id" value={formData.producto_id ?? ''} onChange={handleInputChange}>
                <option value="">— Sin producto —</option>
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
              <label>Activo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
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

          <div className="form-actions">
            <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Limpiar</button>
          </div>
        </form>
      )}

      <div className="canillas-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay canillas registradas</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="canilla-card">
              <div className="canilla-kind">🍺</div>
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.nombre}</h3>
              <p><strong>Cerveza:</strong> {item.producto_nombre || 'Sin producto'}</p>
              {item.producto_precioventa !== null && item.producto_precioventa !== undefined && (
                <p><strong>Precio venta:</strong> ${Number(item.producto_precioventa).toFixed(2)}</p>
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
          ))
        )}
      </div>
    </div>
  );
};

export default CanillasPage;