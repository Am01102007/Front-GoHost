import { Component, inject, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ListingsService } from '../../../core/services/listings.service';
import { CommentsSectionComponent } from '../../../shared/components/comments-section/comments-section.component';
import { MapService } from '../../../core/services/map.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, CommentsSectionComponent, RouterLink],
  templateUrl: './listing-detail.component.html',
  styleUrls: ['./listing-detail.component.scss']
})
export class ListingDetailComponent implements OnInit, AfterViewInit {
  /** Servicio de rutas y parámetros de la URL */
  route = inject(ActivatedRoute);
  /** Servicio de alojamientos (carga y cache local) */
  listingsSvc = inject(ListingsService);
  /** Servicio de mapas (Mapbox GL) */
  mapSvc = inject(MapService);
  /** Servicio de notificaciones UI */
  notifications = inject(NotificationsService);
  /** Servicio de autenticación para control de roles */
  auth = inject(AuthService);
  /** Alojamiento a mostrar; puede resolver por ruta o por ID */
  listing = (this.route.snapshot.data['listing'] as any) || this.listingsSvc.getById(this.route.snapshot.params['id']);
  private map: any | null = null;
  private stopWatch: (() => void) | null = null;
  private userMarker: any | null = null;
  /** Última posición del usuario detectada para trazar rutas */
  userOrigin: { lng: number; lat: number } | null = null;
  routeEnabled = false;
  terrainEnabled = false;
  @ViewChild('commentsRef') commentsRef?: CommentsSectionComponent;

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!this.listing) {
      this.listingsSvc.fetchById(id).subscribe({
        next: (l) => {
          this.listing = l;
          this.initMap();
        },
        error: (err) => {
          console.warn('No se pudo cargar el alojamiento del backend, usando datos mock:', err);
          // Usar datos mock cuando falla la carga del backend
          this.listing = this.getMockListing(id);
          this.initMap();
        }
      });
    } else {
      this.initMap();
    }
  }

  ngAfterViewInit(): void {
    // Abrir comentarios automáticamente si viene indicado por query param
    try {
      const qp = this.route.snapshot.queryParamMap;
      const shouldOpen = qp.get('openComments');
      if (shouldOpen && this.commentsRef) {
        // Pequeño delay para asegurar que el componente está listo
        setTimeout(() => this.commentsRef!.toggle(), 0);
      }
    } catch {}
  }

  /**
   * Genera datos mock para testing cuando el backend no está disponible
   */
  private getMockListing(id: string): any {
    return {
      id: id,
      titulo: 'Alojamiento de Ejemplo',
      descripcion: 'Hermoso alojamiento en una ubicación privilegiada. Perfecto para relajarse y disfrutar de una experiencia única.',
      ubicacion: {
        direccion: 'Calle Principal 123',
        ciudad: 'Bogotá',
        pais: 'Colombia',
        lat: 4.7110,
        lng: -74.0721
      },
      precioPorNoche: 120,
      imagenes: ['https://picsum.photos/600/400?random=1'],
      servicios: ['WiFi', 'Piscina', 'Aire acondicionado'],
      calificacionPromedio: 4.5,
      numeroResenas: 25,
      anfitrionId: 'mock-host',
      anfitrionNombre: 'Anfitrión de Ejemplo',
      capacidad: 4
    };
  }

  /**
   * Inicializa el mapa centrado en la ubicación del alojamiento.
   * Si no hay coordenadas, geocodifica la dirección textual.
   */
  private initMap() {
    if (!this.listing) return;
    const hasCoords = !!this.listing.ubicacion.lat && !!this.listing.ubicacion.lng;
    const setupMap = (centerLngLat: { lng: number; lat: number }) => {
      this.map = this.mapSvc.initMap('map', centerLngLat, { zoom: 12, style: 'mapbox://styles/mapbox/streets-v12' });
      if (!this.map) return;
      this.map.on('load', () => {
        this.mapSvc.addMarker(this.map!, centerLngLat);
      });
    };
    if (hasCoords) {
      setupMap({ lng: this.listing.ubicacion.lng!, lat: this.listing.ubicacion.lat! });
    } else {
      const q = [this.listing.ubicacion.direccion, this.listing.ubicacion.ciudad, this.listing.ubicacion.pais]
        .filter(Boolean)
        .join(', ') || this.listing.titulo;
      this.mapSvc.geocode(q).subscribe(pos => {
        if (!pos) return;
        this.listing!.ubicacion.lat = pos.lat;
        this.listing!.ubicacion.lng = pos.lng;
        setupMap(pos);
      });
    }
  }

  /**
   * Activa o desactiva el trazado de ruta desde la ubicación del usuario
   * hasta el alojamiento actual, mostrando además un marcador rojo para el
   * origen del usuario.
   */
  toggleRoute() {
    if (!this.listing?.ubicacion.lat || !this.listing?.ubicacion.lng || !this.map) return;
    this.routeEnabled = !this.routeEnabled;
    if (this.routeEnabled) {
      this.stopWatch = this.mapSvc.watchUserLocation(pos => {
        this.userOrigin = pos;
        try {
          const mgl: any = (globalThis as any).mapboxgl;
          if (mgl) {
            if (!this.userMarker) {
              this.userMarker = new mgl.Marker({ color: '#ef4444' }).setLngLat([pos.lng, pos.lat]).addTo(this.map!);
            } else {
              this.userMarker.setLngLat([pos.lng, pos.lat]);
            }
          }
        } catch {}
        this.mapSvc.drawRoute(this.map!, pos, { lng: this.listing!.ubicacion!.lng!, lat: this.listing!.ubicacion!.lat! }).subscribe();
      }, () => {
        console.warn('No se pudo obtener la ubicación del usuario.');
        this.routeEnabled = false;
        this.notifications.info('Ubicación no disponible', 'Revisa los permisos de geolocalización del navegador.');
      });
    } else {
      if (this.stopWatch) this.stopWatch();
      this.stopWatch = null;
      // Limpia marcador de usuario
      try { this.userMarker?.remove?.(); } catch {}
      this.userMarker = null;
      this.userOrigin = null;
    }
  }

  /**
   * Alterna la visualización 3D del mapa (terreno DEM, pitch y bearing).
   */
  toggle3D() {
    if (!this.map) return;
    this.terrainEnabled = !this.terrainEnabled;
    if (this.terrainEnabled) {
      this.mapSvc.enableTerrain(this.map!, 1.5);
      this.map!.setPitch(60);
      this.map!.setBearing(20);
    } else {
      this.map!.setTerrain(undefined);
      this.map!.setPitch(0);
      this.map!.setBearing(0);
    }
  }

  /**
   * Redondea un número a entero.
   * @param n Número a redondear
   * @returns Entero redondeado
   */
  round(n: number): number {
    return Math.round(n);
  }

  onImgError(event: Event, main = false): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    img.src = main ? 'https://picsum.photos/600/400' : '/icons/lodging.svg';
  }
}
