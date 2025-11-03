import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { NotificationsService } from '../services/notifications.service';

/**
 * Interceptor de errores HTTP.
 *
 * Captura errores de `HttpClient`, registra un log con contexto (método,
 * URL y estado) y muestra una notificación amigable al usuario mediante
 * `NotificationsService`.
 */
export const httpErrorInterceptorFn: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationsService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const url = req.url;
      const method = req.method;
      const status = error.status;
      const message = error.message || 'Error en la solicitud HTTP';
      const body = (error.error && typeof error.error === 'object') ? JSON.stringify(error.error) : String(error.error || '');
      console.error(`[HTTP ${method}] ${url} -> ${status} | ${message} | body=${body}`);
      // Notificación visible para el usuario
      notifications.httpError(error);
      return throwError(() => error);
    })
  );
};
