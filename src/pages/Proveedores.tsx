import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { proveedorService, Proveedor } from '../services/proveedorService';
import './Proveedores.css';

const createEmptyForm = (): Proveedor => ({
  nombre: '',
  cuit: '',
  telefono: '',
  email: '',
  direccion: '',
  observaciones: '',
  activo: true,
});

const ProveedoresPage = () => {
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Proveedor>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await proveedorService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
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
    let value: string | boolean;
    if (type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
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

    const payload: Proveedor = {
      nombre: String(formData.nombre ?? '').trim(),
      cuit: String(formData.cuit ?? '').trim(),
      telefono: String(formData.telefono ?? '').trim(),
      email: String(formData.email ?? '').trim(),
      direccion: String(formData.direccion ?? '').trim(),
      observaciones: String(formData.observaciones ?? '').trim(),
      activo: Boolean(formData.activo),
    };

    if (!payload.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    try {
      if (editingId) {
        const updated = await proveedorService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await proveedorService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar proveedor:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el proveedor');
    }
  };

  const handleEdit = (item: Proveedor) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      cuit: item.cuit ?? '',
      telefono: item.telefono ?? '',
      email: item.email ?? '',
      direccion: item.direccion ?? '',
      observaciones: item.observaciones ?? '',
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este proveedor?')) {
      return;
    }

    try {
      await proveedorService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      alert('No se pudo eliminar el proveedor');
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nombre', 'cuit', 'telefono', 'email', 'direccion', 'observaciones', 'activo'],
      ['Distribuidora del Norte', '30-12345678-9', '555-3000', 'ventas@distnorte.com', 'Av. Comercio 500', 'Entrega los lunes', 'TRUE'],
      ['Bebidas y Más S.A.', '20-87654321-5', '555-4000', 'contacto@bebidasymas.com', 'Calle Gastronómica 88', '', 'TRUE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
    XLSX.writeFile(workbook, 'plantilla_proveedores.xlsx');
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
        cuit: item.cuit ?? '',
        telefono: item.telefono ?? '',
        email: item.email ?? '',
        direccion: item.direccion ?? '',
        observaciones: item.observaciones ?? '',
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
    XLSX.writeFile(workbook, 'proveedores.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Proveedores', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nombre', 36, y);
    pdf.text('CUIT', 120, y);
    pdf.text('Teléfono', 160, y);
    pdf.text('Activo', 190, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 36, y);
      pdf.text(String(item.cuit ?? ''), 120, y);
      pdf.text(String(item.telefono ?? ''), 160, y);
      pdf.text(item.activo ? 'Sí' : 'No', 190, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('proveedores.pdf');
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
          const cuit = String(row.cuit ?? row.CUIT ?? '').trim();
          const telefono = String(row.telefono ?? row.TELEFONO ?? row.phone ?? '').trim();
          const email = String(row.email ?? row.EMAIL ?? '').trim();
          const direccion = String(row.direccion ?? row.DIRECCION ?? row.address ?? '').trim();
          const observaciones = String(row.observaciones ?? row.OBSERVACIONES ?? row.observations ?? '').trim();
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { nombre, cuit, telefono, email, direccion, observaciones, activo };
        })
        .filter((row) => row.nombre);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await proveedorService.create(row);
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
    return <div>Cargando proveedores...</div>;
  }

  return (
    <div className="proveedores">
      <div className="proveedores-header">
        <h1>Proveedores</h1>
        <div className="proveedores-actions">
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
            {showForm ? 'Cancelar' : '+ Nuevo proveedor'}
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
        <form onSubmit={handleSubmit} className="proveedores-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" name="nombre" value={formData.nombre ?? ''} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>CUIT / CUIL</label>
              <input type="text" name="cuit" value={formData.cuit ?? ''} onChange={handleInputChange} placeholder="Ej. 30-12345678-9" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="text" name="telefono" value={formData.telefono ?? ''} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email ?? ''} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input type="text" name="direccion" value={formData.direccion ?? ''} onChange={handleInputChange} />
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
            <div className="form-group form-group-full">
              <label>Observaciones</label>
              <textarea name="observaciones" value={formData.observaciones ?? ''} onChange={handleInputChange} />
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
          <div className="empty-state">No hay proveedores registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.nombre}</h3>
              <p><strong>CUIT:</strong> {item.cuit || '—'}</p>
              <p><strong>Teléfono:</strong> {item.telefono || '—'}</p>
              <p><strong>Email:</strong> {item.email || '—'}</p>
              <p><strong>Dirección:</strong> {item.direccion || '—'}</p>
              {item.observaciones && <p><strong>Notas:</strong> {item.observaciones}</p>}
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

export default ProveedoresPage;