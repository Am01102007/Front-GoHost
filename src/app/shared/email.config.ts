/**
 * Configuración mínima expuesta al cliente.
 * El frontend sólo necesita saber el proveedor de correo.
 * En producción y dev, el envío se realiza vía SSR/Nodemailer.
 */
export const MAIL_PROVIDER: string = (globalThis as any).__ENV__?.MAIL_PROVIDER ?? 'backend';
// Recomendación: por defecto usar 'backend' para delegar envío al backend
// y evitar depender del endpoint SSR `/mail/send`.
export const MAIL_PROVIDER_DEFAULT = 'backend';
export const EFFECTIVE_MAIL_PROVIDER: string = (globalThis as any).__ENV__?.MAIL_PROVIDER ?? MAIL_PROVIDER_DEFAULT;
export const MAIL_ENABLED: boolean = String((globalThis as any).__ENV__?.MAIL_ENABLED ?? 'true').toLowerCase() === 'true';

