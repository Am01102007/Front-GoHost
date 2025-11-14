// Runtime config para frontend (dev): sólo API base y proveedor de correo.
// No se exponen credenciales ni IDs de plantillas aquí.
(function(w, loc){
  // Detectar entorno local para usar el proxy '/api' y evitar CORS
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(loc.hostname);
  const defaultApiBase = isLocal ? '/api' : 'https://backend-gohost-production.up.railway.app/api';

  // En producción, forzar backend remoto para evitar que quede '/api' por error
  if (!isLocal) {
    w.__ENV__ = Object.assign({}, w.__ENV__ || {}, {
      API_BASE_URL: defaultApiBase,
      MAIL_PROVIDER: 'backend'
    });
  } else {
    // En desarrollo, permitir override y usar proxy '/api'
    w.__ENV__ = Object.assign({}, w.__ENV__ || {}, {
      API_BASE_URL: w.__ENV__?.API_BASE_URL || defaultApiBase,
      MAIL_PROVIDER: w.__ENV__?.MAIL_PROVIDER || 'backend'
    });
  }

  // Log ligero para diagnóstico
  try { console.debug('[env] API_BASE_URL =', w.__ENV__.API_BASE_URL); } catch {}
})(window, window.location);
