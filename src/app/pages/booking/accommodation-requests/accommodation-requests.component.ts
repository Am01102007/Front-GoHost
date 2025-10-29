import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { ListingsService } from '../../../core/services/listings.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-accommodation-requests',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accommodation-requests.component.html',
  styleUrls: ['./accommodation-requests.component.scss']
})
export class AccommodationRequestsComponent {
  bookings = inject(BookingsService);
  listings = inject(ListingsService);
  auth = inject(AuthService);

  get solicitudes() {
    const uid = this.auth.currentUser()?.id;
    if (!uid) return [];
    const myListingIds = this.listings.listings().filter(l => l.anfitrionId === uid).map(l => l.id);
    return this.bookings.bookings().filter(b => b.estado === 'pendiente' && myListingIds.includes(b.listingId))
      .map(b => ({ ...b, listing: this.listings.getById(b.listingId) }));
  }

  aceptar(id: string) {
    this.bookings.updateStatus(id, 'pagado');
  }

  rechazar(id: string) {
    this.bookings.updateStatus(id, 'cancelado');
  }
}

