import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.scss']
})
export class BookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingsSvc = inject(BookingsService);
  private listingsSvc = inject(ListingsService);
  private notifications = inject(NotificationsService);

  booking = signal<Booking | null>(null);

  listing = computed(() => {
    const b = this.booking();
    if (!b) return undefined;
    return this.listingsSvc.getById(b.listingId);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    // Garantizar que tenemos reservas del anfitrión cargadas
    this.bookingsSvc.fetchForHost().subscribe({
      next: () => {
        const b = this.bookingsSvc.bookings().find(x => x.id === id) || null;
        this.booking.set(b);
        // Si falta el alojamiento, intentamos cargarlo por ID
        if (b && !this.listing()) {
          this.listingsSvc.fetchById(b.listingId).subscribe({
            error: () => {/* noop */}
          });
        }
      },
      error: () => {
        this.notifications.error('No se pudieron cargar las reservas');
      }
    });
  }

  aceptar(): void {
    const b = this.booking();
    if (!b) return;
    this.bookingsSvc.updateStatus(b.id, 'pagado').subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.notifications.success('Reserva aceptada');
      },
      error: () => this.notifications.error('Error al aceptar la reserva')
    });
  }

  rechazar(): void {
    const b = this.booking();
    if (!b) return;
    this.bookingsSvc.updateStatus(b.id, 'cancelado').subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.notifications.warning('Reserva rechazada');
      },
      error: () => this.notifications.error('Error al rechazar la reserva')
    });
  }

  cancelar(): void {
    const b = this.booking();
    if (!b) return;
    this.bookingsSvc.cancelar(b.id).subscribe({
      next: () => {
        this.booking.set({ ...(b as any), estado: 'cancelado' });
        this.notifications.warning('Reserva cancelada');
      },
      error: () => this.notifications.error('Error al cancelar la reserva')
    });
  }

  marcarPagado(): void {
    const b = this.booking();
    if (!b) return;
    this.bookingsSvc.pagar(b.id).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.notifications.success('Reserva marcada como pagada');
      },
      error: () => this.notifications.error('Error al marcar como pagada')
    });
  }

  volver(): void {
    this.router.navigate(['/reservas-anfitrion']);
  }
}

