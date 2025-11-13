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
} from '../../shared/email.config';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private initialized = false;
  private canSend = false;

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
    if (typeof window === 'undefined') return; // SSR: no enviar
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_BOOKING_CREATED) {
      console.warn('EmailJS: claves/IDs faltantes, no se envía');
      return;
    }
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_BOOKING_CREATED, params);
    } catch (err) {
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
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED, params); } catch {}
  }

  // Mantener un único copy reutilizable: para anfitrión usamos las mismas plantillas
  // que para huésped, llamando a sendBookingPaid y sendBookingCancelled.

  /** Envía correo de "solicitud de restablecimiento de contraseña" */
  async sendPasswordResetRequested(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED, params); } catch {}
  }

  /** Envía correo de "contraseña cambiada" */
  async sendPasswordChanged(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED, params); } catch {}
  }

  /** Envía correo de bienvenida tras registro */
  async sendWelcome(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
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
    if (!this.canSend || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_PROFILE_UPDATED) return;
    try { await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_PROFILE_UPDATED, params); } catch {}
  }
}
