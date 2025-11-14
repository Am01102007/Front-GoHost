import { Component, inject, OnInit, computed, signal, effect, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { CurrencyUserPipe } from '../../../shared/pipes/currency-user.pipe';
import { AccommodationCardComponent } from '../../../shared/components/accommodation-card/accommodation-card.component';
import { NotificationsService } from '../../../core/services/notifications.service';

/**
 * Componente para explorar y buscar alojamientos disponibles.
 * 
 * Características principales:
 * - Búsqueda y filtrado reactivo de alojamientos
 * - Filtros por ciudad, capacidad y servicios
 * - Visualización en tiempo real de resultados
 * - Gestión inteligente de estados de carga
 * - Autocompletado de servicios comunes
 * - Sincronización automática con cambios de datos
 * 
 * @author Sistema de Alojamientos
 * @version 2.0.0
 */
@Component({
  selector: 'app-browse-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, AccommodationCardComponent, CurrencyUserPipe],
  templateUrl: './browse-listings.component.html',
  styleUrls: ['./browse-listings.component.scss']
})
export class BrowseListingsComponent implements OnInit {
  // Servicios inyectados
  private readonly listingsSvc = inject(ListingsService);
  private readonly notifications = inject(NotificationsService);

  // Estado de la UI
  view: 'alojamientos' | 'servicios' = 'alojamientos';
  
  // Signals para filtros reactivos
  readonly ciudad = signal('');
  readonly fechaInicio = signal<string | undefined>(undefined);
  readonly numPersonas = signal<number | undefined>(undefined);
  readonly servicios = signal('');
  readonly hasSearched = signal(false);
  // Estado del desplegable de servicios para mejor usabilidad en móvil/desktop
  readonly servicesOpen = signal(false);
  @ViewChild('servicesContainer') servicesContainer?: ElementRef<HTMLElement>;
  @ViewChild('servicesInput') servicesInput?: ElementRef<HTMLInputElement>;

  // Lista de servicios comunes para autocompletado
  readonly serviciosComunes = [
    'WiFi', 'Piscina', 'Aire acondicionado', 'Cocina', 'Estacionamiento',
    'Gimnasio', 'Spa', 'Desayuno', 'Mascotas permitidas', 'TV por cable',
    'Lavandería', 'Balcón', 'Terraza', 'Jacuzzi', 'Barbacoa'
  ];

  // Computed properties reactivos
  /**
   * Estado de carga del servicio
   */
  readonly loading = computed(() => this.listingsSvc.loading());
  readonly errorMsg = signal<string | null>(null);

  /**
   * Verifica si hay filtros activos
   */
  readonly hasFilters = computed(() => 
    !!(this.ciudad() || this.numPersonas() || this.servicios())
  );

  /**
   * Alojamientos filtrados reactivamente
   */
  readonly filtradas = computed(() => {
    const allListings = this.listingsSvc.activeListings();
    
    // Si no hay filtros, mostrar todos los alojamientos activos
    if (!this.hasFilters()) {
      return allListings;
    }

    let filtered = [...allListings];

    // Filtrar por ciudad
    const ciudadFilter = this.ciudad().trim().toLowerCase();
    if (ciudadFilter) {
      filtered = filtered.filter(listing => 
        listing.ubicacion.ciudad.toLowerCase().includes(ciudadFilter) ||
        listing.ubicacion.pais.toLowerCase().includes(ciudadFilter) ||
        listing.ubicacion.direccion?.toLowerCase().includes(ciudadFilter)
      );
    }

    // Filtrar por capacidad
    const capacidadFilter = this.numPersonas();
    if (capacidadFilter) {
      filtered = filtered.filter(listing => 
        listing.capacidad >= capacidadFilter
      );
    }

    // Filtrar por servicios
    const serviciosFilter = this.servicios().trim();
    if (serviciosFilter) {
      const serviciosArray = serviciosFilter.split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s);
      
      filtered = filtered.filter(listing =>
        serviciosArray.some(servicio =>
          listing.servicios.some(s => 
            s.toLowerCase().includes(servicio)
          )
        )
      );
    }

    return filtered;
  });

  /**
   * Estadísticas de búsqueda
   */
  readonly searchStats = computed(() => ({
    total: this.listingsSvc.activeListings().length,
    filtered: this.filtradas().length,
    hasResults: this.filtradas().length > 0,
    cities: [...new Set(this.filtradas().map(l => l.ubicacion.ciudad))].length,
    averagePrice: this.filtradas().length > 0 
      ? this.filtradas().reduce((sum, l) => sum + l.precioPorNoche, 0) / this.filtradas().length 
      : 0
  }));

  constructor() {
    // Effect para logging de cambios en filtros
    effect(() => {
      const stats = this.searchStats();
      if (this.hasFilters()) {
        console.log(`🔍 Filtros aplicados: ${stats.filtered}/${stats.total} alojamientos`);
      }
    });
  }

  /**
   * Inicialización del componente
   */
  ngOnInit(): void {
    this.initializeData();
  }

  /**
   * Inicializa los datos del componente
   */
  private initializeData(): void {
    console.log('🚀 Inicializando explorador de alojamientos...');
    
    // Cargar alojamientos si no están en caché
    this.listingsSvc.fetchAll().subscribe({
      next: (listings) => {
        console.log(`✅ Alojamientos cargados: ${listings.length} disponibles`);
        this.errorMsg.set(null);
      },
      error: (err) => {
        console.error('❌ Error cargando alojamientos:', err);
        this.errorMsg.set('No se pudieron cargar los alojamientos.');
        this.notifications.error(
          'Error al cargar alojamientos', 
          'No se pudieron cargar los alojamientos disponibles.'
        );
      }
    });
  }

  /**
   * Ejecuta una búsqueda con los filtros actuales
   * Los filtros se aplican reactivamente a través de computed properties
   */
  buscar(): void {
    if (this.loading()) return;

    this.hasSearched.set(true);
    
    const stats = this.searchStats();
    
    if (stats.hasResults) {
      this.notifications.success(
        'Búsqueda completada', 
        `Se encontraron ${stats.filtered} alojamiento(s) en ${stats.cities} ciudad(es).`
      );
    } else {
      this.notifications.info(
        'Sin resultados', 
        'No se encontraron alojamientos que coincidan con tus criterios de búsqueda.'
      );
    }

    console.log(`🔍 Búsqueda ejecutada: ${stats.filtered}/${stats.total} resultados`);
  }

  /**
   * Limpia todos los filtros de búsqueda
   */
  limpiarFiltros(): void {
    if (this.loading()) return;
    
    this.ciudad.set('');
    this.fechaInicio.set(undefined);
    this.numPersonas.set(undefined);
    this.servicios.set('');
    this.hasSearched.set(false);
    
    this.notifications.info(
      'Filtros limpiados', 
      'Se han eliminado todos los filtros de búsqueda.'
    );
    
    console.log('🧹 Filtros limpiados');
  }

  /**
   * Maneja la tecla Enter para ejecutar búsqueda
   */
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.loading()) {
      this.buscar();
    }
  }

  /**
   * Agrega un servicio a la lista de servicios filtrados
   */
  onServicioSelect(servicio: string): void {
    const serviciosActuales = this.servicios();
    
    if (!serviciosActuales) {
      this.servicios.set(servicio);
    } else {
      const serviciosArray = serviciosActuales.split(',').map(s => s.trim());
      if (!serviciosArray.includes(servicio)) {
        this.servicios.set([...serviciosArray, servicio].join(', '));
      }
    }
    
    console.log(`🏷️ Servicio agregado: ${servicio}`);
    // Mantener abierto para seleccionar múltiples servicios y devolver foco al input
    this.servicesOpen.set(true);
    this.servicesInput?.nativeElement.focus();
  }

  /**
   * Actualiza el filtro de ciudad
   */
  updateCiudad(value: string): void {
    this.ciudad.set(value);
  }

  /**
   * Actualiza el filtro de número de personas
   */
  updateNumPersonas(value: number | undefined): void {
    this.numPersonas.set(value);
  }

  /**
   * Actualiza el filtro de servicios
   */
  updateServicios(value: string): void {
    this.servicios.set(value);
  }

  /**
   * Actualiza la fecha de inicio
   */
  updateFechaInicio(value: string | undefined): void {
    this.fechaInicio.set(value);
  }

  /**
   * Controla apertura/cierre del selector de servicios
   */
  openServices(): void {
    this.servicesOpen.set(true);
  }

  closeServices(): void {
    // pequeño retraso para permitir clic en opción sin cerrar antes
    setTimeout(() => this.servicesOpen.set(false), 150);
  }

  // Cierra al hacer clic fuera del contenedor de servicios
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.servicesOpen()) return;
    const target = event.target as Node;
    const container = this.servicesContainer?.nativeElement;
    if (container && !container.contains(target)) {
      this.servicesOpen.set(false);
    }
  }

  // Cierra con tecla Escape
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.servicesOpen()) {
      this.servicesOpen.set(false);
    }
  }

  /**
   * Refresca los datos desde el servidor
   */
  refreshData(): void {
    console.log('🔄 Refrescando datos de alojamientos...');
    
    this.listingsSvc.fetchAll(0, 12, true).subscribe({
      next: (listings) => {
        console.log(`✅ Datos refrescados: ${listings.length} alojamientos`);
        this.errorMsg.set(null);
        this.notifications.success(
          'Datos actualizados', 
          `Se han cargado ${listings.length} alojamientos.`
        );
      },
      error: (err) => {
        console.error('❌ Error refrescando datos:', err);
        this.errorMsg.set('No se pudieron actualizar los datos.');
        this.notifications.error(
          'Error al actualizar', 
          'No se pudieron actualizar los datos.'
        );
      }
    });
  }

  retry(): void {
    if (this.loading()) return;
    this.errorMsg.set(null);
    this.refreshData();
  }
}
