import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { EmailService } from '../../../core/services/email.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent {
  fb = inject(FormBuilder);
  bookings = inject(BookingsService);
  auth = inject(AuthService);
  notifications = inject(NotificationsService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  email = inject(EmailService);

  form = this.fb.group({
    listingId: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    huespedes: [1, [Validators.required, Validators.min(1)]],
    metodoPago: ['tarjeta', Validators.required]
  });

  saving = false;

  private crearReserva(estado: 'pendiente' | 'pagado') {
    if (this.form.invalid) return;
    if (!this.auth.currentUser()) {
      this.notifications.error('Debes iniciar sesión', 'Por favor inicia sesión para crear la reserva');
      this.router.navigate(['/login'], { queryParams: { redirect: '/checkout' } });
      return;
    }
    const v = this.form.value;
    this.saving = true;
    this.bookings.create({
      alojamientoId: v.listingId!,
      checkIn: v.fechaInicio!,
      checkOut: v.fechaFin!,
      numeroHuespedes: v.huespedes!
    }).subscribe({
      next: (res) => {
        // Enviar correo de "reserva creada" vía backend SSR
        try {
          const user = this.auth.userProfile();
          this.email.sendBookingCreated({
            to_email: user?.email,
          to_name: user?.nombre,
          alojamientoId: v.listingId!,
          fechaInicio: v.fechaInicio!,
          fechaFin: v.fechaFin!,
          huespedes: v.huespedes!,
          huesped_email: user?.email,
          huesped_nombre: user?.nombre
        });
      } catch {}
        if (estado === 'pagado') {
          this.bookings.updateStatus(res.id, 'pagado').subscribe({
            next: () => {
              this.notifications.success('Reserva pagada', 'Tu reserva fue confirmada exitosamente');
              this.form.reset({ huespedes: 1, metodoPago: 'tarjeta' });
              this.bookings.fetchMine().subscribe(() => this.router.navigate(['/mis-reservas']));
            },
            error: (err) => { this.notifications.httpError(err); },
            complete: () => { this.saving = false; }
          });
        } else {
          this.notifications.success('Reserva creada', 'Tu reserva quedó pendiente de pago');
          this.form.reset({ huespedes: 1, metodoPago: 'tarjeta' });
          this.bookings.fetchMine().subscribe(() => this.router.navigate(['/mis-reservas']));
          this.saving = false;
        }
      },
      error: (err) => { this.notifications.httpError(err); this.saving = false; }
    });
  }

  constructor() {
    // Envío de correo gestionado por SSR; no requiere init en cliente
    // Prefija automáticamente el ID desde query params o estado de navegación
    try {
      const qp = this.route.snapshot.queryParamMap.get('listingId');
      const st: any = (history?.state ?? {});
      const id = qp || st?.listingId;
      if (id) {
        this.form.get('listingId')?.setValue(id);
      }
    } catch {}
  }

  reservarPendiente() { this.crearReserva('pendiente'); }
  reservarPagado() { this.crearReserva('pagado'); }
  cancelar() { this.form.reset({ huespedes: 1, metodoPago: 'tarjeta' }); }

  private diffDays(a: string, b: string): number {
    const s = new Date(a).getTime();
    const e = new Date(b).getTime();
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  }
}
