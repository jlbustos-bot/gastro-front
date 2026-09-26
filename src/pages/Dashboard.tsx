import { useEffect, useState } from 'react';
import { restaurantService, Restaurant } from '../services/restaurantService';
import { canillaService, Canilla } from '../services/canillaService';
import './Dashboard.css';

const Dashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [canillas, setCanillas] = useState<Canilla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [restaurantsData, canillasData] = await Promise.all([
          restaurantService.getAll(),
          canillaService.getAll(),
        ]);
        setRestaurants(restaurantsData);
        setCanillas(canillasData);
      } catch (error) {
        console.error('Error al cargar los datos del panel:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const canillasConCerveza = canillas.filter(
    (c) => c.producto_id !== null && c.producto_id !== undefined && c.producto_nombre
  );

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Principal</h1>
      <p className="subtitle">Resumen del sistema de gestión gastronómica</p>

      <div className="dashboard-layout">
        <div className="dashboard-main">
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

        <aside className="dashboard-side">
          <h2>Cervezas disponibles</h2>
          {canillasConCerveza.length === 0 ? (
            <div className="empty-state">No hay canillas con cerveza asignada</div>
          ) : (
            <ul className="canillas-list">
              {canillasConCerveza.map((c) => (
                <li key={c.id} className="canilla-item">
                  <span className="canilla-row">
                    <span className="canilla-nombre">{c.nombre}</span>
                    <span className="canilla-cerveza">🍺 {c.producto_nombre}</span>
                    <span className="canilla-precio">${Number(c.producto_precioventa ?? 0).toFixed(2)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;