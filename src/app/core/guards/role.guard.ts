import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    
    if (!auth.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }
    
    const userRole = auth.currentUser()?.rol;
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirigir al dashboard si no tiene el rol adecuado
      router.navigate(['/']);
      return false;
    }
    
    return true;
  };
};

// Guards específicos para cada rol
export const hostGuard: CanActivateFn = roleGuard(['anfitrion']);
export const guestGuard: CanActivateFn = roleGuard(['huesped']);