import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../config';
import { ListingMetrics, HostMetrics } from '../models/metrics.model';

/**
 * Servicio de métricas.
 *
 * Obtiene métricas agregadas y por alojamiento desde el backend y
 * las mapea al modelo usado en la UI.
 */
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private http = inject(HttpClient);
  private readonly API_BASE = API_BASE;

  /** Métricas de un alojamiento específico (requiere rol anfitrión propietario) */
  getListingMetrics(id: string): Observable<ListingMetrics> {
    const url = `${this.API_BASE}/alojamientos/${id}/metricas`;
    return this.http.get<any>(url).pipe(map(this.toListingMetrics));
  }

  /** Métricas agregadas de todos los alojamientos del anfitrión autenticado */
  getHostMetrics(fechaInicio?: string, fechaFin?: string): Observable<HostMetrics> {
    const params: Record<string, string> = {};
    if (fechaInicio) params['fechaInicio'] = fechaInicio;
    if (fechaFin) params['fechaFin'] = fechaFin;
    const url = `${this.API_BASE}/alojamientos/metricas`;
    return this.http.get<any[]>(url, { params }).pipe(map(list => list.map(this.toListingMetrics)));
  }

  private toListingMetrics(dto: any): ListingMetrics {
    return {
      titulo: dto.titulo,
      promedioCalificacion: Number(dto.promedioCalificacion ?? 0),
      totalReservas: Number(dto.totalReservas ?? 0),
      reservasCompletadas: Number(dto.reservasCompletadas ?? 0),
      reservasCanceladas: Number(dto.reservasCanceladas ?? 0),
      ingresosTotales: Number(dto.ingresosTotales ?? 0)
    };
  }
}
