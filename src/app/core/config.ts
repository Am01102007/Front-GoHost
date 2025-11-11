/**
 * Configuración central del backend.
 *
 * `API_BASE` define el prefijo para todas las llamadas HTTP.
 * Usar una ruta relativa (`/api`) permite que el servidor SSR actúe
 * como proxy hacia el backend, evitando CORS en desarrollo y producción.
 */
// Permite sobreescribir vía script runtime /env.js (window.__ENV__.API_BASE_URL)
export const API_BASE = (globalThis as any).__ENV__?.API_BASE_URL ?? '/api';
