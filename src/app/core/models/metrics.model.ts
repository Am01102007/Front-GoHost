export interface ListingMetrics {
  titulo: string;
  promedioCalificacion: number;
  totalReservas: number;
  reservasCompletadas: number;
  reservasCanceladas: number;
  ingresosTotales: number;
}

export type HostMetrics = ListingMetrics[];

