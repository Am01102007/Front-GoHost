import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { ListingsService } from '../../../core/services/listings.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { EmailService } from '../../../core/services/email.service';

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
  notifications = inject(NotificationsService);
  email = inject(EmailService);

  get solicitudes() {
    const uid = this.auth.currentUser()?.id;
    if (!uid) return [];
    // Ya usamos el endpoint dedicado en listings.fetchForHost(),
    // por lo que los alojamientos cargados son del anfitrión actual.
    // Evitamos refiltrar por anfitrionId para prevenir desajustes.
    const myListingIds = this.listings.listings().map(l => l.id);
    return this.bookings.bookings().filter(b => b.estado === 'pendiente' && myListingIds.includes(b.listingId))
      .map(b => ({ ...b, listing: this.listings.getById(b.listingId) }));
  }

  aceptar(id: string) {
    this.bookings.updateStatus(id, 'pagado').subscribe({
      next: () => {
        this.notifications.success('Solicitud aceptada', 'La reserva fue confirmada');
        try {
          const b = this.bookings.bookings().find(x => x.id === id);
          const guestEmail = (b as any)?.guestEmail as string | undefined;
          const guestName = (b as any)?.guestName as string | undefined;
          if (b && guestEmail) {
            this.email.sendBookingPaid({
              to_email: guestEmail,
              to_name: guestName,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              huespedes: b.huespedes,
              recipient_role: 'HUESPED',
            });
          }
          const host = this.auth.userProfile();
          if (b && host?.email) {
            this.email.sendBookingPaid({
              to_email: host.email,
              to_name: host.nombre,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              huespedes: b.huespedes,
              recipient_role: 'ANFITRION',
            });
          }
        } catch {}
      }
    });
  }

  rechazar(id: string) {
    this.bookings.updateStatus(id, 'cancelado').subscribe({
      next: () => {
        this.notifications.success('Solicitud rechazada', 'La reserva fue cancelada');
        try {
          const b = this.bookings.bookings().find(x => x.id === id);
          const guestEmail = (b as any)?.guestEmail as string | undefined;
          const guestName = (b as any)?.guestName as string | undefined;
          if (b && guestEmail) {
            this.email.sendBookingCancelled({
              to_email: guestEmail,
              to_name: guestName,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Solicitud rechazada por anfitrión',
              recipient_role: 'HUESPED',
            });
          }
          const host = this.auth.userProfile();
          if (b && host?.email) {
            this.email.sendBookingCancelled({
              to_email: host.email,
              to_name: host.nombre,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Solicitud rechazada por anfitrión',
              recipient_role: 'ANFITRION',
            });
          }
        } catch {}
      }
    });
  }
}
