import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.scss']
})
export class MyBookingsComponent implements OnInit {
  bookingsSvc = inject(BookingsService);
  auth = inject(AuthService);
  listings = inject(ListingsService);
  notifications = inject(NotificationsService);

  tab: 'activas' | 'canceladas' = 'activas';

  ngOnInit() {
    // Cargar reservas del huésped autenticado y almacenarlas en la señal
    this.bookingsSvc.fetchMine().subscribe();
  }

  get items() {
    // Usar el computed del servicio que ya filtra por usuario actual
    return this.bookingsSvc.myBookings();
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
    this.bookingsSvc.cancelar(id).subscribe({
      next: () => this.notifications.success('Reserva cancelada', 'Se canceló la reserva correctamente')
    });
  }

  pagar(id: string) {
    this.bookingsSvc.pagar(id).subscribe({
      next: () => this.notifications.success('Reserva pagada', 'Tu reserva fue confirmada exitosamente')
    });
  }
}
