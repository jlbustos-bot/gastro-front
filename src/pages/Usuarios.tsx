import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { userService, User } from '../services/userService';
import { authService } from '../services/authService';
import './Usuarios.css';

const ROLES = ['admin', 'manager', 'chef', 'waiter'];

const createEmptyForm = (): User => ({
  username: '',
  email: '',
  password: '',
  role: 'waiter',
});

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  chef: 'Cocinero',
  waiter: 'Mozo',
};

const roleLabel = (role: string): string => ROLE_LABELS[role] ?? role;

const UsuariosPage = () => {
  const [items, setItems] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<User>(() => createEmptyForm());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    try {
      const data = await userService.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    const stored = authService.getStoredUser();
    if (stored?.id) {
      setCurrentUserId(Number(stored.id));
    }
    fetchItems().finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const password = String(formData.password ?? '').trim();
    const payload: Partial<User> & { password?: string } = {
      username: String(formData.username ?? '').trim(),
      email: String(formData.email ?? '').trim(),
      role: String(formData.role ?? 'waiter').trim(),
      ...(password ? { password } : {}),
    };

    if (!payload.username || !payload.email) {
      alert('El nombre de usuario y el email son obligatorios');
      return;
    }

    if (!editingId && !password) {
      alert('La contraseña es obligatoria');
      return;
    }

    try {
      if (editingId) {
        const updated = await userService.update(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await userService.create(payload as User);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchItems();
    } catch (error: any) {
      console.error('Error al guardar usuario:', error);
      alert(error?.response?.data?.error || 'No se pudo guardar el usuario');
    }
  };

  const handleEdit = (item: User) => {
    setEditingId(item.id ?? null);
    setFormData({
      username: item.username,
      email: item.email,
      password: '',
      role: item.role,
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id) {
      return;
    }

    if (id === currentUserId) {
      alert('No puede eliminar su propio usuario');
      return;
    }

    if (!confirm('¿Está seguro de eliminar este usuario?')) {
      return;
    }

    try {
      await userService.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      alert(error?.response?.data?.error || 'No se pudo eliminar el usuario');
    }
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['username', 'email', 'password', 'role'],
      ['empleado', 'empleado@gastro.com', '123456', 'waiter'],
      ['gerente', 'gerente@gastro.com', '123456', 'manager'],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'plantilla_usuarios.xlsx');
  };

  const handleExportExcel = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      items.map((item) => ({
        id: item.id,
        username: item.username,
        email: item.email,
        role: item.role,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'usuarios.xlsx');
  };

  const handleExportPdf = () => {
    if (!items.length) {
      alert('No hay datos para exportar');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Usuarios', 14, 15);

    let y = 28;
    pdf.setFontSize(10);
    pdf.text('ID', 14, y);
    pdf.text('Usuario', 36, y);
    pdf.text('Email', 90, y);
    pdf.text('Rol', 170, y);

    y += 8;

    items.forEach((item) => {
      pdf.text(String(item.id ?? ''), 14, y);
      pdf.text(String(item.username ?? ''), 36, y);
      pdf.text(String(item.email ?? ''), 90, y);
      pdf.text(roleLabel(String(item.role ?? '')), 170, y);
      y += 7;

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    pdf.save('usuarios.pdf');
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
          const username = String(row.username ?? row.USERNAME ?? row.user ?? '').trim();
          const email = String(row.email ?? row.EMAIL ?? '').trim();
          const password = String(row.password ?? row.PASSWORD ?? row.pass ?? '').trim();
          const role = String(row.role ?? row.ROL ?? row.ROLE ?? 'waiter').trim().toLowerCase();
          return { username, email, password, role };
        })
        .filter((row) => row.username && row.email && row.password);

      if (!normalizedRows.length) {
        throw new Error('No se encontraron filas válidas en el Excel');
      }

      for (const row of normalizedRows) {
        await userService.create(row);
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
    return <div>Cargando usuarios...</div>;
  }

  return (
    <div className="usuarios">
      <div className="usuarios-header">
        <h1>Usuarios</h1>
        <div className="usuarios-actions">
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
            {showForm ? 'Cancelar' : '+ Nuevo usuario'}
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
        <form onSubmit={handleSubmit} className="usuarios-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre de usuario</label>
              <input type="text" name="username" value={formData.username ?? ''} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email ?? ''} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password ?? ''}
                onChange={handleInputChange}
                placeholder={editingId ? 'Dejar en blanco para no cambiar' : ''}
              />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select name="role" value={formData.role ?? 'waiter'} onChange={handleInputChange}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
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
          <div className="empty-state">No hay usuarios registrados</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="product-card">
              <div className="product-id">ID: {item.id}</div>
              <h3>{item.username}</h3>
              {item.id === currentUserId && (
                <span className="badge active badge-self">Este usuario</span>
              )}
              <p><strong>Email:</strong> {item.email}</p>
              <p><strong>Rol:</strong> {roleLabel(item.role)}</p>
              <div className="tags">
                <span className={`badge role-${item.role}`}>{roleLabel(item.role)}</span>
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

export default UsuariosPage;