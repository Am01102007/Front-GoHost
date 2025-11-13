export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  fechaInicio: string;
  fechaFin: string;
  huespedes: number;
  total: number;
  estado: 'pendiente' | 'pagado' | 'cancelado';
  /** Opcional: email del huésped si el backend lo expone en la reserva */
  guestEmail?: string;
  /** Opcional: nombre del huésped si el backend lo expone en la reserva */
  guestName?: string;
}
