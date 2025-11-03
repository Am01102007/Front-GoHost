import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
// Evitar dependencia circular con AuthService.
// Leer el token directamente desde localStorage.

/**
 * Interceptor de autenticación.
 *
 * Adjunta el encabezado `Authorization: Bearer <token>` a las solicitudes
 * HTTP cuando el usuario está autenticado. No modifica la petición si no
 * hay token disponible.
 */
export const authInterceptorFn: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;
  try {
    token = (globalThis as any).localStorage?.getItem('auth_token') ?? null;
  } catch {
    token = null;
  }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(req);
};
