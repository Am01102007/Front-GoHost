import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Guards basados en rol.
 *
 * Valida el rol del usuario autenticado antes de activar o hacer match de una ruta.
 * `roleGuard` bloquea navegación cuando el rol no está permitido y redirige;
 * `roleMatch` oculta la ruta desde el enrutamiento si no coincide.
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    
    const userRole = auth.currentUser()?.rol?.toLowerCase();
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirigir al inicio si no tiene el rol adecuado
      return router.createUrlTree(['/']);
    }
    
    return true;
  };
};

/** Variante `CanMatch` para ocultar rutas no coincidentes desde el enrutamiento */
export const roleMatch = (allowedRoles: string[]): CanMatchFn => {
  return () => {
    const auth = inject(AuthService);
    const userRole = auth.currentUser()?.rol?.toLowerCase();
    return !!userRole && allowedRoles.includes(userRole);
  };
};

// Guards específicos para cada rol
export const hostGuard: CanActivateFn = roleGuard(['anfitrion']);
export const guestGuard: CanActivateFn = roleGuard(['huesped']);

// Matches específicos
export const hostMatch: CanMatchFn = roleMatch(['anfitrion']);
export const guestMatch: CanMatchFn = roleMatch(['huesped']);
