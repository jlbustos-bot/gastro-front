import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { grupo1prodService, Grupo1Prod } from '../services/grupo1prodService';
import './Grupo1Prod.css';

const createEmptyForm = (): Grupo1Prod => ({
  nombre: '',
  activo: true,
});

const Grupo1ProdPage = () => {
  const [items, setItems] = useState<Grupo1Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Grupo1Prod>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await grupo1prodService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
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

    const nombre = String(formData.nombre ?? '').trim();
    const payload: Grupo1Prod = {
      nombre,
      activo: Boolean(formData.activo),
    };

    if (!payload.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    try {
      if (editingId) {
        const updated = await grupo1prodService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await grupo1prodService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el producto');
    }
  };

  const handleEdit = (item: Grupo1Prod) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este producto?')) {
      return;
    }

    try {
      await grupo1prodService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nombre', 'activo'],
      ['Producto ejemplo', 'TRUE'],
      ['Producto inactivo', 'FALSE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupo1Prod');
    XLSX.writeFile(workbook, 'plantilla_grupo1prod.xlsx');
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
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupo1Prod');
    XLSX.writeFile(workbook, 'grupo1prod.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Grupo 1 Productos', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nombre', 40, y);
    pdf.text('Activo', 120, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 40, y);
      pdf.text(item.activo ? 'Sí' : 'No', 120, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('grupo1prod.pdf');
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
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { nombre, activo };
        })
        .filter((row) => row.nombre);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await grupo1prodService.create({ nombre: row.nombre, activo: row.activo });
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
    return <div>Cargando productos...</div>;
  }

  return (
    <div className="grupo1prod">
      <div className="grupo1prod-header">
        <h1>Grupo 1 Productos</h1>
        <div className="grupo1prod-actions">
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
            {showForm ? 'Cancelar' : '+ Nuevo producto'}
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
        <form onSubmit={handleSubmit} className="grupo1prod-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
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
          <div className="empty-state">No hay productos registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.nombre}</h3>
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

export default Grupo1ProdPage;
