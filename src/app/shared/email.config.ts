/**
 * Configuración de EmailJS obtenida desde `window.__ENV__`.
 * Define claves públicas y IDs de servicio/plantilla.
 * No incluir secretos en el repositorio; inyectar vía variables de entorno.
 */
export const EMAILJS_PUBLIC_KEY: string = (globalThis as any).__ENV__?.EMAILJS_PUBLIC_KEY ?? '';
export const EMAILJS_SERVICE_ID: string = (globalThis as any).__ENV__?.EMAILJS_SERVICE_ID ?? '';
export const EMAILJS_TEMPLATE_ID_BOOKING_CREATED: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_BOOKING_CREATED ?? '';
export const EMAILJS_TEMPLATE_ID_BOOKING_PAID: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_BOOKING_PAID ?? '';
export const EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED ?? '';
export const EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED ?? '';
export const EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED ?? '';
export const EMAILJS_TEMPLATE_ID_WELCOME: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_WELCOME ?? '';
export const EMAILJS_TEMPLATE_ID_PROFILE_UPDATED: string = (globalThis as any).__ENV__?.EMAILJS_TEMPLATE_ID_PROFILE_UPDATED ?? '';
// Mantener un único copy reutilizable: usar las mismas plantillas para huésped y anfitrión.

// Proveedor de correo: 'ssrsmtp' (envío seguro vía backend) | 'emailjs'
export const MAIL_PROVIDER: string = (globalThis as any).__ENV__?.MAIL_PROVIDER ?? 'ssrsmtp';

// Ya no se leen credenciales SMTP en el cliente por seguridad.

