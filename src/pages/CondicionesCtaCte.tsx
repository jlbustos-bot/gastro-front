import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { condicionCtaCteService, CondicionCtaCte } from '../services/condicionCtaCteService';
import './CondicionesCtaCte.css';

const createEmptyForm = (): CondicionCtaCte => ({
  descripcion: '',
  cantidad_dias: 0,
  activo: true,
});

const CondicionesCtaCtePage = () => {
  const [items, setItems] = useState<CondicionCtaCte[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CondicionCtaCte>(() => createEmptyForm());

  const fetchItems = async () => {
    try {
      const data = await condicionCtaCteService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar condiciones:', error);
    }
  };

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value || 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CondicionCtaCte = {
      descripcion: String(formData.descripcion ?? '').trim(),
      cantidad_dias: Math.max(0, Math.round(Number(formData.cantidad_dias || 0))),
      activo: formData.activo !== undefined ? formData.activo : true,
    };

    if (!payload.descripcion) {
      alert('La descripción es obligatoria');
      return;
    }

    try {
      if (editingId) {
        const updated = await condicionCtaCteService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await condicionCtaCteService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar condición:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar la condición');
    }
  };

  const handleEdit = (item: CondicionCtaCte) => {
    setEditingId(item.id ?? null);
    setFormData({
      descripcion: item.descripcion,
      cantidad_dias: item.cantidad_dias,
      activo: item.activo !== undefined ? item.activo : true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id) {
      return;
    }

    if (!confirm('¿Está seguro de eliminar esta condición?')) {
      return;
    }

    try {
      await condicionCtaCteService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar condición:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar la condición');
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
        descripcion: item.descripcion,
        cantidad_dias: item.cantidad_dias,
        activo: item.activo,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Condiciones');
    XLSX.writeFile(workbook, 'condiciones_cta_cte.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Condiciones de Cuenta Corriente', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Descripción', 36, y);
    pdf.text('Días', 170, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.descripcion ?? ''), 36, y);
      pdf.text(String(item.cantidad_dias ?? ''), 170, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('condiciones_cta_cte.pdf');
  };

  if (loading) {
    return <div>Cargando condiciones...</div>;
  }

  return (
    <div className="condiciones">
      <div className="condiciones-header">
        <h1>Condiciones de Cuenta Corriente</h1>
        <div className="condiciones-actions">
          <button className="btn-secondary" type="button" onClick={handleExportExcel}>
            Exportar Excel
          </button>
          <button className="btn-secondary" type="button" onClick={handleExportPdf}>
            Exportar PDF
          </button>
          <button className="btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Cancelar' : '+ Nueva condición'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="condiciones-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Descripción</label>
              <input type="text" name="descripcion" value={formData.descripcion ?? ''} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Cantidad de días</label>
              <input type="number" name="cantidad_dias" min="0" step="1" value={formData.cantidad_dias ?? 0} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" name="activo" checked={formData.activo !== undefined ? formData.activo : true} onChange={handleInputChange} />
                Activo
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Limpiar</button>
          </div>
        </form>
      )}

      <div className="condiciones-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay condiciones registradas</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="condicion-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.descripcion}</h3>
              <p>
                <strong>Cantidad de días:</strong>
                <span className="dias-badge">{item.cantidad_dias ?? 0}</span>
              </p>
              <div className="tags">
                <span className={`badge ${item.activo ? 'active' : 'inactive'}`}>
                  {item.activo ? 'Activo' : 'Inactivo'}
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

export default CondicionesCtaCtePage;