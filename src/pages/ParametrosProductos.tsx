import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { parametroProductoService, ParametroProducto } from '../services/parametroProductoService';
import './ParametrosProductos.css';

const createEmptyForm = (): ParametroProducto => ({
  cantidad_barril_cerveza: 0,
  coeficiente_precio_venta: 0,
  activo: true,
});

const ParametrosProductosPage = () => {
  const [items, setItems] = useState<ParametroProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ParametroProducto>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await parametroProductoService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar parámetros de productos:', error);
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
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ParametroProducto = {
      cantidad_barril_cerveza: Number(formData.cantidad_barril_cerveza ?? 0),
      coeficiente_precio_venta: Number(formData.coeficiente_precio_venta ?? 0),
      activo: Boolean(formData.activo),
    };

    try {
      if (editingId) {
        const updated = await parametroProductoService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await parametroProductoService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar parámetro:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el parámetro');
    }
  };

  const handleEdit = (item: ParametroProducto) => {
    setEditingId(item.id ?? null);
    setFormData({
      cantidad_barril_cerveza: Number(item.cantidad_barril_cerveza ?? 0),
      coeficiente_precio_venta: Number(item.coeficiente_precio_venta ?? 0),
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este parámetro?')) {
      return;
    }

    try {
      await parametroProductoService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar parámetro:', error);
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['cantidad_barril_cerveza', 'coeficiente_precio_venta', 'activo'],
      ['50', '2', 'TRUE'],
      ['30', '1.75', 'FALSE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parametros');
    XLSX.writeFile(workbook, 'plantilla_parametros_productos.xlsx');
  };

  const handleExportExcel = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      items.map((item) => ({
        id: item.id,
        cantidad_barril_cerveza: item.cantidad_barril_cerveza,
        coeficiente_precio_venta: item.coeficiente_precio_venta,
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parametros');
    XLSX.writeFile(workbook, 'parametros_productos.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Parámetros de Productos', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Cant. barril cerveza (L)', 36, y);
    pdf.text('Coef. precio venta', 120, y);
    pdf.text('Activo', 175, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.cantidad_barril_cerveza ?? ''), 36, y);
      pdf.text(String(item.coeficiente_precio_venta ?? ''), 120, y);
      pdf.text(item.activo ? 'Sí' : 'No', 175, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('parametros_productos.pdf');
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
          const cantidadBarril = Number(row.cantidad_barril_cerveza ?? row.CANTIDAD_BARRIL_CERVEZA ?? row.cantidad_barril ?? 0);
          const coeficiente = Number(row.coeficiente_precio_venta ?? row.COEFICIENTE_PRECIO_VENTA ?? row.coeficiente ?? 0);
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { cantidad_barril_cerveza: cantidadBarril, coeficiente_precio_venta: coeficiente, activo };
        })
        .filter((row) => row.cantidad_barril_cerveza > 0);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await parametroProductoService.create(row);
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
    return <div>Cargando parámetros de productos...</div>;
  }

  return (
    <div className="parametros-productos">
      <div className="parametros-productos-header">
        <h1>Parámetros de Productos</h1>
        <div className="parametros-productos-actions">
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
            {showForm ? 'Cancelar' : '+ Nuevo parámetro'}
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
        <form onSubmit={handleSubmit} className="parametros-productos-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Cantidad barril cerveza (litros)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="cantidad_barril_cerveza"
                value={formData.cantidad_barril_cerveza ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, cantidad_barril_cerveza: Number(e.target.value || 0) }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Coeficiente para precio de venta</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="coeficiente_precio_venta"
                value={formData.coeficiente_precio_venta ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, coeficiente_precio_venta: Number(e.target.value || 0) }))}
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
          <div className="empty-state">No hay parámetros de productos registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>Parámetro de Producto</h3>
              <p><strong>Cantidad barril cerveza:</strong> {Number(item.cantidad_barril_cerveza ?? 0)} litros</p>
              <p><strong>Coef. para precio de venta:</strong> {Number(item.coeficiente_precio_venta ?? 0)}</p>
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

export default ParametrosProductosPage;