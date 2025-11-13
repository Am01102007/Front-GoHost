// Runtime config para frontend (dev): sólo API base y proveedor de correo.
// No se exponen credenciales ni IDs de plantillas aquí.
(function(w){
  w.__ENV__ = Object.assign({}, w.__ENV__ || {}, {
    // API base: apuntar directo al backend público por defecto
    API_BASE_URL: w.__ENV__?.API_BASE_URL || 'https://backend-gohost-production.up.railway.app',
    // Proveedor de correo: por defecto 'backend' (correo lo envía el backend)
    MAIL_PROVIDER: w.__ENV__?.MAIL_PROVIDER || 'backend'
  });
})(window);
