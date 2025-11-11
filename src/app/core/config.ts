/**
 * Configuración central del backend.
 *
 * `API_BASE` define el prefijo para todas las llamadas HTTP.
 * Primero usa el valor runtime inyectado por `/env.js` (window.__ENV__.API_BASE_URL).
 * Si no existe, usa el `environment.apiUrl` (que en producción apunta directo al backend).
 */
import { environment } from '../../environments/environment';
export const API_BASE = (globalThis as any).__ENV__?.API_BASE_URL ?? environment.apiUrl;
