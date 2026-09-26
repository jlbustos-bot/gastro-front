import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { parametroImpresionService, ParametroImpresion } from '../services/parametroImpresionService';
import './ParametrosImpresion.css';

const DEFAULT_PRINTERS = ['Microsoft Print to PDF', 'Impresora predeterminada', 'PDF Creator'];

const createEmptyForm = (): ParametroImpresion => ({
  cantidad_copias: 1,
  impresora_informes: '',
  impresora_ticket: '',
  activo: true,
});

const ParametrosImpresionPage = () => {
  const [items, setItems] = useState<ParametroImpresion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ParametroImpresion>(() => createEmptyForm());

  const fetchItems = async () => {
    try {
      const data = await parametroImpresionService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar parámetros de impresión:', error);
    }
  };

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  const knownPrinters = Array.from(new Set([
    ...DEFAULT_PRINTERS,
    ...items.flatMap((item) => [item.impresora_informes, item.impresora_ticket]).filter(Boolean),
  ]));

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ParametroImpresion = {
      cantidad_copias: Math.max(1, Math.round(Number(formData.cantidad_copias || 1))),
      impresora_informes: String(formData.impresora_informes ?? '').trim(),
      impresora_ticket: String(formData.impresora_ticket ?? '').trim(),
      activo: formData.activo !== undefined ? formData.activo : true,
    };

    try {
      if (editingId) {
        const updated = await parametroImpresionService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await parametroImpresionService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar parámetro de impresión:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el parámetro');
    }
  };

  const handleEdit = (item: ParametroImpresion) => {
    setEditingId(item.id ?? null);
    setFormData({
      cantidad_copias: Number(item.cantidad_copias ?? 1),
      impresora_informes: item.impresora_informes ?? '',
      impresora_ticket: item.impresora_ticket ?? '',
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este parámetro?')) {
      return;
    }

    try {
      await parametroImpresionService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar parámetro:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar el parámetro');
    }
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Parámetros de Impresión', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Copias', 36, y);
    pdf.text('Impresora informes', 70, y);
    pdf.text('Impresora ticket', 130, y);
    pdf.text('Activo', 180, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.cantidad_copias ?? ''), 36, y);
      pdf.text(String(item.impresora_informes ?? ''), 70, y);
      pdf.text(String(item.impresora_ticket ?? ''), 130, y);
      pdf.text(item.activo ? 'Sí' : 'No', 180, y);
      y += 8;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('parametros_impresion.pdf');
  };

  if (loading) {
    return <div>Cargando parámetros de impresión...</div>;
  }

  return (
    <div className="parametros-impresion">
      <div className="parametros-impresion-header">
        <h1>Parámetros de Impresión</h1>
        <div className="parametros-impresion-actions">
          <button className="btn-secondary" type="button" onClick={handleExportPdf}>
            Exportar PDF
          </button>
          <button className="btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Cancelar' : '+ Nuevo parámetro'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="parametros-impresion-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Cantidad de copias</label>
              <input
                type="number"
                min="1"
                step="1"
                name="cantidad_copias"
                value={formData.cantidad_copias ?? 1}
                onChange={(e) => setFormData((prev) => ({ ...prev, cantidad_copias: Number(e.target.value || 1) }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Impresora informes</label>
              <input
                type="text"
                name="impresora_informes"
                list="impresoras-disponibles"
                placeholder="Nombre tal como figura en el panel de impresión"
                value={formData.impresora_informes ?? ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Impresora ticket</label>
              <input
                type="text"
                name="impresora_ticket"
                list="impresoras-disponibles"
                placeholder="Nombre tal como figura en el panel de impresión"
                value={formData.impresora_ticket ?? ''}
                onChange={handleInputChange}
              />
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
          <datalist id="impresoras-disponibles">
            {knownPrinters.map((printer) => (
              <option key={printer} value={printer} />
            ))}
          </datalist>

          <div className="form-actions">
            <button type="submit" className="btn-success">{editingId ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Limpiar</button>
          </div>
        </form>
      )}

      <div className="product-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay parámetros de impresión registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>Parámetro de Impresión</h3>
              <p><strong>Cantidad de copias:</strong> {Number(item.cantidad_copias ?? 1)}</p>
              <p><strong>Impresora informes:</strong> {item.impresora_informes || '—'}</p>
              <p><strong>Impresora ticket:</strong> {item.impresora_ticket || '—'}</p>
              <div className="tags">
                <span className={`badge ${item.activo === false ? 'inactive' : 'active'}`}>
                  {item.activo === false ? 'Inactivo' : 'Activo'}
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

export default ParametrosImpresionPage;