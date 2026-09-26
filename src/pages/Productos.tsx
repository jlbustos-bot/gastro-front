import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { grupo1prodService } from '../services/grupo1prodService';
import { grupo2prodService } from '../services/grupo2prodService';
import { proveedorService } from '../services/proveedorService';
import { productoService, Producto } from '../services/productoService';
import './Grupo1Prod.css';

const createEmptyForm = (): Producto => ({
  nombre: '',
  nombrecorto: '',
  grupo1prod: null,
  grupo2prod: null,
  proveedor_id: null,
  precioventa: 0,
  activo: true,
});

const ProductosPage = () => {
  const [items, setItems] = useState<Producto[]>([]);
  const [grupo1Options, setGrupo1Options] = useState<Array<{ id?: number; nombre: string }>>([]);
  const [grupo2Options, setGrupo2Options] = useState<Array<{ id?: number; nombre: string }>>([]);
  const [proveedorOptions, setProveedorOptions] = useState<Array<{ id?: number; nombre: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Producto>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await productoService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const fetchGroupOptions = async () => {
    try {
      const [grupo1, grupo2, proveedores] = await Promise.all([
        grupo1prodService.getAll(),
        grupo2prodService.getAll(),
        proveedorService.getAll({ activo: true }),
      ]);
      setGrupo1Options(grupo1);
      setGrupo2Options(grupo2);
      setProveedorOptions(proveedores);
    } catch (error) {
      console.error('Error al cargar grupos de productos y proveedores:', error);
    }
  };

  const getProveedorNombre = (item: Producto) => {
    if (item.proveedor_nombre) return item.proveedor_nombre;
    const match = proveedorOptions.find((option) => option.id === item.proveedor_id);
    return match?.nombre ?? '';
  };

  const getGrupo1Nombre = (item: Producto) => {
    if (item.grupo1prod_nombre) return item.grupo1prod_nombre;
    const match = grupo1Options.find((option) => option.id === item.grupo1prod);
    return match?.nombre ?? '';
  };

  const getGrupo2Nombre = (item: Producto) => {
    if (item.grupo2prod_nombre) return item.grupo2prod_nombre;
    const match = grupo2Options.find((option) => option.id === item.grupo2prod);
    return match?.nombre ?? '';
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchItems(), fetchGroupOptions()]);
      setLoading(false);
    };

    loadData();
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
    const nombrecorto = String(formData.nombrecorto ?? '').trim();
    const payload: Producto = {
      nombre,
      nombrecorto,
      grupo1prod: formData.grupo1prod !== null && formData.grupo1prod !== undefined ? Number(formData.grupo1prod) : null,
      grupo2prod: formData.grupo2prod !== null && formData.grupo2prod !== undefined ? Number(formData.grupo2prod) : null,
      proveedor_id: formData.proveedor_id !== null && formData.proveedor_id !== undefined ? Number(formData.proveedor_id) : null,
      precioventa: Number(formData.precioventa ?? 0),
      activo: Boolean(formData.activo),
    };

    if (!payload.nombre || !payload.nombrecorto) {
      alert('El nombre y el nombre corto son obligatorios');
      return;
    }

    try {
      if (editingId) {
        const updated = await productoService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await productoService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el producto');
    }
  };

  const handleEdit = (item: Producto) => {
    setEditingId(item.id ?? null);
    setFormData({
      nombre: item.nombre,
      nombrecorto: item.nombrecorto ?? '',
      grupo1prod: item.grupo1prod ?? null,
      grupo2prod: item.grupo2prod ?? null,
      proveedor_id: item.proveedor_id ?? null,
      precioventa: Number(item.precioventa ?? 0),
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este producto?')) {
      return;
    }

    try {
      await productoService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['nombre', 'nombrecorto', 'grupo1prod', 'grupo2prod', 'proveedor_id', 'precioventa', 'activo'],
      ['Producto ejemplo', 'PE', '1', '2', '1', '25.99', 'TRUE'],
      ['Producto inactivo', 'PI', '1', '1', '', '18.50', 'FALSE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, 'plantilla_productos.xlsx');
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
        nombrecorto: item.nombrecorto,
        grupo1prod: item.grupo1prod ?? '',
        grupo2prod: item.grupo2prod ?? '',
        proveedor_id: item.proveedor_id ?? '',
        precioventa: item.precioventa,
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, 'productos.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Productos', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nombre', 36, y);
    pdf.text('Corto', 80, y);
    pdf.text('G1', 110, y);
    pdf.text('G2', 122, y);
    pdf.text('Prov', 134, y);
    pdf.text('Precio', 160, y);
    pdf.text('Activo', 185, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 36, y);
      pdf.text(String(item.nombrecorto ?? ''), 80, y);
      pdf.text(String(item.grupo1prod ?? ''), 110, y);
      pdf.text(String(item.grupo2prod ?? ''), 122, y);
      pdf.text(String(item.proveedor_id ?? ''), 134, y);
      pdf.text(String(item.precioventa ?? ''), 160, y);
      pdf.text(item.activo ? 'Sí' : 'No', 185, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('productos.pdf');
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
          const nombrecorto = String(row.nombrecorto ?? row.NOMBRECORTO ?? row.shortName ?? row.short_name ?? '').trim();
          const grupo1prod = row.grupo1prod ?? row.GRUPO1PROD ?? row.grupo_1_prod ?? null;
          const grupo2prod = row.grupo2prod ?? row.GRUPO2PROD ?? row.grupo_2_prod ?? null;
          const proveedorId = row.proveedor_id ?? row.PROVEEDOR_ID ?? row.proveedor ?? row.PROVEEDOR ?? null;
          const precioventa = Number(row.precioventa ?? row.PRECIOVENTA ?? row.precio_venta ?? row.precioVenta ?? 0);
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { nombre, nombrecorto, grupo1prod, grupo2prod, proveedorId, precioventa, activo };
        })
        .filter((row) => row.nombre && row.nombrecorto);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await productoService.create({
          nombre: row.nombre,
          nombrecorto: row.nombrecorto,
          grupo1prod: row.grupo1prod === null || row.grupo1prod === '' ? null : Number(row.grupo1prod),
          grupo2prod: row.grupo2prod === null || row.grupo2prod === '' ? null : Number(row.grupo2prod),
          proveedor_id: row.proveedorId === null || row.proveedorId === '' ? null : Number(row.proveedorId),
          precioventa: Number(row.precioventa ?? 0),
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
    return <div>Cargando productos...</div>;
  }

  return (
    <div className="grupo1prod">
      <div className="grupo1prod-header">
        <h1>Productos</h1>
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
              <label>Nombre corto</label>
              <input type="text" name="nombrecorto" value={formData.nombrecorto} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Grupo 1 prod</label>
              <select
                name="grupo1prod"
                value={formData.grupo1prod ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, grupo1prod: e.target.value === '' ? null : Number(e.target.value) }))}
              >
                <option value="">Seleccione un grupo 1</option>
                {grupo1Options.map((option) => (
                  <option key={option.id} value={option.id ?? ''}>
                    {option.id} - {option.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Grupo 2 prod</label>
              <select
                name="grupo2prod"
                value={formData.grupo2prod ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, grupo2prod: e.target.value === '' ? null : Number(e.target.value) }))}
              >
                <option value="">Seleccione un grupo 2</option>
                {grupo2Options.map((option) => (
                  <option key={option.id} value={option.id ?? ''}>
                    {option.id} - {option.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Proveedor</label>
              <select
                name="proveedor_id"
                value={formData.proveedor_id ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, proveedor_id: e.target.value === '' ? null : Number(e.target.value) }))}
              >
                <option value="">Seleccione un proveedor</option>
                {proveedorOptions.map((option) => (
                  <option key={option.id} value={option.id ?? ''}>
                    {option.id} - {option.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Precio venta</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precioventa"
                value={formData.precioventa}
                onChange={(e) => setFormData((prev) => ({ ...prev, precioventa: Number(e.target.value || 0) }))}
                required
              />
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
              <p><strong>Corto:</strong> {item.nombrecorto}</p>
              <p>
                <strong>G1:</strong> {item.grupo1prod ?? '—'}
                {getGrupo1Nombre(item) ? ` - ${getGrupo1Nombre(item)}` : ''}
              </p>
              <p>
                <strong>G2:</strong> {item.grupo2prod ?? '—'}
                {getGrupo2Nombre(item) ? ` - ${getGrupo2Nombre(item)}` : ''}
              </p>
              <p>
                <strong>Proveedor:</strong> {item.proveedor_id ?? '—'}
                {getProveedorNombre(item) ? ` - ${getProveedorNombre(item)}` : ''}
              </p>
              <p><strong>Precio venta:</strong> {Number(item.precioventa ?? 0).toFixed(2)}</p>
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

export default ProductosPage;
