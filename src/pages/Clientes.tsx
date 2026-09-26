import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { clienteService, Cliente } from '../services/clienteService';
import './Clientes.css';

const createEmptyForm = (): Cliente => ({
  nombre: '',
  apellido: '',
  documento: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
});

const ClientesPage = () => {
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Cliente>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await clienteService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Cliente = {
      nombre: String(formData.nombre ?? '').trim(),
      apellido: String(formData.apellido ?? '').trim(),
      documento: String(formData.documento ?? '').trim(),
      telefono: String(formData.telefono ?? '').trim(),
      email: String(formData.email ?? '').trim(),
      direccion: String(formData.direccion ?? '').trim(),
      activo: Boolean(formData.activo),
    };

    if (!payload.nombre || !payload.apellido) {
      alert('El nombre y el apellido son obligatorios');
      return;
    }

    try {
      if (editingId) {
        const updated = await clienteService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await clienteService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar cliente:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el cliente');
    }
  };

  const handleEdit = (item: Cliente) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      apellido: item.apellido,
      documento: item.documento ?? '',
      telefono: item.telefono ?? '',
      email: item.email ?? '',
      direccion: item.direccion ?? '',
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este cliente?')) {
      return;
    }

    try {
      await clienteService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('No se pudo eliminar el cliente');
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nombre', 'apellido', 'documento', 'telefono', 'email', 'direccion', 'activo'],
      ['Juan', 'Pérez', '30111222', '555-1000', 'juan@gmail.com', 'Av. Siempre Viva 123', 'TRUE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    XLSX.writeFile(workbook, 'plantilla_clientes.xlsx');
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
        apellido: item.apellido,
        documento: item.documento ?? '',
        telefono: item.telefono ?? '',
        email: item.email ?? '',
        direccion: item.direccion ?? '',
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    XLSX.writeFile(workbook, 'clientes.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Clientes', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nombre', 36, y);
    pdf.text('Apellido', 82, y);
    pdf.text('Doc.', 132, y);
    pdf.text('Tel.', 156, y);
    pdf.text('Activo', 182, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 36, y);
      pdf.text(String(item.apellido ?? ''), 82, y);
      pdf.text(String(item.documento ?? ''), 132, y);
      pdf.text(String(item.telefono ?? ''), 156, y);
      pdf.text(item.activo ? 'Sí' : 'No', 182, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('clientes.pdf');
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
          const apellido = String(row.apellido ?? row.APELLIDO ?? row.lastName ?? row.last_name ?? '').trim();
          const documento = String(row.documento ?? row.DOCUMENTO ?? row.dni ?? row.DNI ?? '').trim();
          const telefono = String(row.telefono ?? row.TELEFONO ?? row.phone ?? row.phone_number ?? '').trim();
          const email = String(row.email ?? row.EMAIL ?? '').trim();
          const direccion = String(row.direccion ?? row.DIRECCION ?? row.address ?? '').trim();
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { nombre, apellido, documento, telefono, email, direccion, activo };
        })
        .filter((row) => row.nombre && row.apellido);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await clienteService.create({
          nombre: row.nombre,
          apellido: row.apellido,
          documento: row.documento,
          telefono: row.telefono,
          email: row.email,
          direccion: row.direccion,
          activo: row.activo,
        });
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
    return <div>Cargando clientes...</div>;
  }

  return (
    <div className="clientes">
      <div className="clientes-header">
        <h1>Clientes</h1>
        <div className="clientes-actions">
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
            {showForm ? 'Cancelar' : '+ Nuevo cliente'}
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
        <form onSubmit={handleSubmit} className="clientes-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Documento</label>
              <input type="text" name="documento" value={formData.documento} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} />
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
          <div className="empty-state">No hay clientes registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.apellido}, {item.nombre}</h3>
              <p><strong>Documento:</strong> {item.documento || '—'}</p>
              <p><strong>Teléfono:</strong> {item.telefono || '—'}</p>
              <p><strong>Email:</strong> {item.email || '—'}</p>
              <p><strong>Dirección:</strong> {item.direccion || '—'}</p>
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

export default ClientesPage;