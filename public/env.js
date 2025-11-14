// Runtime config para frontend (dev): sólo API base y proveedor de correo.
// No se exponen credenciales ni IDs de plantillas aquí.
(function(w, loc){
  // Forzar SIEMPRE el backend remoto para pruebas locales y producción
  const defaultApiBase = 'https://backend-gohost-production.up.railway.app/api';

  w.__ENV__ = Object.assign({}, w.__ENV__ || {}, {
    API_BASE_URL: defaultApiBase,
    MAIL_PROVIDER: 'backend'
  });

  // Log ligero para diagnóstico
  try { console.debug('[env] API_BASE_URL =', w.__ENV__.API_BASE_URL); } catch {}
})(window, window.location);
