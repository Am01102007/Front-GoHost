export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  fechaInicio: string;
  fechaFin: string;
  huespedes: number;
  total: number;
  estado: 'pendiente' | 'pagado' | 'cancelado';
}
