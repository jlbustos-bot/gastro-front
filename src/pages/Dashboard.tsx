import { useEffect, useState } from 'react';
import { restaurantService, Restaurant } from '../services/restaurantService';
import './Dashboard.css';

const Dashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchRestaurants();
  }, []);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Principal</h1>
      <p className="subtitle">Resumen del sistema de gestión gastronómica</p>

      <div className="stats-grid">
        {restaurants.length === 0 ? (
          <div className="empty-state">No hay restaurantes registrados</div>
        ) : (
          restaurants.map((restaurant) => (
            <div className="stat-card" key={restaurant.id}>
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={`Logo de ${restaurant.name}`} className="stat-logo" />
              ) : (
                <div className="stat-icon">🏪</div>
              )}
              <div className="stat-content">
                <h3>{restaurant.name}</h3>
                <p className="stat-desc">{restaurant.description || 'Sin descripción'}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="info-section">
        <h2>Bienvenido a GastroSoft</h2>
        <p>
          Sistema integral de gestión para restaurantes. Administra tus restaurantes, consumos, mesas, clientes y productos de forma eficiente.
        </p>
        <ul>
          <li>✅ Gestión de restaurantes</li>
          <li>✅ Control de consumos y mesas</li>
          <li>✅ Administración de clientes</li>
          <li>✅ Gestión de productos</li>
          <li>✅ Autenticación segura</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;