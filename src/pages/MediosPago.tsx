import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { medioPagoService, MedioPago } from '../services/medioPagoService';
import './MediosPago.css';

const createEmptyForm = (): MedioPago => ({
  nombre: '',
  descripcion: '',
  orden: null,
  activo: true,
});

const MediosPagoPage = () => {
  const [items, setItems] = useState<MedioPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MedioPago>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await medioPagoService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar medios de pago:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, type } = target;
    let value: string | boolean | number | null;
    if (type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else if (name === 'orden') {
      value = target.value === '' ? null : Number(target.value);
    } else {
      value = target.value;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value as any,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: MedioPago = {
      nombre: String(formData.nombre ?? '').trim(),
      descripcion: String(formData.descripcion ?? '').trim(),
      orden: formData.orden === null || formData.orden === undefined ? null : Number(formData.orden),
      activo: Boolean(formData.activo),
    };

    if (!payload.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    try {
      if (editingId) {
        const updated = await medioPagoService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await medioPagoService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar medio de pago:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el medio de pago');
    }
  };

  const handleEdit = (item: MedioPago) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      orden: item.orden ?? null,
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este medio de pago?')) {
      return;
    }

    try {
      await medioPagoService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar medio de pago:', error);
      alert('No se pudo eliminar el medio de pago');
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nombre', 'descripcion', 'activo', 'orden'],
      ['Efectivo', 'Pago en efectivo', 'TRUE', 1],
      ['Tarjeta de crédito', 'Pago con tarjeta', 'TRUE', 2],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MediosPago');
    XLSX.writeFile(workbook, 'plantilla_medios_pago.xlsx');
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
        descripcion: item.descripcion ?? '',
        activo: item.activo ? 'TRUE' : 'FALSE',
        orden: item.orden ?? '',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MediosPago');
    XLSX.writeFile(workbook, 'medios_pago.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Medios de Pago', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nombre', 36, y);
    pdf.text('Descripción', 100, y);
    pdf.text('Activo', 172, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 36, y);
      pdf.text(String(item.descripcion ?? ''), 100, y);
      pdf.text(item.activo ? 'Sí' : 'No', 172, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('medios_pago.pdf');
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      if (!rows.length) {
        throw new Error('El archivo Excel está vacío');
      }

      const normalizedRows = rows
        .map((row) => {
          const nombre = String(row.nombre ?? row.NOMBRE ?? row.name ?? '').trim();
          const descripcion = String(row.descripcion ?? row.DESCRIPCION ?? row.description ?? '').trim();
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);
          const ordenRaw = row.orden ?? row.ORDEN ?? row.order;
          const orden = ordenRaw === undefined || ordenRaw === null || ordenRaw === ''
            ? null
            : Number(ordenRaw);

          return { nombre, descripcion, activo, orden };
        })
        .filter((row) => row.nombre);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await medioPagoService.create({ nombre: row.nombre, descripcion: row.descripcion, activo: row.activo, orden: row.orden });
      }

      await fetchItems();
      alert(`Se importaron ${normalizedRows.length} registros correctamente.`);
    } catch (error: any) {
      console.error('Error al importar Excel:', error);
      alert(error?.message || 'No se pudo importar el archivo Excel');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return <div>Cargando medios de pago...</div>;
  }

  return (
    <div className="medios-pago">
      <div className="medios-pago-header">
        <h1>Medios de Pago</h1>
        <div className="medios-pago-actions">
          <button className="btn-secondary" type="button" onClick={handleDownloadTemplate}>
            Descargar plantilla Excel
          </button>
          <button className="btn-secondary" type="button" onClick={handleExportExcel}>
            Exportar Excel
          </button>
          <button className="btn-secondary" type="button" onClick={handleExportPdf}>
            Exportar PDF
          </button>
          <button className="btn-primary" type="button" onClick={() => fileInputRef.current?.click()}>
            {isImporting ? 'Importando...' : 'Importar Excel'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Cancelar' : '+ Nuevo medio de pago'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleImportExcel}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="medios-pago-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" name="nombre" value={formData.nombre ?? ''} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Orden</label>
              <input
                type="number"
                name="orden"
                min="0"
                step="1"
                value={formData.orden === null || formData.orden === undefined ? '' : formData.orden}
                onChange={handleInputChange}
                placeholder="Posición de orden"
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea name="descripcion" value={formData.descripcion ?? ''} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Activo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' }}>
                <input
                  type="checkbox"
                  name="activo"
                  checked={Boolean(formData.activo)}
                  onChange={handleInputChange}
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

      <div className="product-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay medios de pago registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.nombre}</h3>
              {item.descripcion && <p>{item.descripcion}</p>}
              <div className="tags">
                <span className={`badge ${item.activo === false ? 'inactive' : 'active'}`}>
                  {item.activo === false ? 'Inactivo' : 'Activo'}
                </span>
                {item.orden !== null && item.orden !== undefined && (
                  <span className="badge order">Orden: {item.orden}</span>
                )}
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

export default MediosPagoPage;