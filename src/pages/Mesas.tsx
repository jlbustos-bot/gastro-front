import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { mesaService, Mesa } from '../services/mesaService';
import './Mesas.css';

const createEmptyForm = (): Mesa => ({
  numero: 0,
  capacidad: 1,
  ubicacion: '',
  estado: 'libre',
  activo: true,
});

const estadoLabels: Record<string, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  inactiva: 'Inactiva',
};

const MesasPage = () => {
  const [items, setItems] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Mesa>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await mesaService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar mesas:', error);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'numero' || name === 'capacidad' ? Number(value || 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Mesa = {
      numero: Number(formData.numero),
      capacidad: Number(formData.capacidad || 1),
      ubicacion: String(formData.ubicacion ?? '').trim(),
      estado: (formData.estado || 'libre') as Mesa['estado'],
      activo: Boolean(formData.activo),
    };

    if (!payload.numero || payload.numero <= 0) {
      alert('El número de mesa es obligatorio y debe ser positivo');
      return;
    }

    try {
      if (editingId) {
        const updated = await mesaService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await mesaService.create(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar mesa:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar la mesa');
    }
  };

  const handleEdit = (item: Mesa) => {
    setEditingId(item.id ?? null);
    setFormData({
      numero: item.numero,
      capacidad: item.capacidad ?? 1,
      ubicacion: item.ubicacion ?? '',
      estado: item.estado ?? 'libre',
      activo: item.activo ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('¿Está seguro de eliminar esta mesa?')) {
      return;
    }

    try {
      await mesaService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar mesa:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar la mesa');
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['numero', 'capacidad', 'ubicacion', 'estado', 'activo'],
      [1, 4, 'Salón principal', 'libre', 'TRUE'],
      [2, 6, 'Terraza', 'libre', 'TRUE'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mesas');
    XLSX.writeFile(workbook, 'plantilla_mesas.xlsx');
  };

  const handleExportExcel = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      items.map((item) => ({
        id: item.id,
        numero: item.numero,
        capacidad: item.capacidad,
        ubicacion: item.ubicacion ?? '',
        estado: item.estado,
        activo: item.activo ? 'TRUE' : 'FALSE',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mesas');
    XLSX.writeFile(workbook, 'mesas.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Mesas', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Nº', 40, y);
    pdf.text('Capacidad', 60, y);
    pdf.text('Ubicación', 100, y);
    pdf.text('Estado', 150, y);
    pdf.text('Activo', 180, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.numero ?? ''), 40, y);
      pdf.text(String(item.capacidad ?? ''), 60, y);
      pdf.text(String(item.ubicacion ?? ''), 100, y);
      pdf.text(estadoLabels[item.estado] ?? item.estado, 150, y);
      pdf.text(item.activo ? 'Sí' : 'No', 180, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('mesas.pdf');
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
          const numero = Number(row.numero ?? row.NUMERO ?? row.tableNumber ?? row.table_number);
          const capacidad = Number(row.capacidad ?? row.CAPACIDAD ?? row.capacity ?? 1);
          const ubicacion = String(row.ubicacion ?? row.UBICACION ?? row.location ?? '').trim();
          const estado = String(row.estado ?? row.ESTADO ?? row.status ?? 'libre').trim().toLowerCase();
          const activoRaw = row.activo ?? row.ACTIVO ?? row.active ?? row.activo;
          const activo = typeof activoRaw === 'string'
            ? ['true', '1', 'si', 'sí', 'yes', 'y'].includes(activoRaw.trim().toLowerCase())
            : Boolean(activoRaw);

          return { numero, capacidad, ubicacion, estado, activo };
        })
        .filter((row) => row.numero > 0);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await mesaService.create({
          numero: row.numero,
          capacidad: row.capacidad,
          ubicacion: row.ubicacion,
          estado: row.estado as Mesa['estado'],
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
    return <div>Cargando mesas...</div>;
  }

  return (
    <div className="mesas">
      <div className="mesas-header">
        <h1>Mesas</h1>
        <div className="mesas-actions">
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
            {showForm ? 'Cancelar' : '+ Nueva mesa'}
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
        <form onSubmit={handleSubmit} className="mesas-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Número de mesa</label>
              <input type="number" min="1" name="numero" value={formData.numero} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Capacidad</label>
              <input type="number" min="1" name="capacidad" value={formData.capacidad} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Ubicación</label>
              <input type="text" name="ubicacion" value={formData.ubicacion} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select name="estado" value={formData.estado} onChange={handleInputChange}>
                <option value="libre">Libre</option>
                <option value="ocupada">Ocupada</option>
                <option value="reservada">Reservada</option>
                <option value="inactiva">Inactiva</option>
              </select>
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

      <div className="mesa-grid">
        {items.length === 0 ? (
          <div className="empty-state">No hay mesas registradas</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="mesa-card">
              <div className="mesa-top">
                <span className={`mesa-number ${item.estado}`}>Mesa {item.numero}</span>
                <span className={`badge ${item.estado}`}>{estadoLabels[item.estado] ?? item.estado}</span>
              </div>
              <p><strong>Capacidad:</strong> {item.capacidad} personas</p>
              <p><strong>Ubicación:</strong> {item.ubicacion || '—'}</p>
              <div className="tags">
                <span className={`badge ${item.activo === false ? 'inactive' : 'activofalso'}`}>
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

export default MesasPage;