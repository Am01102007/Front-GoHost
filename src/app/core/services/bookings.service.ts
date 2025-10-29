import { Injectable, signal } from '@angular/core';
import { Booking } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  bookings = signal<Booking[]>([]);

  add(booking: Booking): Booking {
    this.bookings.set([...this.bookings(), booking]);
    return booking;
  }

  byUser(userId: string): Booking[] {
    return this.bookings().filter(b => b.userId === userId);
  }

  updateStatus(id: string, estado: Booking['estado']): void {
    this.bookings.set(this.bookings().map(b => b.id === id ? { ...b, estado } : b));
  }

  cancelar(id: string): void {
    this.updateStatus(id, 'cancelado');
  }

  pagar(id: string): void {
    this.updateStatus(id, 'pagado');
  }
}
