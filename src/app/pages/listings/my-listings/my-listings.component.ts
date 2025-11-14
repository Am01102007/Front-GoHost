import { Component, inject, OnInit, OnDestroy, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ListingsService } from '../../../core/services/listings.service';
import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { AccommodationCardComponent } from '../../../shared/components/accommodation-card/accommodation-card.component';
import { Subscription } from 'rxjs';
import { Listing } from '../../../core/models/listing.model';

/**
 * Componente para mostrar y gestionar los alojamientos del anfitrión actual.
 * 
 * Características principales:
 * - Visualización reactiva de alojamientos propios
 * - Estadísticas en tiempo real (reservas, ingresos, calificaciones)
 * - Sincronización automática con cambios de datos
 * - Optimización de rendimiento con computed properties
 * - Gestión inteligente de estados de carga
 * - Fallbacks robustos para conectividad
 * 
 * @author Sistema de Alojamientos
 * @version 2.0.0
 */
@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, AccommodationCardComponent, RouterLink],
  templateUrl: './my-listings.component.html',
  styleUrls: ['./my-listings.component.scss']
})
export class MyListingsComponent implements OnInit, OnDestroy {
  // Servicios inyectados
  private readonly listingsSvc = inject(ListingsService);
  private readonly auth = inject(AuthService);
  private readonly bookingsSvc = inject(BookingsService);
  
  // Estado de la UI
  viewMode: 'grid' | 'list' = 'grid';
  private subscriptions: Subscription[] = [];
  // Reservas del anfitrión (fuente real desde backend, sin datos ficticios)
  private readonly hostBookings = signal<import('../../../core/models/booking.model').Booking[]>([]);
  
  // Signals reactivos para el estado del componente
  private readonly refreshTrigger = signal(0);
  
  // Computed properties que se actualizan automáticamente
  /**
   * Alojamientos del anfitrión actual, filtrados reactivamente
   */
  readonly myListings = computed(() => {
    // Trigger para forzar recálculo cuando sea necesario
    this.refreshTrigger();
    
    // Como usamos el endpoint dedicado /api/alojamientos/anfitrion,
    // el servicio ya carga únicamente los alojamientos del anfitrión actual.
    // No filtramos por anfitrionId para evitar desajustes de mapeo (id/email).
    return this.listingsSvc.listings();
  });
  
  /**
   * Estado de carga combinado de listings y bookings
   */
  readonly loading = computed(() => 
    this.listingsSvc.loading() || this.bookingsSvc.loading()
  );
  readonly errorMsg = signal<string | null>(null);
  
  /**
   * Total de reservas para los alojamientos del anfitrión
   */
  readonly totalBookings = computed(() => {
    const myListingIds = this.myListings().map(l => l.id);
    const source = this.hostBookings();
    return source.filter(b => 
      myListingIds.includes(b.listingId)
    ).length;
  });
  
  /**
   * Ingresos totales de reservas pagadas
   */
  readonly totalEarnings = computed(() => {
    const myListingIds = this.myListings().map(l => l.id);
    const paidBookings = this.hostBookings().filter(b => 
      myListingIds.includes(b.listingId) && b.estado === 'pagado'
    );
    
    return paidBookings.reduce((total, booking) => {
      const listing = this.myListings().find(l => l.id === booking.listingId);
      return total + (listing?.precioPorNoche || 0);
    }, 0);
  });
  
  /**
   * Calificación promedio de todos los alojamientos
   */
  readonly averageRating = computed(() => {
    const ratings = this.myListings()
      .map(l => l.calificacionPromedio || 0)
      .filter(r => r > 0);
    
    return ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;
  });
  
  /**
   * Estadísticas adicionales del dashboard
   */
  readonly stats = computed(() => ({
    totalListings: this.myListings().length,
    activeListings: this.myListings().filter(l => this.isListingActive(l)).length,
    totalBookings: this.totalBookings(),
    totalEarnings: this.totalEarnings(),
    averageRating: this.averageRating(),
    occupancyRate: this.calculateOccupancyRate()
  }));
  
  constructor() {
    // Effect para logging de cambios en los datos
    effect(() => {
      const listings = this.myListings();
      const bookings = this.totalBookings();
      console.log(`📊 Dashboard actualizado: ${listings.length} alojamientos, ${bookings} reservas`);
    });
  }

  /**
   * Inicialización del componente
   * Carga los datos iniciales de forma optimizada
   */
  ngOnInit(): void {
    this.initializeData();
  }

  /**
   * Limpieza al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Inicializa los datos del componente de forma optimizada
   * Utiliza los servicios reactivos mejorados
   */
  private initializeData(): void {
    const currentUser = this.auth.currentUser();
    if (!currentUser?.id) {
      console.warn('⚠️ No hay usuario autenticado para cargar alojamientos');
      return;
    }

    console.log('🚀 Inicializando dashboard del anfitrión...');

    // Cargar alojamientos del anfitrión usando endpoint dedicado
    const sub1 = this.listingsSvc.fetchForHost().subscribe({
      next: (listings) => {
        console.log(`✅ Alojamientos cargados: ${listings.length} total, ${this.myListings().length} míos`);
        this.errorMsg.set(null);
      },
      error: (err) => {
        console.error('❌ Error cargando alojamientos:', err);
        this.errorMsg.set('No se pudieron cargar tus alojamientos.');
      }
    });

    // Cargar reservas de los alojamientos del anfitrión
    const sub2 = this.bookingsSvc.fetchForHost().subscribe({
      next: (bookings) => {
        console.log(`✅ Reservas cargadas: ${bookings.length} total`);
        // Persistir en signal local para evitar interferencias de otras vistas
        this.hostBookings.set(bookings);
        this.errorMsg.set(null);
      },
      error: (err) => {
        console.error('❌ Error cargando reservas:', err);
        this.hostBookings.set([]);
        this.errorMsg.set('No se pudieron cargar tus reservas.');
      }
    });

    this.subscriptions.push(sub1, sub2);
  }

  /**
   * Calcula la tasa de ocupación promedio
   * @returns Porcentaje de ocupación (0-100)
   */
  private calculateOccupancyRate(): number {
    const myListings = this.myListings();
    if (myListings.length === 0) return 0;

    const myListingIds = myListings.map(l => l.id);
    const activeBookings = this.hostBookings().filter(b => 
      myListingIds.includes(b.listingId)
    );

    // Cálculo simplificado: reservas activas / total de alojamientos * 100
    return myListings.length > 0 ? (activeBookings.length / myListings.length) * 100 : 0;
  }

  /**
   * Getter para compatibilidad con el template
   * @deprecated Usar myListings() directamente
   */
  get mine(): Listing[] {
    return this.myListings();
  }

  /**
   * Refresca manualmente todos los datos
   * Fuerza una recarga desde el servidor
   */
  refreshListings(): void {
    console.log('🔄 Refrescando datos del dashboard...');
    
    // Forzar recálculo de computed properties
    this.refreshTrigger.update(v => v + 1);
    
    // Recargar datos desde el servidor
    const sub1 = this.listingsSvc.fetchForHost(0, 12).subscribe({
      next: () => console.log('✅ Alojamientos refrescados'),
      error: (err) => { console.error('❌ Error refrescando alojamientos:', err); this.errorMsg.set('No se pudieron refrescar tus alojamientos.'); }
    });

    const sub2 = this.bookingsSvc.fetchForHost().subscribe({
      next: () => console.log('✅ Reservas refrescadas'),
      error: (err) => { console.error('❌ Error refrescando reservas:', err); this.errorMsg.set('No se pudieron refrescar tus reservas.'); }
    });

    this.subscriptions.push(sub1, sub2);
  }

  /**
   * Método de diagnóstico para probar la conectividad del backend
   * Útil para debugging y verificación de endpoints
   */
  testBackendConnection(): void {
    console.log('🧪 Ejecutando diagnóstico de conectividad...');
    
    // Test de listings
    const sub1 = this.listingsSvc.fetchForHost(0, 12).subscribe({
      next: (listings) => {
        console.log(`✅ Listings API (host): ${listings.length} alojamientos obtenidos`);
        console.log('📡 Endpoint: GET /api/alojamientos/anfitrion');
        
        if (listings.length > 0) {
          const testId = listings[0].id;
          console.log(`🎯 ID de prueba disponible: ${testId}`);
          console.log(`🔗 Endpoints disponibles para testing:`);
          console.log(`   - GET /api/alojamientos/${testId}`);
          console.log(`   - PUT /api/alojamientos/${testId}`);
          console.log(`   - DELETE /api/alojamientos/${testId}`);
        }
      },
      error: (err) => {
        console.error('❌ Listings API (host) falló:', err);
        console.error(`📡 Status: ${err.status}, Message: ${err.message}`);
      }
    });

    // Test de bookings
    const sub2 = this.bookingsSvc.fetchForHost().subscribe({
      next: (bookings) => {
        console.log(`✅ Bookings API: ${bookings.length} reservas obtenidas`);
        console.log('📡 Endpoint: GET /api/reservas/anfitrion');
      },
      error: (err) => {
        console.error('❌ Bookings API falló:', err);
        console.error(`📡 Status: ${err.status}, Message: ${err.message}`);
      }
    });

    this.subscriptions.push(sub1, sub2);
  }

  /** Determina si un alojamiento está activo según su disponibilidad */
  private isListingActive(l: Listing): boolean {
    const now = new Date();
    const start = l.disponibleDesde ? new Date(l.disponibleDesde) : undefined;
    const end = l.disponibleHasta ? new Date(l.disponibleHasta) : undefined;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }
  retry(): void {
    if (this.loading()) return;
    this.errorMsg.set(null);
    this.refreshListings();
  }
}
