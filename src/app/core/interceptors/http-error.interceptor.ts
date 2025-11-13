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

      // Manejo específico para 401:
      // No redirigir en solicitudes públicas (GET sin Authorization) como /alojamientos
      const isAuthEndpoint = /\/auth\//.test(url);
      const hasAuthHeader = !!req.headers.get('Authorization');
      const isGetRequest = method === 'GET';
      const hitsPublicListings = /\/alojamientos(\/?|\?|$)/.test(url);

      if (status === 401 && !isAuthEndpoint) {
        // Evitar redirección si es una petición pública (por ejemplo, listar alojamientos)
        if (isGetRequest && !hasAuthHeader && hitsPublicListings) {
          // Solo notificamos; no forzamos login para navegación pública
          console.warn('401 en recurso público, evitando redirección automática a login');
        } else {
          // Para recursos protegidos, redirigir a login con returnUrl
          try {
            const isBrowser = typeof window !== 'undefined';
            const currentPath = isBrowser ? window.location.pathname : '/';
            router.navigate(['/login'], { queryParams: { returnUrl: currentPath } });
            notifications.info('Autenticación requerida', 'Por favor inicia sesión para continuar');
          } catch (e) {
            console.warn('httpErrorInterceptor: No se pudo redirigir a login', e);
          }
        }
      }
      return throwError(() => error);
    })
  );
};
