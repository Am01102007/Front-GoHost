import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ListingsService } from '../../../core/services/listings.service';
import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { AccommodationCardComponent } from '../../../shared/components/accommodation-card/accommodation-card.component';

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, AccommodationCardComponent, RouterLink],
  templateUrl: './my-listings.component.html',
  styleUrls: ['./my-listings.component.scss']
})
export class MyListingsComponent {
  listingsSvc = inject(ListingsService);
  auth = inject(AuthService);
  bookingsSvc = inject(BookingsService);
  
  viewMode: 'grid' | 'list' = 'grid';

  get mine() {
    const uid = this.auth.currentUser()?.id;
    return this.listingsSvc.listings().filter(l => l.anfitrionId === uid);
  }

  get totalBookings() {
    const myListingIds = this.mine.map(l => l.id);
    return this.bookingsSvc.bookings().filter(b => myListingIds.includes(b.listingId)).length;
  }

  get totalEarnings() {
    const myListingIds = this.mine.map(l => l.id);
    const paidBookings = this.bookingsSvc.bookings().filter(b => 
      myListingIds.includes(b.listingId) && b.estado === 'pagado'
    );
    return paidBookings.reduce((total, booking) => {
      const listing = this.listingsSvc.getById(booking.listingId);
      return total + (listing?.precioPorNoche || 0);
    }, 0);
  }

  get averageRating() {
    const ratings = this.mine.map(l => l.calificacionPromedio || 0).filter(r => r > 0);
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  }
}
