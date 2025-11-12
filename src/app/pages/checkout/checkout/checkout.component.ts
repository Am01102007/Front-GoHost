import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ActivatedRoute } from '@angular/router';

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

  form = this.fb.group({
    listingId: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    huespedes: [1, [Validators.required, Validators.min(1)]],
    metodoPago: ['tarjeta', Validators.required]
  });

  private crearReserva(estado: 'pendiente' | 'pagado') {
    if (this.form.invalid || !this.auth.currentUser()) return;
    const v = this.form.value;
    this.bookings.create({
      alojamientoId: v.listingId!,
      checkIn: v.fechaInicio!,
      checkOut: v.fechaFin!,
      numeroHuespedes: v.huespedes!
    }).subscribe(res => {
      if (estado === 'pagado') {
        this.bookings.updateStatus(res.id, 'pagado').subscribe(() => {
          this.notifications.success('Reserva pagada', 'Tu reserva fue confirmada exitosamente');
          this.form.reset({ huespedes: 1, metodoPago: 'tarjeta' });
        });
      } else {
        this.notifications.success('Reserva creada', 'Tu reserva quedó pendiente de pago');
        this.form.reset({ huespedes: 1, metodoPago: 'tarjeta' });
      }
    });
  }

  constructor() {
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
