import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

/**
 * Servicio de notificaciones de la aplicación.
 *
 * Envuelve SweetAlert2 para mostrar mensajes de éxito, error, información
 * y confirmaciones. En SSR o entornos sin `window`, degrada a logs en consola.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  /**
   * Muestra un mensaje de éxito.
   * @param title Título del mensaje.
   * @param text Texto adicional opcional.
   */
  success(title: string, text?: string): void {
    if (!this.isBrowser) { console.log(`[SUCCESS] ${title} ${text ?? ''}`); return; }
    Swal.fire({ icon: 'success', title, text, timer: 1800, showConfirmButton: false });
  }

  /**
   * Muestra un mensaje de error.
   * @param title Título del mensaje.
   * @param text Texto adicional opcional.
   */
  error(title: string, text?: string): void {
    if (!this.isBrowser) { console.error(`[ERROR] ${title} ${text ?? ''}`); return; }
    Swal.fire({ icon: 'error', title, text });
  }

  /**
   * Muestra un mensaje de información.
   * @param title Título del mensaje.
   * @param text Texto adicional opcional.
   */
  info(title: string, text?: string): void {
    if (!this.isBrowser) { console.info(`[INFO] ${title} ${text ?? ''}`); return; }
    Swal.fire({ icon: 'info', title, text, timer: 2000, showConfirmButton: false });
  }

  /**
   * Muestra una notificación genérica basada en el tipo.
   * @param type Tipo de notificación ('success', 'error', 'info', 'warning').
   * @param message Mensaje a mostrar.
   */
  notify(type: 'success' | 'error' | 'info' | 'warning', message: string): void {
    switch (type) {
      case 'success':
        this.success(message);
        break;
      case 'error':
        this.error(message);
        break;
      case 'info':
        this.info(message);
        break;
      case 'warning':
        if (!this.isBrowser) { console.warn(`[WARNING] ${message}`); return; }
        Swal.fire({ icon: 'warning', title: message, timer: 2500, showConfirmButton: false });
        break;
    }
  }

  /**
   * Solicita confirmación del usuario mediante un diálogo.
   * @param title Título del diálogo.
   * @param text Texto adicional opcional.
   * @returns `Promise<boolean>` con `true` si el usuario confirma.
   */
  confirm(title: string, text?: string): Promise<boolean> {
    if (!this.isBrowser) { return Promise.resolve(true); }
    return Swal.fire({
      icon: 'question', title, text,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar'
    }).then((r: any) => r.isConfirmed);
  }

  /**
   * Construye y muestra una notificación de error HTTP amigable.
   * @param error Error HTTP recibido por `HttpClient`.
   */
  httpError(error: any): void {
    const status = error?.status;
    let message = 'Ha ocurrido un error';
    const backendMsg = typeof error?.error === 'string' ? error.error : (error?.error?.message || error?.message);
    if (backendMsg) message = backendMsg;
    const detail = (error?.error && typeof error.error === 'object') ? JSON.stringify(error.error) : undefined;
    this.error(status ? `Error (${status})` : 'Error', detail ? `${message}\n${detail}` : message);
  }
}
