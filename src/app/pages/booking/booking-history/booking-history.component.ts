import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListingsService } from '../../../core/services/listings.service';

@Component({
  selector: 'app-booking-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './booking-history.component.html',
  styleUrls: ['./booking-history.component.scss']
})
export class BookingHistoryComponent {
  bookingsSvc = inject(BookingsService);
  auth = inject(AuthService);
  listings = inject(ListingsService);

  filter: 'todas' | 'completadas' | 'proximas' = 'todas';

  get allBookings() {
    const uid = this.auth.currentUser()?.id;
    if (!uid) return [];
    
    return this.bookingsSvc.byUser(uid).map(booking => ({
      ...booking,
      listing: this.listings.getById(booking.listingId)
    }));
  }

  get filteredBookings() {
    const now = new Date();
    
    switch (this.filter) {
      case 'completadas':
        return this.allBookings.filter(b => 
          new Date(b.fechaFin) < now && b.estado === 'pagado'
        );
      case 'proximas':
        return this.allBookings.filter(b => 
          new Date(b.fechaInicio) > now && b.estado !== 'cancelado'
        );
      default:
        return this.allBookings;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  getDuration(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'pagado': 'Completado',
      'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  canWriteReview(booking: any): boolean {
    return booking.estado === 'pagado' && new Date(booking.fechaFin) < new Date();
  }

  writeReview(bookingId: string): void {
    // Implementar funcionalidad de reseña
    console.log('Escribir reseña para booking:', bookingId);
  }
}
