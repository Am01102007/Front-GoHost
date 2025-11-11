/**
 * Configuración compartida del proyecto.
 *
 * BACKEND_URL: URL base del backend cuando se necesita construir rutas absolutas
 * desde el frontend (por ejemplo, en servicios genéricos). En desarrollo, puede
 * apuntar a `http://localhost:8080` y en producción debería configurarse según el entorno.
 *
 * Nota: Los servicios que usan rutas relativas como `'/api'` seguirán funcionando
 * con el proxy de Angular. Este valor se usa principalmente por `ApiService` para
 * construir URLs absolutas si corresponde.
 */
// Si se define window.__ENV__.API_BASE_URL (inyectado por /env.js), usarlo.
// En caso contrario, dejar vacío para que ApiService use environment.apiUrl ('/api').
export const BACKEND_URL: string = (globalThis as any).__ENV__?.API_BASE_URL ?? '';

