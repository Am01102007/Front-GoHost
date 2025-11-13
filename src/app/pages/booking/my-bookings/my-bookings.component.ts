import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { EmailService } from '../../../core/services/email.service';

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
  email = inject(EmailService);

  tab: 'activas' | 'canceladas' = 'activas';

  ngOnInit() {
    // Cargar reservas del huésped autenticado y almacenarlas en la señal
    this.bookingsSvc.fetchMine().subscribe();
    try { this.email.init(); } catch {}
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
    try {
      const b = this.bookingsSvc.bookings().find(x => x.id === id);
      const user = this.auth.userProfile();
      if (b) this.email.sendBookingCancelled({
        to_email: user?.email,
        to_name: user?.nombre,
        alojamientoId: b.listingId,
        fechaInicio: b.fechaInicio,
        fechaFin: b.fechaFin,
        recipient_role: 'HUESPED',
      });
    } catch {}
  }

  pagar(id: string) {
    this.bookingsSvc.pagar(id).subscribe({
      next: () => this.notifications.success('Reserva pagada', 'Tu reserva fue confirmada exitosamente')
    });
    try {
      const b = this.bookingsSvc.bookings().find(x => x.id === id);
      const user = this.auth.userProfile();
      if (b) this.email.sendBookingPaid({
        to_email: user?.email,
        to_name: user?.nombre,
        alojamientoId: b.listingId,
        fechaInicio: b.fechaInicio,
        fechaFin: b.fechaFin,
        huespedes: b.huespedes,
        recipient_role: 'HUESPED',
      });
    } catch {}
  }
}
