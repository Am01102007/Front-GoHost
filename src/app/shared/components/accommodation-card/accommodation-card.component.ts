import { Component, Input, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listing } from '../../../core/models/listing.model';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';

/**
 * Componente de tarjeta de alojamiento reutilizable.
 * 
 * Características principales:
 * - Visualización optimizada de información del alojamiento
 * - Gestión reactiva de favoritos
 * - Acciones de anfitrión (editar/eliminar) con confirmación
 * - Diseño responsive y accesible
 * - Estados de carga y error manejados
 * - Optimización de rendimiento con computed properties
 * 
 * @author Sistema de Alojamientos
 * @version 2.0.0
 */
@Component({
  selector: 'app-accommodation-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accommodation-card.component.html',
  styleUrls: ['./accommodation-card.component.scss']
})
export class AccommodationCardComponent {
  @Input() listing!: Listing;
  @Input() hostView: boolean = false;
  
  // Servicios inyectados
  private readonly listingsService = inject(ListingsService);
  private readonly notifications = inject(NotificationsService);
  
  // Estado interno del componente
  private readonly isProcessing = signal(false);
  
  // Computed properties reactivas
  /**
   * Determina si el alojamiento está marcado como favorito
   */
  readonly favorite = computed(() => 
    this.listingsService.favorites().includes(this.listing?.id || '')
  );
  
  /**
   * Estado de carga para operaciones asíncronas
   */
  readonly loading = computed(() => 
    this.isProcessing() || this.listingsService.loading()
  );
  
  /**
   * Información de estadísticas del alojamiento
   */
  readonly stats = computed(() => {
    if (!this.listing) return null;
    
    return {
      rating: this.listing.calificacionPromedio || 0,
      ratingText: (this.listing.calificacionPromedio || 0).toFixed(1),
      hasRating: (this.listing.calificacionPromedio || 0) > 0,
      location: this.formatLocation(),
      amenitiesCount: this.listing.servicios?.length || 0,
      visibleAmenities: this.listing.servicios?.slice(0, 3) || [],
      hiddenAmenitiesCount: Math.max(0, (this.listing.servicios?.length || 0) - 3)
    };
  });

  private formatLocation(): string {
    const u = this.listing?.ubicacion;
    if (!u) return '';
    const parts = [u.ciudad, u.pais].filter(Boolean);
    return parts.join(', ');
  }

  get isFavorite(): boolean {
    return this.favorite();
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.isFavorite) {
      this.listingsService.removeFavorite(this.listing.id);
    } else {
      this.listingsService.addFavorite(this.listing.id);
    }
  }

  deleteListing(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Mostrar confirmación antes de eliminar
    const confirmMessage = `¿Estás seguro de que quieres eliminar "${this.listing.titulo}"?\n\nEsta acción no se puede deshacer y el alojamiento desaparecerá de todas las listas.`;
    
    if (confirm(confirmMessage)) {
      this.listingsService.remove(this.listing.id).subscribe({
        next: () => {
          this.notifications.success(
            'Alojamiento eliminado', 
            `"${this.listing.titulo}" ha sido eliminado correctamente y ya no aparecerá en las búsquedas.`
          );
        },
        error: (err) => {
          console.error('Error deleting listing:', err);
          this.notifications.httpError(err);
        }
      });
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    img.src = '/icons/lodging.svg';
  }
}
