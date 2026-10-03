// Configuracion de runtime. Este archivo se copia tal cual a dist/ y se puede
// editar en el servidor publicado SIN necesidad de recompilar el frontend.
//
// Prioridad de resolucion de la URL del API (ver src/api/client.ts):
//   1. window.__GASTROSOFT_CONFIG__.apiUrl   (este archivo, si no esta vacio)
//   2. VITE_API_URL                          (variable de entorno del build)
//   3. '/api'                                (mismo origen, requiere proxy)
//
// Opciones tipicas:
//
//   A) Front y backend en el MISMO dominio, con el servidor web reenviando
//      /api al backend. Es lo recomendado: no hay CORS ni mixed content.
//      apiUrl: '/api'
//
//   B) Front y backend en dominios/puertos distintos.
//      apiUrl: 'https://api.midominio.com/api'
//      (el backend debe seguir usando CORS y el mismo esquema que el front)
//
//   C) Delegar en la variable de entorno del build.
//      apiUrl: ''
//
window.__GASTROSOFT_CONFIG__ = {
  apiUrl: '/api',
};
