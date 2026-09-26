import { FC, ReactNode, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  setIsAuthenticated: (value: boolean) => void;
}

const Layout: FC<LayoutProps> = ({ children, setIsAuthenticated }) => {
  const user = authService.getStoredUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const comprasRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (comprasRef.current && !comprasRef.current.contains(event.target as Node)) {
        setComprasOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="logo">
            <h1>🍽️ GastroSoft</h1>
          </Link>
          <div className="nav-links">
            <Link to="/">Principal</Link>
            <Link to="/consumos">Consumos</Link>
            <Link to="/reportes/venta-diaria">Venta diaria</Link>
            <div className="dropdown" ref={comprasRef}>
              <button
                className={`dropdown-toggle ${comprasOpen ? 'active' : ''}`}
                type="button"
                onClick={() => setComprasOpen((prev) => !prev)}
              >
                Compras <span className="dropdown-caret">▾</span>
              </button>
              {comprasOpen && (
                <div className="dropdown-menu">
                  <Link to="/proveedores" onClick={() => setComprasOpen(false)}>Proveedores</Link>
                  <Link to="/producto-proveedor" onClick={() => setComprasOpen(false)}>Producto-Proveedor</Link>
                </div>
              )}
            </div>
            <div className="dropdown" ref={dropdownRef}>
              <button
                className={`dropdown-toggle ${menuOpen ? 'active' : ''}`}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                Configuración <span className="dropdown-caret">▾</span>
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <Link to="/restaurants" onClick={() => setMenuOpen(false)}>Restaurantes</Link>
                  <Link to="/productos" onClick={() => setMenuOpen(false)}>Productos</Link>
                  <Link to="/grupo1prod" onClick={() => setMenuOpen(false)}>Grupo 1 Prod</Link>
                  <Link to="/grupo2prod" onClick={() => setMenuOpen(false)}>Grupo 2 Prod</Link>
                  <Link to="/clientes" onClick={() => setMenuOpen(false)}>Clientes</Link>
                  <Link to="/mesas" onClick={() => setMenuOpen(false)}>Mesas</Link>
                  <Link to="/medios-pago" onClick={() => setMenuOpen(false)}>Medios de Pago</Link>
                  <Link to="/parametros-productos" onClick={() => setMenuOpen(false)}>Parámetros Productos</Link>
                  <Link to="/usuarios" onClick={() => setMenuOpen(false)}>Usuarios</Link>
                  <Link to="/condiciones-cta-cte" onClick={() => setMenuOpen(false)}>Condiciones Cta. Cte.</Link>
                </div>
              )}
            </div>
          </div>
          <div className="user-info">
            <span>Bienvenido, {user?.username}</span>
            <button onClick={handleLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
