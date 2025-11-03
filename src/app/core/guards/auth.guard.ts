import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Guard de autenticación.
 *
 * Permite acceder a rutas solo si el usuario está autenticado.
 * Redirige a `/login` cuando no hay sesión.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/**
 * Guard inverso de autenticación.
 *
 * Evita que usuarios autenticados accedan a `login/registro/recuperar`.
 * Si hay sesión, redirige a `/`; de lo contrario, permite el acceso.
 */
export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
