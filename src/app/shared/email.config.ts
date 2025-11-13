/**
 * Configuración mínima expuesta al cliente.
 * El frontend sólo necesita saber el proveedor de correo.
 * En producción y dev, el envío se realiza vía SSR/Nodemailer.
 */
export const MAIL_PROVIDER: string = (globalThis as any).__ENV__?.MAIL_PROVIDER ?? 'ssrsmtp';

