import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { productoProveedorService, ProductoProveedor } from '../services/productoProveedorService';
import { productoService } from '../services/productoService';
import { proveedorService } from '../services/proveedorService';
import { parametroProductoService, ParametroProducto } from '../services/parametroProductoService';
import './ProductoProveedores.css';

const createEmptyForm = (): ProductoProveedor => ({
  producto_id: 0,
  proveedor_id: 0,
  precio_por_litro: 0,
  precio_barril: 0,
  precio_venta_sugerido: 0,
  activo: true,
});

const formatCurrency = (value: number | string | null | undefined): string => {
  const num = Number(value ?? 0);
  return `$${num.toFixed(2)}`;
};

const ProductoProveedoresPage = () => {
  const [items, setItems] = useState<ProductoProveedor[]>([]);
  const [productoOptions, setProductoOptions] = useState<Array<{ id?: number; nombre: string; grupo1prod?: number | null }>>([]);
  const [proveedorOptions, setProveedorOptions] = useState<Array<{ id?: number; nombre: string }>>([]);
  const [parametroOptions, setParametroOptions] = useState<ParametroProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductoProveedor>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await productoProveedorService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar precios de productos por proveedor:', error);
    }
  };

  const fetchOptions = async () => {
    try {
      const [productos, proveedores, parametros] = await Promise.all([
        productoService.getAll({ activo: true }),
        proveedorService.getAll({ activo: true }),
        parametroProductoService.getAll({ activo: true }),
      ]);
      setProductoOptions(productos);
      setProveedorOptions(proveedores);
      setParametroOptions(parametros);
    } catch (error) {
      console.error('Error al cargar productos, proveedores y parámetros:', error);
    }
  };

  const getCantidadBarrilCerveza = (): number | null => {
    if (!parametroOptions.length) return null;
    return Number(parametroOptions[0].cantidad_barril_cerveza ?? 0);
  };

  const calcularPrecioBarril = (productoId: number | null | undefined, precioPorLitro: number): number | null => {
    const producto = productoOptions.find((option) => option.id === productoId);
    if (producto && producto.grupo1prod === 1 && precioPorLitro > 0) {
      const cantidad = getCantidadBarrilCerveza();
      if (cantidad !== null && cantidad > 0) {
        return Math.round(precioPorLitro * cantidad * 100) / 100;
      }
    }
    return null;
  };

  const getCoeficientePrecioVenta = (): number | null => {
    if (!parametroOptions.length) return null;
    return Number(parametroOptions[0].coeficiente_precio_venta ?? 0);
  };

  const calcularPrecioVentaSugerido = (productoId: number | null | undefined, precioPorLitro: number): number | null => {
    const producto = productoOptions.find((option) => option.id === productoId);
    if (producto && producto.grupo1prod === 1 && precioPorLitro > 0) {
      const coeficiente = getCoeficientePrecioVenta();
      if (coeficiente !== null && coeficiente > 0) {
        return Math.round(precioPorLitro * coeficiente * 100) / 100;
      }
    }
    return null;
  };

  const getProductoNombre = (item: ProductoProveedor) => {
    if (item.producto_nombre) return item.producto_nombre;
    const match = productoOptions.find((option) => option.id === item.producto_id);
    return match?.nombre ?? '';
  };

  const getProveedorNombre = (item: ProductoProveedor) => {
    if (item.proveedor_nombre) return item.proveedor_nombre;
    const match = proveedorOptions.find((option) => option.id === item.proveedor_id);
    return match?.nombre ?? '';
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchItems(), fetchOptions()]);
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
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ProductoProveedor = {
      producto_id: Number(formData.producto_id ?? 0),
      proveedor_id: Number(formData.proveedor_id ?? 0),
      precio_por_litro: Number(formData.precio_por_litro ?? 0),
      precio_barril: Number(formData.precio_barril ?? 0),
      precio_venta_sugerido: Number(formData.precio_venta_sugerido ?? 0),
      activo: Boolean(formData.activo),
    };

    if (!payload.producto_id || !payload.proveedor_id) {
      alert('Debe seleccionar un producto y un proveedor');
      return;
    }

    try {
      if (editingId) {
        const updated = await productoProveedorService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await productoProveedorService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar registro:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el registro');
    }
  };

  const handleEdit = (item: ProductoProveedor) => {
    setEditingId(item.id ?? null);
    setFormData({
      producto_id: item.producto_id,
      proveedor_id: item.proveedor_id,
      precio_por_litro: Number(item.precio_por_litro ?? 0),
      precio_barril: Number(item.precio_barril ?? 0),
      precio_venta_sugerido: Number(item.precio_venta_sugerido ?? 0),
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar este registro?')) {
      return;
    }

    try {
      await productoProveedorService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar registro:', error);
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['producto_id', 'proveedor_id', 'precio_por_litro', 'precio_barril', 'precio_venta_sugerido', 'activo'],
      ['1', '1', '3.50', '1200.00', '6.00', 'TRUE'],
      ['2', '2', '2.80', '980.00', '5.50', 'FALSE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Producto-Proveedor');
    XLSX.writeFile(workbook, 'plantilla_producto_proveedor.xlsx');
  };

  const handleExportExcel = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      items.map((item) => ({
        id: item.id,
        producto_id: item.producto_id,
        producto: getProductoNombre(item),
        proveedor_id: item.proveedor_id,
        proveedor: getProveedorNombre(item),
        precio_por_litro: item.precio_por_litro,
        precio_barril: item.precio_barril,
        precio_venta_sugerido: item.precio_venta_sugerido,
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Producto-Proveedor');
    XLSX.writeFile(workbook, 'producto_proveedor.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Precios Producto-Proveedor', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 8, y);
    pdf.text('Producto', 17, y);
    pdf.text('Proveedor', 62, y);
    pdf.text('$/Litro', 105, y);
    pdf.text('Barril', 125, y);
    pdf.text('Venta', 145, y);
    pdf.text('Activo', 180, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 8, y);
      pdf.text(String(getProductoNombre(item) ?? '').slice(0, 14), 17, y);
      pdf.text(String(getProveedorNombre(item) ?? '').slice(0, 12), 62, y);
      pdf.text(formatCurrency(item.precio_por_litro), 105, y);
      pdf.text(formatCurrency(item.precio_barril), 125, y);
      pdf.text(formatCurrency(item.precio_venta_sugerido), 145, y);
      pdf.text(item.activo ? 'Sí' : 'No', 180, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('producto_proveedor.pdf');
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
          const productoId = Number(row.producto_id ?? row.PRODUCTO_ID ?? row.producto ?? 0);
          const proveedorId = Number(row.proveedor_id ?? row.PROVEEDOR_ID ?? row.proveedor ?? 0);
          const precioPorLitro = Number(row.precio_por_litro ?? row.PRECIO_POR_LITRO ?? 0);
          const precioBarril = Number(row.precio_barril ?? row.PRECIO_BARRIL ?? 0);
          const precioVentaSugerido = Number(row.precio_venta_sugerido ?? row.PRECIO_VENTA_SUGERIDO ?? row.precio_venta ?? 0);
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { producto_id: productoId, proveedor_id: proveedorId, precio_por_litro: precioPorLitro, precio_barril: precioBarril, precio_venta_sugerido: precioVentaSugerido, activo };
        })
        .filter((row) => row.producto_id && row.proveedor_id);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await productoProveedorService.create(row);
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
    return <div>Cargando precios de productos por proveedor...</div>;
  }

  return (
    <div className="producto-proveedor">
      <div className="producto-proveedor-header">
        <h1>Precios Producto-Proveedor</h1>
        <div className="producto-proveedor-actions">
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
            {showForm ? 'Cancelar' : '+ Nuevo precio'}
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
        <form onSubmit={handleSubmit} className="producto-proveedor-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Producto</label>
              <select
                name="producto_id"
                value={formData.producto_id ?? ''}
                onChange={(e) => {
                  const productoId = Number(e.target.value || 0);
                  setFormData((prev) => {
                    const next = { ...prev, producto_id: productoId };
                    const litroActual = Number(next.precio_por_litro ?? 0);
                    const barril = calcularPrecioBarril(productoId, litroActual);
                    if (barril !== null) {
                      next.precio_barril = barril;
                    }
                    const venta = calcularPrecioVentaSugerido(productoId, litroActual);
                    if (venta !== null) {
                      next.precio_venta_sugerido = venta;
                    }
                    return next;
                  });
                }}
                required
              >
                <option value="">Seleccione un producto</option>
                {productoOptions.map((option) => (
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
                onChange={(e) => setFormData((prev) => ({ ...prev, proveedor_id: Number(e.target.value || 0) }))}
                required
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
              <label>Precio por litro</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precio_por_litro"
                value={formData.precio_por_litro ?? 0}
                onChange={(e) => {
                  const litro = Number(e.target.value || 0);
                  setFormData((prev) => {
                    const next = { ...prev, precio_por_litro: litro };
                    const barril = calcularPrecioBarril(prev.producto_id, litro);
                    if (barril !== null) {
                      next.precio_barril = barril;
                    }
                    const venta = calcularPrecioVentaSugerido(prev.producto_id, litro);
                    if (venta !== null) {
                      next.precio_venta_sugerido = venta;
                    }
                    return next;
                  });
                }}
                required
              />
            </div>
            <div className="form-group">
              <label>Precio barril</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precio_barril"
                value={formData.precio_barril ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, precio_barril: Number(e.target.value || 0) }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Precio de venta sugerido</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precio_venta_sugerido"
                value={formData.precio_venta_sugerido ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, precio_venta_sugerido: Number(e.target.value || 0) }))}
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
          <div className="empty-state">No hay precios de productos por proveedor registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{getProductoNombre(item) || `Producto #${item.producto_id}`}</h3>
              <p><strong>Proveedor:</strong> {getProveedorNombre(item) || `Proveedor #${item.proveedor_id}`}</p>
              <p><strong>Precio por litro:</strong> {formatCurrency(item.precio_por_litro)}</p>
              <p><strong>Precio barril:</strong> {formatCurrency(item.precio_barril)}</p>
              <p><strong>Precio venta sugerido:</strong> {formatCurrency(item.precio_venta_sugerido)}</p>
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

export default ProductoProveedoresPage;