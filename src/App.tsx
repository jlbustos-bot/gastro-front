import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Restaurants from './pages/Restaurants';
import ProductosPage from './pages/Productos';
import Grupo1ProdPage from './pages/Grupo1Prod';
import Grupo2ProdPage from './pages/Grupo2Prod';
import ClientesPage from './pages/Clientes';
import MesasPage from './pages/Mesas';
import ConsumosPage from './pages/Consumos';
import RegistroConsumo from './pages/RegistroConsumo';
import MediosPagoPage from './pages/MediosPago';
import ProveedoresPage from './pages/Proveedores';
import ProductoProveedoresPage from './pages/ProductoProveedores';
import ParametrosProductosPage from './pages/ParametrosProductos';
import UsuariosPage from './pages/Usuarios';
import CondicionesCtaCtePage from './pages/CondicionesCtaCte';
import ParametrosImpresionPage from './pages/ParametrosImpresion';
import ReporteVentaDiaria from './pages/ReporteVentaDiaria';
import Layout from './components/Layout';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/restaurants" element={<Restaurants />} />
                  <Route path="/productos" element={<ProductosPage />} />
                  <Route path="/grupo1prod" element={<Grupo1ProdPage />} />
                  <Route path="/grupo2prod" element={<Grupo2ProdPage />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/mesas" element={<MesasPage />} />
                  <Route path="/medios-pago" element={<MediosPagoPage />} />
                  <Route path="/proveedores" element={<ProveedoresPage />} />
                  <Route path="/producto-proveedor" element={<ProductoProveedoresPage />} />
                  <Route path="/parametros-productos" element={<ParametrosProductosPage />} />
                  <Route path="/usuarios" element={<UsuariosPage />} />
                  <Route path="/condiciones-cta-cte" element={<CondicionesCtaCtePage />} />
                  <Route path="/parametros-impresion" element={<ParametrosImpresionPage />} />
                  <Route path="/consumos" element={<ConsumosPage />} />
                  <Route path="/reportes/venta-diaria" element={<ReporteVentaDiaria />} />
                  <Route path="/consumos/mesa/:mesaId" element={<RegistroConsumo />} />
                  <Route path="/consumos/editar/:consumoId" element={<RegistroConsumo />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
