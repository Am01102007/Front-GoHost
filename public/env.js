// Runtime config para frontend (dev): sólo API base y proveedor de correo.
// No se exponen credenciales ni IDs de plantillas aquí.
(function(w, loc){
  // Detectar entorno local para usar el proxy '/api' y evitar CORS
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(loc.hostname);
  const defaultApiBase = isLocal ? '/api' : 'https://backend-gohost-production.up.railway.app/api';

  w.__ENV__ = Object.assign({}, w.__ENV__ || {}, {
    // API base: usa '/api' en local (dev) y remoto en producción
    API_BASE_URL: w.__ENV__?.API_BASE_URL || defaultApiBase,
    // Proveedor de correo: por defecto 'backend' (correo lo envía el backend)
    MAIL_PROVIDER: w.__ENV__?.MAIL_PROVIDER || 'backend'
  });

  // Log ligero para diagnóstico
  try { console.debug('[env] API_BASE_URL =', w.__ENV__.API_BASE_URL); } catch {}
})(window, window.location);
