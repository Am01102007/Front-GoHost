import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BookingsService } from '../../../core/services/bookings.service';
import { AuthService } from '../../../core/services/auth.service';
import { v4 as uuidv4 } from 'uuid';

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
    const days = this.diffDays(v.fechaInicio!, v.fechaFin!);
    const total = days * 100; // mock tarifa
    this.bookings.add({
      id: uuidv4(),
      listingId: v.listingId!,
      userId: this.auth.currentUser()!.id,
      fechaInicio: v.fechaInicio!,
      fechaFin: v.fechaFin!,
      huespedes: v.huespedes!,
      total,
      estado
    });
    this.form.reset({ huespedes: 1, metodoPago: 'tarjeta' });
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
