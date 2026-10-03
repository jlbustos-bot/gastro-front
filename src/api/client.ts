import axios from 'axios';

const runtimeApiUrl = window.__GASTROSOFT_CONFIG__?.apiUrl?.trim();
const buildApiUrl = import.meta.env.VITE_API_URL?.trim();

const API_BASE_URL = runtimeApiUrl || buildApiUrl || '/api';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticacion
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Un 401 en login/register es "credenciales invalidas", no sesion expirada.
    // No se debe redirigir en ese caso para que la pagina muestre el error.
    const url = error.config?.url ?? '';
    const isAuthAttempt = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
