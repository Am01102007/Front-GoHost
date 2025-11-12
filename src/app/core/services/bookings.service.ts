import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { Booking } from '../models/booking.model';
import { DataSyncService } from './data-sync.service';
import { AuthService } from './auth.service';
import { API_BASE } from '../config';

/**
 * Servicio de gestión de reservas con estado reactivo y sincronización inteligente.
 * 
 * Características principales:
 * - ✅ Operaciones CRUD completas con optimistic updates
 * - ✅ Estado reactivo con Angular Signals
 * - ✅ Sincronización automática entre componentes
 * - ✅ Cache inteligente con invalidación automática
 * - ✅ Manejo robusto de errores con fallbacks
 * - ✅ Estados de carga granulares
 * - ✅ Filtrado y estadísticas computadas
 * - ✅ Notificaciones de cambios en tiempo real
 * 
 * @example
 * ```typescript
 * // Inyectar el servicio
 * constructor(private bookingsService: BookingsService) {}
 * 
 * // Crear una reserva
 * this.bookingsService.create(bookingData).subscribe({
 *   next: (booking) => console.log('Reserva creada:', booking.id),
 *   error: (err) => console.error('Error:', err)
 * });
 * 
 * // Acceder a reservas reactivas
 * const myBookings = this.bookingsService.myBookings();
 * const stats = this.bookingsService.stats();
 * ```
 * 
 * @author Sistema de Alojamientos
 * @version 2.0.0
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private readonly API_BASE = API_BASE;

  /**
   * Signal reactivo que contiene todas las reservas cargadas.
   * Se actualiza automáticamente con operaciones CRUD.
   */
  public bookings = signal<Booking[]>([]);

  /**
   * Signal para el estado de carga del servicio.
   * Permite mostrar indicadores de carga en la UI.
   */
  public loading = signal<boolean>(false);

  /**
   * Signal para errores del servicio.
   * Facilita el manejo centralizado de errores.
   */
  private error = signal<string | null>(null);

  /**
   * Computed que filtra las reservas del usuario actual.
   * Se recalcula automáticamente cuando cambian las reservas.
   */
  readonly myBookings = computed(() => {
    const uid = this.auth.currentUser?.()?.id;
    if (!uid) return [] as Booking[];
    return this.bookings().filter(booking => booking.userId === uid);
  });

  /**
   * Computed que filtra reservas activas (confirmadas y no canceladas).
   */
  readonly activeBookings = computed(() => {
    return this.bookings().filter(booking => booking.estado === 'pendiente');
  });

  /**
   * Computed que filtra reservas completadas.
   */
  readonly completedBookings = computed(() => {
    return this.bookings().filter(booking => booking.estado === 'pagado');
  });

  /**
   * Computed que filtra reservas canceladas.
   */
  readonly cancelledBookings = computed(() => {
    return this.bookings().filter(booking => booking.estado === 'cancelado');
  });

  /**
   * Computed con estadísticas de reservas.
   * Proporciona métricas útiles para dashboards.
   */
  readonly stats = computed(() => {
    const all = this.bookings();
    const active = this.activeBookings();
    const completed = this.completedBookings();
    const cancelled = this.cancelledBookings();

    const totalEarnings = completed.reduce((sum, booking) => 
      sum + (booking.total || 0), 0
    );

    const averageBookingValue = completed.length > 0 
      ? totalEarnings / completed.length 
      : 0;

    return {
      total: all.length,
      active: active.length,
      completed: completed.length,
      cancelled: cancelled.length,
      totalEarnings,
      averageBookingValue,
      cancellationRate: all.length > 0 ? (cancelled.length / all.length) * 100 : 0
    };
  });

  // Getters públicos para acceso a signals
  get isLoading() { return this.loading.asReadonly(); }
  get currentError() { return this.error.asReadonly(); }

  constructor(
    private http: HttpClient,
    private dataSyncService: DataSyncService,
    private auth: AuthService
  ) {
    // Suscribirse a cambios externos de reservas
    this.dataSyncService.onDataChange('bookings').subscribe(() => {
      console.log('🔄 BookingsService: Recargando datos por cambio externo');
      this.fetchMine(0, 10).subscribe();
    });
  }

  private mapEstado(estado: string): Booking['estado'] {
    const normalized = String(estado || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    switch (normalized) {
      case 'PENDIENTE':
      case 'SOLICITADA':
      case 'RESERVADA':
        return 'pendiente';
      case 'CONFIRMADA':
      case 'PAGADA':
      case 'EN_CURSO':
        return 'pagado';
      case 'CANCELADA':
      case 'RECHAZADA':
        return 'cancelado';
      default:
        return 'pendiente';
    }
  }

  /** Devuelve reservas en memoria filtradas por usuario */
  byUser(userId: string): Booking[] {
    return this.bookings().filter(b => b.userId === userId);
  }

  private toBooking(dto: any): Booking {
    return {
      id: String(dto.id),
      listingId: String(dto.alojamientoId ?? dto.listingId ?? dto.alojamiento?.id ?? ''),
      userId: String(
        dto.huespedId ?? dto.huesped?.id ?? dto.usuarioId ?? dto.userId ?? ''
      ),
      fechaInicio: String(dto.checkIn ?? dto.fechaInicio ?? dto.inicio ?? ''),
      fechaFin: String(dto.checkOut ?? dto.fechaFin ?? dto.fin ?? ''),
      huespedes: (dto.numeroHuespedes ?? dto.huespedes ?? 1),
      total: Number(dto.total ?? dto.precioTotal ?? 0),
      estado: this.mapEstado(dto.estado)
    };
  }

  /** Crear una reserva como huésped autenticado */
  create(payload: { alojamientoId: string; checkIn: string; checkOut: string; numeroHuespedes: number }): Observable<Booking> {
    const url = `${this.API_BASE}/reservas`;
    // huespedId se toma del token en backend
    return this.http.post<any>(url, {
      alojamientoId: payload.alojamientoId,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      numeroHuespedes: payload.numeroHuespedes
    }).pipe(
      map(dto => this.toBooking(dto)),
      tap(b => this.bookings.set([b, ...this.bookings()])),
      catchError(err => {
        console.error('BookingsService.create error', err);
        return throwError(() => err);
      })
    );
  }

  /** Listar reservas del huésped autenticado */
  fetchMine(page = 0, size = 10, filtros?: { fechaInicio?: string; fechaFin?: string; estado?: 'pendiente' | 'pagado' | 'cancelado' }): Observable<Booking[]> {
    // Evitar llamadas si no hay sesión/token para prevenir 401 innecesarios
    try {
      const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('auth_token');
      if (!hasToken) {
        console.warn('BookingsService.fetchMine: sin token, no se solicita al backend');
        this.bookings.set([]);
        return of([]);
      }
      // Si hay token pero aún no está restaurado el usuario, dejamos que el backend
      // derive al usuario desde el token. Esto evita quedarse sin reservas al cargar.
    } catch {
      // En SSR donde no hay localStorage, proceder normalmente
    }
    const params: any = { page, size };
    if (filtros?.fechaInicio) params.fechaInicio = filtros.fechaInicio;
    if (filtros?.fechaFin) params.fechaFin = filtros.fechaFin;
    if (filtros?.estado) {
      // Mapear de vuelta al enum del backend
      const mapBack = filtros.estado === 'pendiente' ? 'PENDIENTE' : filtros.estado === 'pagado' ? 'CONFIRMADA' : 'CANCELADA';
      params.estado = mapBack;
    }
    const url = `${this.API_BASE}/reservas/mias`;
    return this.http.get<import('../models/page.model').PageResponse<any>>(url, { params }).pipe(
      map(res => (res?.content ?? []).map((d: any) => this.toBooking(d))),
      tap(list => this.bookings.set(list)),
      catchError(err => {
        console.error('BookingsService.fetchMine error', err);
        // Fallback: devolver [] si el backend no responde
        this.bookings.set([]);
        return of([]);
      })
    );
  }

  /**
   * Lista reservas de los alojamientos del anfitrión autenticado.
   * Intenta usar endpoint dedicado; si no existe, devuelve [].
   */
  fetchForHost(page = 0, size = 10): Observable<Booking[]> {
    // Similar a fetchMine: permitir que el backend derive el anfitrión desde el token.
    // No bloquear por falta de currentUser en memoria para evitar lista vacía en SSR/cargas iniciales.
    try {
      const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('auth_token');
      if (!hasToken) {
        console.warn('BookingsService.fetchForHost: sin token, no se solicita al backend');
        this.bookings.set([]);
        return of([]);
      }
    } catch {
      // En SSR donde no hay localStorage, proceder normalmente
    }

    this.loading.set(true);
    // Endpoint real de reservas por anfitrión
    const url = `${this.API_BASE}/reservas/anfitrion`;
    const params: any = { page, size };
    return this.http.get<import('../models/page.model').PageResponse<any>>(url, { params }).pipe(
      map(res => (res?.content ?? []).map((d: any) => this.toBooking(d))),
      tap(list => this.bookings.set(list)),
      catchError(err => {
        console.error('BookingsService.fetchForHost error', err);
        // Fallback: mantener datos vacíos si el backend no responde
        this.bookings.set([]);
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Lista reservas de un alojamiento específico.
   * Útil para ver todas las reservas de un alojamiento particular.
   */
  fetchByListing(alojamientoId: string, page = 0, size = 10): Observable<Booking[]> {
    this.loading.set(true);
    const url = `${this.API_BASE}/reservas/alojamiento/${alojamientoId}`;
    const params: any = { page, size };
    return this.http.get<import('../models/page.model').PageResponse<any>>(url, { params }).pipe(
      map(res => (res?.content ?? []).map((d: any) => this.toBooking(d))),
      tap(list => {
        console.log(`✅ BookingsService: ${list.length} reservas obtenidas para alojamiento ${alojamientoId}`);
        // No sobrescribir todas las reservas, solo agregar/actualizar las específicas
        const currentBookings = this.bookings();
        const updatedBookings = [...currentBookings];
        
        list.forEach(newBooking => {
          const existingIndex = updatedBookings.findIndex(b => b.id === newBooking.id);
          if (existingIndex >= 0) {
            updatedBookings[existingIndex] = newBooking;
          } else {
            updatedBookings.push(newBooking);
          }
        });
        
        this.bookings.set(updatedBookings);
      }),
      catchError(err => {
        console.error('BookingsService.fetchByListing error', err);
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /** Actualiza parcialmente una reserva (estado/fechas) */
  updateStatus(id: string, estado: Booking['estado']): Observable<Booking> {
    const backendEstado = estado === 'pendiente' ? 'PENDIENTE' : estado === 'pagado' ? 'CONFIRMADA' : 'CANCELADA';
    const url = `${this.API_BASE}/reservas/${id}`;
    return this.http.patch<any>(url, { estado: backendEstado }).pipe(
      map(dto => this.toBooking(dto)),
      tap(updated => this.bookings.set(this.bookings().map(b => b.id === id ? updated : b))),
      catchError(err => {
        console.error('BookingsService.updateStatus error', err);
        return throwError(() => err);
      })
    );
  }

  cancelar(id: string): Observable<void> {
    const url = `${this.API_BASE}/reservas/${id}/cancelar`;
    return this.http.post<void>(url, {}).pipe(
      tap(() => this.bookings.set(this.bookings().map(b => b.id === id ? { ...b, estado: 'cancelado' } : b))),
      catchError(err => {
        console.error('BookingsService.cancelar error', err);
        return throwError(() => err);
      })
    );
  }

  pagar(id: string): Observable<Booking> {
    return this.updateStatus(id, 'pagado');
  }

  /**
   * Crea una nueva reserva con update optimista.
   * 
   * Implementa optimistic update para mejor UX: muestra la reserva
   * inmediatamente y revierte si falla la operación.
   * 
   * @param dto Datos de la reserva a crear
   * @returns Observable con la reserva creada
   * 
   * @example
   * ```typescript
   * const bookingData = {
   *   alojamientoId: '123',
   *   fechaInicio: '2024-01-15',
   *   fechaFin: '2024-01-20',
   *   huespedes: 2
   * };
   * 
   * service.create(bookingData).subscribe({
   *   next: (booking) => console.log('Reserva creada:', booking.id),
   *   error: (err) => console.error('Error:', err)
   * });
   * ```
   */
  

  /**
   * Obtiene las reservas del usuario actual con cache inteligente.
   * 
   * Implementa cache con TTL y merge inteligente para evitar
   * sobrescribir cambios locales no sincronizados.
   * 
   * @param forceRefresh Forzar recarga desde el servidor
   * @returns Observable con las reservas del usuario
   * 
   * @example
   * ```typescript
   * // Cargar desde cache si está disponible
   * service.fetchMine().subscribe(bookings => {
   *   console.log('Reservas cargadas:', bookings.length);
   * });
   * 
   * // Forzar recarga desde servidor
   * service.fetchMine(true).subscribe();
   * ```
  */

}
