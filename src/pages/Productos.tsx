import { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { grupo1prodService } from '../services/grupo1prodService';
import { grupo2prodService } from '../services/grupo2prodService';
import { proveedorService } from '../services/proveedorService';
import { productoService, Producto } from '../services/productoService';
import './Grupo1Prod.css';
import './Productos.css';

type SortKey = 'nombre' | 'nombrecorto' | 'grupo1prod' | 'grupo2prod' | 'proveedor_id' | 'preciocompra' | 'precioventa';
type SortDir = 'asc' | 'desc';

const FILAS_POR_PAGINA = 25;

const valorOrden = (item: Producto, key: SortKey): string | number => {
  switch (key) {
    case 'nombre':
      return item.nombre.toLowerCase();
    case 'nombrecorto':
      return (item.nombrecorto ?? '').toLowerCase();
    case 'grupo1prod':
      return item.grupo1prod ?? -1;
    case 'grupo2prod':
      return item.grupo2prod ?? -1;
    case 'proveedor_id':
      return item.proveedor_id ?? -1;
    case 'preciocompra':
      return Number(item.preciocompra ?? 0);
    case 'precioventa':
      return Number(item.precioventa ?? 0);
    default:
      return '';
  }
};

const createEmptyForm = (): Producto => ({
  nombre: '',
  nombrecorto: '',
  grupo1prod: null,
  grupo2prod: null,
  proveedor_id: null,
  precioventa: 0,
  preciocompra: 0,
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
  const [busqueda, setBusqueda] = useState('');
  const [filtroGrupo1, setFiltroGrupo1] = useState('');
  const [filtroGrupo2, setFiltroGrupo2] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pagina, setPagina] = useState(1);

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

  const hayFiltrosActivos = Boolean(
    busqueda || filtroGrupo1 || filtroGrupo2 || filtroProveedor || filtroActivo
  );

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    const filtrados = items.filter((item) => {
      if (filtroGrupo1 && String(item.grupo1prod ?? '') !== filtroGrupo1) return false;
      if (filtroGrupo2 && String(item.grupo2prod ?? '') !== filtroGrupo2) return false;
      if (filtroProveedor && String(item.proveedor_id ?? '') !== filtroProveedor) return false;
      if (filtroActivo === 'activos' && item.activo === false) return false;
      if (filtroActivo === 'inactivos' && item.activo !== false) return false;
      if (!termino) return true;
      return (
        item.nombre.toLowerCase().includes(termino) ||
        (item.nombrecorto ?? '').toLowerCase().includes(termino) ||
        (item.proveedor_nombre ?? '').toLowerCase().includes(termino) ||
        (item.grupo1prod_nombre ?? '').toLowerCase().includes(termino) ||
        (item.grupo2prod_nombre ?? '').toLowerCase().includes(termino)
      );
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      const va = valorOrden(a, sortKey);
      const vb = valorOrden(b, sortKey);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [items, busqueda, filtroGrupo1, filtroGrupo2, filtroProveedor, filtroActivo, sortKey, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const itemsPaginados = productosFiltrados.slice(
    (paginaActual - 1) * FILAS_POR_PAGINA,
    paginaActual * FILAS_POR_PAGINA
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroGrupo1, filtroGrupo2, filtroProveedor, filtroActivo]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroGrupo1('');
    setFiltroGrupo2('');
    setFiltroProveedor('');
    setFiltroActivo('');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

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
      preciocompra: Number(formData.preciocompra ?? 0),
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
      preciocompra: Number(item.preciocompra ?? 0),
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
      ['nombre', 'nombrecorto', 'grupo1prod', 'grupo2prod', 'proveedor_id', 'preciocompra', 'precioventa', 'activo'],
      ['Producto ejemplo', 'PE', '1', '2', '1', '12.50', '25.99', 'TRUE'],
      ['Producto inactivo', 'PI', '1', '1', '', '8.00', '18.50', 'FALSE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, 'plantilla_productos.xlsx');
  };

  const handleExportExcel = () => {
    if (!productosFiltrados.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      productosFiltrados.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        nombrecorto: item.nombrecorto,
        grupo1prod: item.grupo1prod ?? '',
        grupo2prod: item.grupo2prod ?? '',
        proveedor_id: item.proveedor_id ?? '',
        preciocompra: item.preciocompra ?? 0,
        precioventa: item.precioventa,
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, 'productos.xlsx');
  };

  const handleExportPdf = () => {
    if (!productosFiltrados.length) {
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
    pdf.text('Compra', 148, y);
    pdf.text('Venta', 174, y);
    pdf.text('Activo', 196, y);

    y += 8;

    productosFiltrados.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.nombre ?? ''), 36, y);
      pdf.text(String(item.nombrecorto ?? ''), 80, y);
      pdf.text(String(item.grupo1prod ?? ''), 110, y);
      pdf.text(String(item.grupo2prod ?? ''), 122, y);
      pdf.text(String(item.proveedor_id ?? ''), 134, y);
      pdf.text(String(item.preciocompra ?? ''), 148, y);
      pdf.text(String(item.precioventa ?? ''), 174, y);
      pdf.text(item.activo ? 'Sí' : 'No', 196, y);
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
          const preciocompra = Number(row.preciocompra ?? row.PRECIOCOMPRA ?? row.precio_compra ?? row.precioCompra ?? 0);
          const precioventa = Number(row.precioventa ?? row.PRECIOVENTA ?? row.precio_venta ?? row.precioVenta ?? 0);
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { nombre, nombrecorto, grupo1prod, grupo2prod, proveedorId, preciocompra, precioventa, activo };
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
          preciocompra: Number(row.preciocompra ?? 0),
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
              <label>Precio compra</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="preciocompra"
                value={formData.preciocompra ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, preciocompra: Number(e.target.value || 0) }))}
              />
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

      <div className="productos-filtros">
        <div className="productos-busqueda">
          <input
            type="search"
            placeholder="Buscar por nombre, corto, grupo o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select value={filtroGrupo1} onChange={(e) => setFiltroGrupo1(e.target.value)}>
          <option value="">Grupo 1: todos</option>
          {grupo1Options.map((option) => (
            <option key={option.id} value={option.id}>{option.nombre}</option>
          ))}
        </select>

        <select value={filtroGrupo2} onChange={(e) => setFiltroGrupo2(e.target.value)}>
          <option value="">Grupo 2: todos</option>
          {grupo2Options.map((option) => (
            <option key={option.id} value={option.id}>{option.nombre}</option>
          ))}
        </select>

        <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
          <option value="">Proveedor: todos</option>
          {proveedorOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.nombre}</option>
          ))}
        </select>

        <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
          <option value="">Estado: todos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>

        {hayFiltrosActivos && (
          <button className="btn-secondary" type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="productos-resumen">
        Mostrando {itemsPaginados.length} de {productosFiltrados.length} productos
        {hayFiltrosActivos && ` (filtrados de ${items.length} totales)`}
      </div>

      <div className="productos-tabla-wrapper">
        <table className="productos-tabla">
          <thead>
            <tr>
              <th className="col-acciones"></th>
              <th className="col-id">ID</th>
              <th>
                <button type="button" className="th-orden" onClick={() => handleSort('nombre')}>
                  Nombre {sortKey === 'nombre' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th>
                <button type="button" className="th-orden" onClick={() => handleSort('nombrecorto')}>
                  Corto {sortKey === 'nombrecorto' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th>
                <button type="button" className="th-orden" onClick={() => handleSort('grupo1prod')}>
                  G1 {sortKey === 'grupo1prod' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th>
                <button type="button" className="th-orden" onClick={() => handleSort('grupo2prod')}>
                  G2 {sortKey === 'grupo2prod' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th>
                <button type="button" className="th-orden" onClick={() => handleSort('proveedor_id')}>
                  Proveedor {sortKey === 'proveedor_id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th className="col-numero">
                <button type="button" className="th-orden" onClick={() => handleSort('preciocompra')}>
                  Compra {sortKey === 'preciocompra' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th className="col-numero">
                <button type="button" className="th-orden" onClick={() => handleSort('precioventa')}>
                  Venta {sortKey === 'precioventa' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </button>
              </th>
              <th className="col-numero">Margen</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {itemsPaginados.length === 0 ? (
              <tr>
                <td colSpan={11} className="celda-vacia">
                  {items.length === 0
                    ? 'No hay productos registrados'
                    : 'Ningún producto coincide con los filtros aplicados'}
                </td>
              </tr>
            ) : (
              itemsPaginados.map((item) => {
                const compra = Number(item.preciocompra ?? 0);
                const venta = Number(item.precioventa ?? 0);
                const utilidad = venta - compra;
                const porcentaje = venta > 0 ? Math.round((utilidad / venta) * 100) : 0;

                return (
                  <tr key={item.id} className={item.activo === false ? 'fila-inactiva' : ''}>
                    <td className="col-acciones">
                      <button className="btn-icon" onClick={() => handleEdit(item)} title="Editar">✎</button>
                      <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(item.id)} title="Eliminar">🗑</button>
                    </td>
                    <td className="col-id">{item.id}</td>
                    <td className="col-nombre">{item.nombre}</td>
                    <td>{item.nombrecorto}</td>
                    <td>
                      {item.grupo1prod ?? '—'}
                      {getGrupo1Nombre(item) ? ` · ${getGrupo1Nombre(item)}` : ''}
                    </td>
                    <td>
                      {item.grupo2prod ?? '—'}
                      {getGrupo2Nombre(item) ? ` · ${getGrupo2Nombre(item)}` : ''}
                    </td>
                    <td>
                      {getProveedorNombre(item) || (item.proveedor_id ? `#${item.proveedor_id}` : '—')}
                    </td>
                    <td className="col-numero">{compra.toFixed(2)}</td>
                    <td className="col-numero">{venta.toFixed(2)}</td>
                    <td className="col-numero">
                      {compra <= 0 ? (
                        '—'
                      ) : (
                        <span className={utilidad < 0 ? 'margen-negativo' : 'margen-positivo'}>
                          {porcentaje}%
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${item.activo === false ? 'inactive' : 'active'}`}>
                        {item.activo === false ? 'Inactivo' : 'Activo'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="productos-paginacion">
          <button
            type="button"
            className="btn-secondary"
            disabled={paginaActual <= 1}
            onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
          >
            ‹ Anterior
          </button>
          <span>
            Página {paginaActual} de {totalPaginas}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={paginaActual >= totalPaginas}
            onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductosPage;
