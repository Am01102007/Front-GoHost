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

// Proveedor de correo (emailjs | mailtrap)
export const MAIL_PROVIDER: string = (globalThis as any).__ENV__?.MAIL_PROVIDER ?? 'emailjs';

// Config SMTP para SMTP.js
export const SMTP_HOST: string = (globalThis as any).__ENV__?.SMTP_HOST ?? '';
export const SMTP_PORT: string = (globalThis as any).__ENV__?.SMTP_PORT ?? '';
export const SMTP_USERNAME: string = (globalThis as any).__ENV__?.SMTP_USERNAME ?? '';
export const SMTP_PASSWORD: string = (globalThis as any).__ENV__?.SMTP_PASSWORD ?? '';
export const SMTP_FROM_EMAIL: string = (globalThis as any).__ENV__?.SMTP_FROM_EMAIL ?? '';
export const SMTP_FROM_NAME: string = (globalThis as any).__ENV__?.SMTP_FROM_NAME ?? '';

