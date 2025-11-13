import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { NotificationsService } from '../services/notifications.service';

type WithForm = { form?: { dirty?: boolean }; } & Record<string, any>;

/**
 * Guard de cambios pendientes.
 *
 * Antes de salir de una ruta con formularios sucios (`form.dirty === true`),
 * muestra una confirmación al usuario para evitar perder cambios.
 */
export const pendingChangesGuard: CanDeactivateFn<WithForm> = (component) => {
  const notifications = inject(NotificationsService);
  const isDirty = !!component?.form?.dirty;

  if (!isDirty) return true;

  return notifications.confirm(
    'Cambios sin guardar',
    'Tienes cambios sin guardar. ¿Seguro que quieres salir?'
  );
};
