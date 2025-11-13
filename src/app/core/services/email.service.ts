import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID_BOOKING_CREATED,
  EMAILJS_TEMPLATE_ID_BOOKING_PAID,
  EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED,
  EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED,
  EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED,
  EMAILJS_TEMPLATE_ID_WELCOME,
  EMAILJS_TEMPLATE_ID_PROFILE_UPDATED,
  MAIL_PROVIDER,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
} from '../../shared/email.config';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private initialized = false;
  private canSend = false;
  
  private isSmtpJsEnabled(): boolean {
    return (MAIL_PROVIDER || '').toLowerCase() === 'smtpjs';
  }

  private smtpConfigured(): boolean {
    return !!(SMTP_HOST && SMTP_USERNAME && SMTP_PASSWORD && SMTP_FROM_EMAIL);
  }

  private async sendSMTP(to: string, subject: string, html: string, text?: string): Promise<void> {
    const Email = (globalThis as any).Email;
    if (!Email || typeof Email.send !== 'function') {
      console.warn('SMTP.js no está cargado');
      return;
    }
    if (!this.smtpConfigured()) {
      console.warn('SMTP.js: configuración SMTP incompleta');
      return;
    }
    const payload: any = {
      Host: SMTP_HOST,
      Username: SMTP_USERNAME,
      Password: SMTP_PASSWORD,
      To: to,
      From: SMTP_FROM_EMAIL,
      Subject: subject,
      Body: html,
    };
    if (SMTP_PORT) payload.Port = SMTP_PORT;
    // Nota: SMTP.js no soporta 'text' separado; Body acepta HTML/Texto.
    await Email.send(payload);
  }

  init(): void {
    // Solo inicializar en navegador
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    if (EMAILJS_PUBLIC_KEY) {
      try {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        this.canSend = true;
      } catch (e) {
        console.warn('EmailJS: init falló', e);
        this.canSend = false;
      }
    } else {
      console.warn('EmailJS: PUBLIC_KEY no configurada');
    }
    this.initialized = true;
  }

  /** Indica si la plantilla de bienvenida está correctamente configurada */
  isWelcomeConfigured(): boolean {
    return !!(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID_WELCOME);
  }

  /** Envía correo de "reserva creada" (pendiente) */
  async sendBookingCreated(params: {
    to_email?: string;
    to_name?: string;
    alojamientoId: string;
    fechaInicio: string;
    fechaFin: string;
    huespedes: number;
    huesped_email?: string;
    huesped_nombre?: string;
  }): Promise<void> {
    if (typeof window === 'undefined') return; // SSR: solo cliente
    const to = params.to_email || params.huesped_email;
    if (this.isSmtpJsEnabled() && to) {
      const subject = 'Reserva creada';
      const html = `<h2>Reserva creada</h2><p>Tu reserva se ha creado correctamente.</p><ul><li><b>Alojamiento:</b> ${params.alojamientoId}</li><li><b>Fechas:</b> ${params.fechaInicio} - ${params.fechaFin}</li><li><b>Huéspedes:</b> ${params.huespedes}</li></ul>`;
      await this.sendSMTP(to, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_BOOKING_CREATED) {
      console.warn('EmailJS: claves/IDs faltantes, no se envía');
      return;
    }
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_BOOKING_CREATED, params); } catch (err) {
      console.error('EmailJS: error enviando correo de reserva creada', err);
    }
  }

  /** Envía correo de "reserva pagada/confirmada" */
  async sendBookingPaid(params: {
    to_email?: string;
    to_name?: string;
    alojamientoId: string;
    fechaInicio: string;
    fechaFin: string;
    huespedes?: number;
    recipient_role?: string;
  }): Promise<void> {
    if (typeof window === 'undefined') return;
    const to = params.to_email;
    if (this.isSmtpJsEnabled() && to) {
      const subject = 'Reserva confirmada';
      const html = `<h2>Reserva confirmada</h2><p>Tu pago fue recibido y la reserva está confirmada.</p><ul><li><b>Fechas:</b> ${params.fechaInicio} - ${params.fechaFin}</li></ul>`;
      await this.sendSMTP(to, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_BOOKING_PAID) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_BOOKING_PAID, params); } catch {}
  }

  /** Envía correo de "reserva cancelada" */
  async sendBookingCancelled(params: {
    to_email?: string;
    to_name?: string;
    alojamientoId: string;
    fechaInicio: string;
    fechaFin: string;
    motivo?: string;
    recipient_role?: string;
  }): Promise<void> {
    if (typeof window === 'undefined') return;
    const to = params.to_email;
    if (this.isSmtpJsEnabled() && to) {
      const subject = 'Reserva cancelada';
      const html = `<h2>Reserva cancelada</h2><p>Tu reserva fue cancelada.</p><ul><li><b>Fechas:</b> ${params.fechaInicio} - ${params.fechaFin}</li>${params.motivo ? `<li><b>Motivo:</b> ${params.motivo}</li>` : ''}</ul>`;
      await this.sendSMTP(to, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED, params); } catch {}
  }

  // Mantener un único copy reutilizable: para anfitrión usamos las mismas plantillas
  // que para huésped, llamando a sendBookingPaid y sendBookingCancelled.

  /** Envía correo de "solicitud de restablecimiento de contraseña" */
  async sendPasswordResetRequested(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.isSmtpJsEnabled()) {
      const subject = 'Solicitud de restablecimiento de contraseña';
      const html = `<h2>Restablecimiento de contraseña</h2><p>Recibimos tu solicitud de restablecer la contraseña. Si no fuiste tú, puedes ignorar este mensaje.</p>`;
      await this.sendSMTP(params.to_email, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED, params); } catch {}
  }

  /** Envía correo de "contraseña cambiada" */
  async sendPasswordChanged(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.isSmtpJsEnabled()) {
      const subject = 'Contraseña cambiada';
      const html = `<h2>Contraseña cambiada</h2><p>Tu contraseña ha sido cambiada correctamente.</p>`;
      await this.sendSMTP(params.to_email, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED, params); } catch {}
  }

  /** Envía correo de bienvenida tras registro */
  async sendWelcome(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.isSmtpJsEnabled()) {
      const subject = '¡Bienvenido a GoHost!';
      const html = `<h2>¡Bienvenido a GoHost!</h2><p>Hola ${params.to_name || ''}, tu cuenta fue creada correctamente.</p>`;
      await this.sendSMTP(params.to_email, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_WELCOME) {
      console.warn('EmailJS: claves/IDs faltantes, no se envía welcome', {
        canSend: this.canSend,
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID_WELCOME,
      });
      return;
    }
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_WELCOME, params); } catch (err) {
      console.error('EmailJS: error enviando correo de bienvenida', err);
    }
  }

  /** Envía correo de "perfil actualizado" */
  async sendProfileUpdated(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.isSmtpJsEnabled()) {
      const subject = 'Perfil actualizado';
      const html = `<h2>Perfil actualizado</h2><p>Tu perfil fue actualizado correctamente.</p>`;
      await this.sendSMTP(params.to_email, subject, html);
      return;
    }
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_PROFILE_UPDATED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_PROFILE_UPDATED, params); } catch {}
  }
}
