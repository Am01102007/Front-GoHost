import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, tap } from 'rxjs';
import { NotificationsService } from './notifications.service';

/**
 * Representa una coordenada geográfica en formato longitud/latitud.
 * @property lng Longitud en grados decimales.
 * @property lat Latitud en grados decimales.
 */
type LngLat = { lng: number; lat: number };

/**
 * Servicio de mapas para integrar Mapbox GL y operaciones comunes.
 * 
 * Provee inicialización del mapa, gestión de terreno 3D, geocodificación,
 * trazado de rutas y observación de la ubicación del usuario.
 */
@Injectable({ providedIn: 'root' })
export class MapService {
  private http = inject(HttpClient);
  private notifications = inject(NotificationsService);

  private get isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
  }

  private get w(): any | undefined {
    return typeof window !== 'undefined' ? (window as any) : undefined;
  }

  private get token(): string {
    // Preferir token en localStorage (evita commitear secretos en index.html)
    let t = '';
    try {
      if (this.isBrowser) {
        const ls: any = (globalThis as any).localStorage;
        t = ls?.getItem?.('MAPBOX_TOKEN') || '';
      }
    } catch {}
    // Fallback a window.MAPBOX_TOKEN (útil en dev rápido)
    if (!t) t = this.w?.MAPBOX_TOKEN || '';
    // Mapbox GL requiere tokens públicos (pk.*) en navegador; rechazar secretos (sk.*)
    if (t && t.startsWith('sk.')) {
      try { console.warn('MapService: El token "sk.*" no es válido para Mapbox GL en navegador. Usa un token público "pk.*".'); } catch {}
      return '';
    }
    return t;
  }

  /**
   * Inicializa un mapa de Mapbox en el contenedor indicado.
   * @param containerId ID del contenedor HTML donde se renderiza el mapa.
   * @param center Centro inicial del mapa (opcional).
   * @param opts Opciones de visualización como `zoom`, `pitch`, `bearing` y `style`.
   * @returns Instancia de `mapboxgl.Map` o `null` si no se puede inicializar.
   */
  initMap(containerId: string, center?: LngLat, opts?: { zoom?: number; pitch?: number; bearing?: number; style?: string }): any | null {
    const mapboxgl = this.w?.mapboxgl;
    if (!this.isBrowser || !mapboxgl || !this.token) return null;
    mapboxgl.accessToken = this.token;
    const map = new mapboxgl.Map({
      container: containerId,
      style: opts?.style ?? 'mapbox://styles/mapbox/streets-v12',
      center: center ? [center.lng, center.lat] : undefined,
      zoom: opts?.zoom ?? 12,
      pitch: opts?.pitch ?? 0,
      bearing: opts?.bearing ?? 0
    });
    return map;
  }

  /**
   * Añade un marcador simple en las coordenadas indicadas.
   * @param map Instancia del mapa en la que se añadirá el marcador.
   * @param at Coordenadas de destino del marcador.
   */
  addMarker(map: any, at: LngLat): void {
    const mapboxgl = this.w?.mapboxgl;
    if (!mapboxgl || !map) return;
    new mapboxgl.Marker().setLngLat([at.lng, at.lat]).addTo(map);
  }

  /**
   * Habilita el terreno 3D en el mapa usando la fuente DEM de Mapbox.
   * @param map Instancia del mapa a modificar.
   * @param exaggeration Factor de exageración vertical (por defecto: 1.5).
   */
  enableTerrain(map: any, exaggeration = 1.5): void {
    if (!map) return;
    const apply = () => {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration });
      if (!map.getLayer('sky')) {
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });
      }
      // Edificios 3D
      if (!map.getLayer('3d-buildings')) {
        const layers = map.getStyle()?.layers || [];
        const labelLayerId = (layers.find((l: any) => l.type === 'symbol' && l.layout && l.layout['text-field']) || {}).id;
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6
          }
        }, labelLayerId);
      }
    };
    if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
      map.once('style.load', apply);
    } else {
      apply();
    }
  }

  /**
   * Geocodifica una consulta (dirección/ciudad) a coordenadas geográficas.
   * @param query Texto a geocodificar (ej. "Calle de Alcalá, Madrid").
   * @returns Observable que emite `LngLat` o `null` si no hay resultados.
   */
  geocode(query: string): Observable<LngLat | null> {
    if (!this.token) return of(null);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${this.token}`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        const f = res?.features?.[0];
        if (!f?.center) return null;
        return { lng: Number(f.center[0]), lat: Number(f.center[1]) } as LngLat;
      })
    );
  }

  /**
   * Dibuja una ruta entre dos puntos usando la Directions API de Mapbox.
   * @param map Instancia del mapa a actualizar.
   * @param from Origen de la ruta.
   * @param to Destino de la ruta.
   * @returns Observable que completa tras actualizar la capa de ruta.
   */
  private lastRouteTs = 0;
  private readonly routeCooldownMs = 3000;

  drawRoute(map: any, from: LngLat, to: LngLat): Observable<void> {
    if (!this.token) return of(void 0);
    const now = Date.now();
    if (now - this.lastRouteTs < this.routeCooldownMs) return of(void 0);
    this.lastRouteTs = now;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&alternatives=false&access_token=${this.token}`;
    return this.http.get<any>(url).pipe(
      tap((res: any) => {
        const geometry = res?.routes?.[0]?.geometry;
        if (!geometry) {
          this.notifications.info('No se pudo generar la ruta', 'Verifica la ubicación de origen y destino.');
          return;
        }
        const geojson = { type: 'Feature', properties: {}, geometry };
        const sourceId = 'route';
        const apply = () => {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: geojson });
            map.addLayer({
              id: 'route-line',
              type: 'line',
              source: sourceId,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#3b82f6', 'line-width': 4 }
            });
          } else {
            const src = map.getSource(sourceId);
            src.setData(geojson);
          }
          // Ajustar vista a la ruta
          try {
            const coords = geometry.coordinates as number[][];
            const bounds = new (this.w?.mapboxgl?.LngLatBounds || (class { constructor(){} extend(){} }))();
            if (bounds.extend) {
              for (const c of coords) bounds.extend(c as any);
              map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 600 });
            }
          } catch {}
        };
        if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
          map.once('style.load', apply);
        } else if (!map.loaded || (typeof map.loaded === 'function' && !map.loaded())) {
          map.once('load', apply);
        } else {
          apply();
        }
      }),
      catchError((err) => {
        this.notifications.httpError(err);
        return of(void 0);
      })
    );
  }

  /**
   * Observa la ubicación del usuario en tiempo real mediante Geolocation API.
   * @param onChange Callback invocado con la posición actualizada del usuario.
   * @param onError Callback para notificar errores o falta de permisos.
   * @returns Función para detener la observación.
   * @throws Puede lanzar errores del navegador si Geolocation no está disponible.
   * @example
   * const stop = mapService.watchUserLocation(pos => console.log(pos));
   * // ... posteriormente
   * stop();
   */
  watchUserLocation(onChange: (pos: LngLat) => void, onError?: () => void): () => void {
    if (!this.isBrowser || !navigator?.geolocation) {
      onError?.();
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (p) => onChange({ lng: p.coords.longitude, lat: p.coords.latitude }),
      () => { try { onError?.(); } catch {} },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }
}
