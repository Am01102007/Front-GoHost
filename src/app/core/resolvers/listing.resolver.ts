import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ListingsService } from '../services/listings.service';
import { Listing } from '../models/listing.model';
import { catchError, of } from 'rxjs';

/**
 * Resolver de alojamiento.
 *
 * Carga un `Listing` por `id` antes de activar la ruta de detalle.
 * Si ocurre un error, devuelve `null` para que la página maneje el caso.
 */
export const listingResolver: ResolveFn<Listing | null> = (route) => {
  const svc = inject(ListingsService);
  const id = route.params['id'];
  return svc.fetchById(id).pipe(
    catchError(() => of(null))
  );
};
