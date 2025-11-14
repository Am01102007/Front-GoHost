import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { EmailService } from '../../../core/services/email.service';
import { AuthService } from '../../../core/services/auth.service';
import { Booking } from '../../../core/models/booking.model';
import { isCloudinaryUrl, withTransforms, buildSrcSet, mainImageSizes } from '../../../shared/cloudinary.util';

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
  private email = inject(EmailService);
  private auth = inject(AuthService);

  booking = signal<Booking | null>(null);
  actionLoading = signal<boolean>(false);

  listing = computed(() => {
    const b = this.booking();
    if (!b) return undefined;
    return this.listingsSvc.getById(b.listingId);
  });

  ngOnInit(): void {
    try { this.email.init(); } catch {}
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
    this.actionLoading.set(true);
    this.bookingsSvc.updateStatus(b.id, 'pagado').subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.notifications.success('Reserva aceptada');
        try {
          const guestEmail = (b as any).guestEmail as string | undefined;
          const guestName = (b as any).guestName as string | undefined;
          if (guestEmail) {
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
          if (host?.email) {
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
      },
      error: (e) => this.notifications.error('Error al aceptar la reserva'),
      complete: () => this.actionLoading.set(false)
    });
  }

  rechazar(): void {
    const b = this.booking();
    if (!b) return;
    this.actionLoading.set(true);
    this.bookingsSvc.updateStatus(b.id, 'cancelado').subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.notifications.notify('warning', 'Reserva rechazada');
        try {
          const guestEmail = (b as any).guestEmail as string | undefined;
          const guestName = (b as any).guestName as string | undefined;
          if (guestEmail) {
            this.email.sendBookingCancelled({
              to_email: guestEmail,
              to_name: guestName,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Rechazada por anfitrión',
              recipient_role: 'HUESPED',
            });
          }
          const host = this.auth.userProfile();
          if (host?.email) {
            this.email.sendBookingCancelled({
              to_email: host.email,
              to_name: host.nombre,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Rechazada por anfitrión',
              recipient_role: 'ANFITRION',
            });
          }
        } catch {}
      },
      error: () => this.notifications.error('Error al rechazar la reserva'),
      complete: () => this.actionLoading.set(false)
    });
  }

  cancelar(): void {
    const b = this.booking();
    if (!b) return;
    this.actionLoading.set(true);
    this.bookingsSvc.cancelar(b.id).subscribe({
      next: () => {
        this.booking.set({ ...(b as any), estado: 'cancelado' });
        this.notifications.notify('warning', 'Reserva cancelada');
        try {
          const guestEmail = (b as any).guestEmail as string | undefined;
          const guestName = (b as any).guestName as string | undefined;
          if (guestEmail) {
            this.email.sendBookingCancelled({
              to_email: guestEmail,
              to_name: guestName,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Cancelada por anfitrión',
              recipient_role: 'HUESPED',
            });
          }
          const host = this.auth.userProfile();
          if (host?.email) {
            this.email.sendBookingCancelled({
              to_email: host.email,
              to_name: host.nombre,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Cancelada por anfitrión',
              recipient_role: 'ANFITRION',
            });
          }
        } catch {}
      },
      error: () => this.notifications.error('Error al cancelar la reserva'),
      complete: () => this.actionLoading.set(false)
    });
  }

  marcarPagado(): void {
    const b = this.booking();
    if (!b) return;
    this.actionLoading.set(true);
    this.bookingsSvc.pagar(b.id).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.notifications.success('Reserva marcada como pagada');
        try {
          const b2 = this.booking();
          const guestEmail = (b2 as any)?.guestEmail as string | undefined;
          const guestName = (b2 as any)?.guestName as string | undefined;
          if (guestEmail) {
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
          if (host?.email) {
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
      },
      error: () => this.notifications.error('Error al marcar como pagada'),
      complete: () => this.actionLoading.set(false)
    });
  }

  volver(): void {
    this.router.navigate(['/reservas-anfitrion']);
  }

  get coverImage(): string {
    const url = this.listing()?.imagenes?.[0];
    if (!url) return '/images/placeholder.jpg';
    return isCloudinaryUrl(url) ? withTransforms(url, 'c_fill,f_auto,q_auto,w_1200,h_800,dpr_auto') : url;
  }

  get coverSrcSet(): string {
    const url = this.listing()?.imagenes?.[0];
    return url && isCloudinaryUrl(url) ? buildSrcSet(url, [640, 768, 1024, 1280, 1600]) : '';
  }

  get coverSizes(): string {
    return mainImageSizes();
  }
}
