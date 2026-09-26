import { useEffect, useRef, useState } from 'react';
import { restaurantService, Restaurant } from '../services/restaurantService';
import './Restaurants.css';

const resizeImage = (file: File, maxSize = 512): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Restaurant>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
  });
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const fetchRestaurants = async () => {
    try {
      const data = await restaurantService.getAll();
      setRestaurants(data);
    } catch (error) {
      console.error('Error al cargar restaurantes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      logo: '',
    });
    setEditingId(null);
    setShowForm(false);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const dataUrl = await resizeImage(file);
      setFormData((prev) => ({ ...prev, logo: dataUrl }));
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      alert('No se pudo procesar la imagen seleccionada');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await restaurantService.update(editingId, formData);
        setRestaurants((prev) => prev.map((restaurant) => (restaurant.id === updated.id ? updated : restaurant)));
      } else {
        const created = await restaurantService.create(formData);
        setRestaurants((prev) => [created, ...prev]);
      }
      resetForm();
      await fetchRestaurants();
    } catch (error) {
      console.error('Error al guardar restaurante:', error);
    }
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingId(restaurant.id ?? null);
    setFormData({
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      logo: restaurant.logo || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number | undefined) => {
    if (id && confirm('¿Estás seguro de eliminar este restaurante?')) {
      try {
        await restaurantService.delete(id);
        fetchRestaurants();
      } catch (error) {
        console.error('Error al eliminar restaurante:', error);
      }
    }
  };

  if (loading) {
    return <div>Cargando restaurantes...</div>;
  }

  return (
    <div className="restaurants">
      <div className="restaurants-header">
        <h1>Restaurantes</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Restaurante'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="restaurant-form">
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Logo</label>
            <div className="logo-upload">
              {formData.logo ? (
                <img src={formData.logo} alt="Logo" className="logo-preview" />
              ) : (
                <div className="logo-placeholder">Sin logo</div>
              )}
              <div className="logo-actions">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                {formData.logo && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, logo: '' }));
                      if (logoInputRef.current) {
                        logoInputRef.current.value = '';
                      }
                    }}
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-success">
              {editingId ? 'Actualizar Restaurante' : 'Guardar Restaurante'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Limpiar
            </button>
          </div>
        </form>
      )}

      <div className="restaurants-grid">
        {restaurants.length === 0 ? (
          <p className="empty-state">No hay restaurantes registrados</p>
        ) : (
          restaurants.map((restaurant) => (
            <div key={restaurant.id} className="restaurant-card">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={`Logo de ${restaurant.name}`} className="restaurant-logo" />
              ) : (
                <div className="restaurant-icon">🏪</div>
              )}
              <h3>{restaurant.name}</h3>
              <p className="description">{restaurant.description}</p>
              <div className="restaurant-details">
                <p>
                  <strong>Dirección:</strong> {restaurant.address}
                </p>
                <p>
                  <strong>Teléfono:</strong> {restaurant.phone}
                </p>
                <p>
                  <strong>Email:</strong> {restaurant.email}
                </p>
              </div>
              <div className="restaurant-actions">
                <button className="btn-primary" onClick={() => handleEdit(restaurant)}>
                  Editar
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(restaurant.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Restaurants;
