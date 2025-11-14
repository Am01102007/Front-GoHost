import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EFFECTIVE_MAIL_PROVIDER } from '../../shared/email.config';

@Injectable({ providedIn: 'root' })
export class EmailService {
  constructor(private http: HttpClient) {}
  
  private isSsrSmtpEnabled(): boolean {
    return (EFFECTIVE_MAIL_PROVIDER || '').toLowerCase() === 'ssrsmtp';
  }

  private async sendViaBackend(type: string, to: string, data: any): Promise<void> {
    try {
      await this.http.post('/mail/send', { type, to, data }).toPromise();
    } catch (err) {
      console.error('Backend mail send error:', err);
    }
  }

  // Ya no se requiere inicialización en cliente; el envío es vía SSR.
  init(): void { /* no-op */ }

  /** Indica si la plantilla de bienvenida está correctamente configurada */
  isWelcomeConfigured(): boolean { return true; }

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
    if (!this.isSsrSmtpEnabled()) return; // backend se encarga, evitar redundancias
    const to = params.to_email || params.huesped_email;
    if (to) await this.sendViaBackend('booking_created', to, params);
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
    if (!this.isSsrSmtpEnabled()) return;
    const to = params.to_email;
    if (to) await this.sendViaBackend('booking_paid', to, params);
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
    if (!this.isSsrSmtpEnabled()) return;
    const to = params.to_email;
    if (to) await this.sendViaBackend('booking_cancelled', to, params);
  }

  // Mantener un único copy reutilizable: para anfitrión usamos las mismas plantillas
  // que para huésped, llamando a sendBookingPaid y sendBookingCancelled.

  /** Envía correo de "solicitud de restablecimiento de contraseña" */
  async sendPasswordResetRequested(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.isSsrSmtpEnabled()) return;
    await this.sendViaBackend('password_reset_requested', params.to_email, params);
  }

  /** Envía correo de "contraseña cambiada" */
  async sendPasswordChanged(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.isSsrSmtpEnabled()) return;
    await this.sendViaBackend('password_changed', params.to_email, params);
  }

  /** Envía correo de bienvenida tras registro */
  async sendWelcome(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.isSsrSmtpEnabled()) return;
    await this.sendViaBackend('welcome', params.to_email, params);
  }

  /** Envía correo de "perfil actualizado" */
  async sendProfileUpdated(params: { to_email: string; to_name?: string }): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.isSsrSmtpEnabled()) return;
    await this.sendViaBackend('profile_updated', params.to_email, params);
  }
}
