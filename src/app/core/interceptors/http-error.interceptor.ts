import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { NotificationsService } from '../services/notifications.service';
import { Router } from '@angular/router';

/**
 * Interceptor de errores HTTP.
 *
 * Captura errores de `HttpClient`, registra un log con contexto (método,
 * URL y estado) y muestra una notificación amigable al usuario mediante
 * `NotificationsService`.
 */
export const httpErrorInterceptorFn: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationsService);
  const router = inject(Router);
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

      // Manejo específico para 401: redirigir a login con returnUrl
      // Evitar redirección si ya estamos llamando a endpoints de auth
      const isAuthEndpoint = /\/auth\//.test(url);
      if (status === 401 && !isAuthEndpoint) {
        try {
          const isBrowser = typeof window !== 'undefined';
          const currentPath = isBrowser ? window.location.pathname : '/';
          // Navegar a login con returnUrl para volver después de autenticarse
          router.navigate(['/login'], { queryParams: { returnUrl: currentPath } });
          // Mensaje claro para el usuario
          notifications.info('Autenticación requerida', 'Por favor inicia sesión para continuar');
        } catch (e) {
          // En SSR o si falla la navegación, no interrumpir el flujo
          console.warn('httpErrorInterceptor: No se pudo redirigir a login', e);
        }
      }
      return throwError(() => error);
    })
  );
};
