/**
 * Configuración central del backend.
 *
 * `API_BASE` define el prefijo para todas las llamadas HTTP.
 * Primero usa el valor runtime inyectado por `/env.js` (window.__ENV__.API_BASE_URL).
 * Si no existe, usa el `environment.apiUrl` (que en producción apunta directo al backend).
 */
import { environment } from '../../environments/environment';

// Usa primero la URL inyectada por /env.js.
// Si no existe y estamos en localhost, usa '/api' para el proxy SSR.
// En otros casos, usa environment.apiUrl (producción apunta al backend remoto).
const RUNTIME_API = (globalThis as any).__ENV__?.API_BASE_URL;
const IS_LOCALHOST = typeof globalThis !== 'undefined'
  && typeof (globalThis as any).location !== 'undefined'
  && /localhost|127\.0\.0\.1/i.test((globalThis as any).location.hostname || '');

export const API_BASE = RUNTIME_API ?? (IS_LOCALHOST ? '/api' : environment.apiUrl);
