/**
 * Configuración central del backend.
 *
 * `API_BASE` define el prefijo para todas las llamadas HTTP.
 * Usar una ruta relativa (`/api`) permite que el servidor SSR actúe
 * como proxy hacia el backend, evitando CORS en desarrollo y producción.
 */
export const API_BASE = '/api';
