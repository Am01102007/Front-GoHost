import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListingsService } from '../../../core/services/listings.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.scss']
})
export class MyBookingsComponent {
  bookingsSvc = inject(BookingsService);
  auth = inject(AuthService);
  listings = inject(ListingsService);

  tab: 'activas' | 'canceladas' = 'activas';

  get items() {
    const uid = this.auth.currentUser()?.id;
    return uid ? this.bookingsSvc.byUser(uid) : [];
  }

  get activas() {
    return this.items.filter(b => b.estado !== 'cancelado').map(b => ({
      ...b,
      listing: this.listings.getById(b.listingId)
    }));
  }

  get canceladas() {
    return this.items.filter(b => b.estado === 'cancelado').map(b => ({
      ...b,
      listing: this.listings.getById(b.listingId)
    }));
  }

  cancelar(id: string) {
    this.bookingsSvc.cancelar(id);
  }

  pagar(id: string) {
    this.bookingsSvc.pagar(id);
  }
}
