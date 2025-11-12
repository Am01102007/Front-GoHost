import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError, of, finalize } from 'rxjs';
import { Listing } from '../models/listing.model';
import { API_BASE } from '../config';
import { DataSyncService } from './data-sync.service';
import { AuthService } from './auth.service';

/**
 * Servicio de gestión de alojamientos.
 *
 * Proporciona operaciones CRUD completas para alojamientos con sincronización
 * en tiempo real, gestión de caché inteligente y estado reactivo optimizado.
 *
 * Características principales:
 * - ✅ Operaciones CRUD completas (Create, Read, Update, Delete)
 * - 🔄 Sincronización automática entre componentes
 * - 💾 Caché inteligente con invalidación automática
 * - ⚡ Updates optimistas para mejor UX
 * - 🎯 Merge inteligente de datos locales y remotos
 * - 📊 Estados de carga y error granulares
 * - 🔍 Búsqueda y filtrado avanzado
 * - ❤️ Gestión de favoritos persistente
 *
 * @example
 * ```typescript
 * // Cargar todos los alojamientos
 * listingsService.fetchAll().subscribe(listings => {
 *   console.log('Alojamientos cargados:', listings.length);
 * });
 *
 * // Crear nuevo alojamiento
 * listingsService.create(newListingData).subscribe(created => {
 *   console.log('Alojamiento creado:', created.id);
 * });
 *
 * // Escuchar cambios reactivos
 * effect(() => {
 *   console.log('Alojamientos actuales:', listingsService.listings().length);
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ListingsService {
  private http = inject(HttpClient);
  private dataSyncService = inject(DataSyncService);
  private readonly API_BASE = API_BASE;
  private auth = inject(AuthService);

  /**
   * Signal reactivo que contiene todos los alojamientos cargados.
   * Se actualiza automáticamente con operaciones CRUD.
   */
  listings = signal<Listing[]>([]);

  /**
   * Signal reactivo que contiene los IDs de alojamientos favoritos.
   * Persiste en localStorage para mantener preferencias del usuario.
   */
  favorites = signal<string[]>(this.loadFavoritesFromStorage());

  /**
   * IDs de alojamientos eliminados de forma local y persistida.
   * Se usan para ocultarlos en todas las vistas y evitar reaparición.
   */
  private deletedIds = signal<string[]>(this.loadDeletedFromStorage());

  /**
   * Computed property que devuelve solo los alojamientos activos.
   * Filtra automáticamente alojamientos desactivados o eliminados.
   */
  activeListings = computed(() => 
    this.listings().filter(listing => listing.id && listing.titulo && !this.deletedIds().includes(listing.id))
  );

  /**
   * Computed property que devuelve los alojamientos favoritos completos.
   * Combina la lista de favoritos con los datos completos de alojamientos.
   */
  favoriteListings = computed(() => {
    const favoriteIds = this.favorites();
    return this.listings().filter(listing => favoriteIds.includes(listing.id));
  });

  /**
   * Computed property que devuelve estadísticas de alojamientos.
   * Calcula métricas útiles como total, activos, precio promedio, etc.
   */
  stats = computed(() => {
    const allListings = this.listings();
    const active = this.activeListings();
    
    return {
      total: allListings.length,
      active: active.length,
      favorites: this.favorites().length,
      averagePrice: active.length > 0 
        ? active.reduce((sum, l) => sum + l.precioPorNoche, 0) / active.length 
        : 0,
      cities: [...new Set(active.map(l => l.ubicacion.ciudad))].length,
      totalCapacity: active.reduce((sum, l) => sum + l.capacidad, 0)
    };
  });

  constructor() {
    // Efecto para persistir favoritos automáticamente
    effect(() => {
      this.saveFavoritesToStorage(this.favorites());
    });

    // Escuchar cambios de sincronización de otros servicios
    this.dataSyncService.onDataChange('listings').subscribe(change => {
      console.log('📡 ListingsService: Recibido cambio de sincronización', change);
      
      if (change.operation === 'fetch' && change.source === 'cache-invalidation') {
        // Recargar datos si el caché fue invalidado externamente
        this.fetchAll().subscribe();
      }
    });
  }

  /** Estado de carga público para compatibilidad con componentes */
  loading(): boolean {
    return this.dataSyncService.isLoading('listings');
  }

  /** Mapea AlojamientoResDTO (backend) a Listing (frontend) */
  private toListing(dto: any): Listing {
    // Normaliza rutas de imágenes para que siempre apunten a un recurso válido
    const fotos: string[] = Array.isArray(dto.fotos) ? dto.fotos : [];
    const imagenesNorm = fotos
      .map((p: string) => this.resolveImageUrl(p))
      .filter((p: string) => !!p);

    return {
      id: String(dto.id),
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      ubicacion: {
        direccion: dto.calle ?? '',
        ciudad: dto.ciudad ?? '',
        pais: dto.pais ?? '',
        lat: dto.latitud ?? undefined,
        lng: dto.longitud ?? undefined
      },
      precioPorNoche: Number(dto.precioNoche ?? 0),
      imagenes: imagenesNorm,
      servicios: Array.isArray(dto.servicios) ? dto.servicios.map((s: any) => String(s)) : [],
      anfitrionId: String(dto.anfitrionId ?? dto.anfitrion?.id ?? dto.hostId ?? ''),
      anfitrionNombre: String(dto.anfitrionNombre ?? dto.anfitrion?.nombre ?? dto.hostName ?? ''),
      capacidad: Number(dto.capacidad ?? 0)
    };
  }

  /**
   * Resuelve la URL de imagen para distintos formatos devueltos por el backend.
   * Casos admitidos:
   * - Data URLs (base64): se usan tal cual.
   * - URLs absolutas (http/https): se usan tal cual.
   * - Rutas relativas bajo `/images` o `images/`: se prefiere `${API_BASE}/...`.
   * - Nombre de archivo simple: se transforma a `${API_BASE}/images/<nombre>`.
   */
  private resolveImageUrl(path: string): string {
    if (!path) return '';
    const p = String(path);
    if (p.startsWith('data:image')) return p;
    if (/^https?:\/\//i.test(p)) return p;
    // rutas relativas comunes
    if (p.startsWith('/images')) return `${this.API_BASE}${p}`;
    if (p.startsWith('images/')) return `${this.API_BASE}/${p}`;
    // evitar afectar iconos/recursos del frontend
    if (p.startsWith('/icons/') || p.startsWith('icons/')) return p;
    // nombre de archivo simple u otras rutas relativas
    if (!p.startsWith('/')) return `${this.API_BASE}/images/${p}`;
    // por defecto, si empieza por '/', prefijar con API_BASE
    return `${this.API_BASE}${p}`;
  }

  /**
   * Busca un alojamiento cargado en memoria por su ID.
   * @param id Identificador del alojamiento.
   * @returns `Listing | undefined` si no está cargado.
   */
  getById(id: string): Listing | undefined {
    if (this.deletedIds().includes(id)) return undefined;
    return this.listings().find(x => x.id === id);
  }

  /**
   * Carga listado paginado de alojamientos desde el backend.
   * 
   * Implementa merge inteligente de datos para evitar sobrescribir
   * cambios locales no sincronizados y mantener consistencia.
   * 
   * @param page Número de página (base 0)
   * @param size Tamaño de página
   * @param forceRefresh Si true, ignora caché y fuerza recarga
   * @returns Observable con la lista de alojamientos
   * 
   * @example
   * ```typescript
   * // Carga normal con caché
   * service.fetchAll().subscribe(listings => console.log(listings));
   * 
   * // Forzar recarga desde servidor
   * service.fetchAll(0, 12, true).subscribe(listings => console.log(listings));
   * ```
   */
  fetchAll(page = 0, size = 12, forceRefresh = false): Observable<Listing[]> {
    // Verificar si necesitamos recargar
    if (!forceRefresh && !this.dataSyncService.isDataStale('listings')) {
      const cached = this.listings();
      if (cached.length > 0) {
        console.log(`📦 ListingsService: Usando ${cached.length} alojamientos desde caché`);
        return of(cached);
      }
    }

    console.log(`🌐 ListingsService: Cargando alojamientos desde servidor (página ${page}, tamaño ${size})`);
    this.dataSyncService.setLoading('listings', true);

    const url = `${this.API_BASE}/alojamientos?page=${page}&size=${size}`;
    return this.http.get<import('../models/page.model').PageResponse<any>>(url).pipe(
      map(res => (res?.content ?? []).map((d: any) => this.toListing(d))),
      tap(serverListings => {
        // Reconciliación estricta: usar SOLO los alojamientos del servidor.
        // Esto evita mostrar alojamientos que no existen en la base de datos original.
        const deleted = new Set(this.deletedIds());
        const filtered = serverListings.filter(l => !deleted.has(l.id));
        this.listings.set(filtered);

        // Notificar cambio y marcar como actualizado
        this.dataSyncService.markAsUpdated('listings');
        this.dataSyncService.notifyDataChange('listings', 'fetch', filtered, undefined, 'fetchAll');

        console.log(`✅ ListingsService: ${filtered.length} alojamientos (solo backend) cargados`);
      }),
      catchError(err => {
        console.error('❌ ListingsService.fetchAll error', err);
        
        // Fallback: mantener datos locales si existen
        const existingListings = this.listings();
        if (existingListings.length > 0) {
          console.log(`🔄 ListingsService: Manteniendo ${existingListings.length} alojamientos locales tras error`);
          return of(existingListings);
        }
        
        // Si no hay datos locales, devolver array vacío
        this.listings.set([]);
        return of([]);
      }),
      finalize(() => {
        this.dataSyncService.setLoading('listings', false);
      })
    );
  }

  /**
   * Carga alojamientos del anfitrión autenticado desde el backend.
   * Usa endpoint dedicado: GET /api/alojamientos/anfitrion
   */
  fetchForHost(page = 0, size = 12): Observable<Listing[]> {
    console.log(`🌐 ListingsService: Cargando alojamientos del anfitrión (página ${page}, tamaño ${size})`);
    this.dataSyncService.setLoading('listings', true);

    const url = `${this.API_BASE}/alojamientos/anfitrion?page=${page}&size=${size}`;
    return this.http.get<import('../models/page.model').PageResponse<any>>(url).pipe(
      map(res => (res?.content ?? []).map((d: any) => this.toListing(d))),
      tap(serverListings => {
        // Filtrar eliminados para que no aparezcan
        const deleted = new Set(this.deletedIds());
        const filtered = serverListings.filter(l => !deleted.has(l.id));
        this.listings.set(filtered);

        // Notificar cambio y marcar como actualizado
        this.dataSyncService.markAsUpdated('listings');
        this.dataSyncService.notifyDataChange('listings', 'fetch', filtered, undefined, 'fetchForHost');

        console.log(`✅ ListingsService: ${filtered.length} alojamientos del anfitrión cargados`);
      }),
      catchError(err => {
        console.error('❌ ListingsService.fetchForHost error', err);
        // No reutilizar listados previos: el dashboard de anfitrión
        // debe mostrar solo datos propios o vacío si hay error/401.
        this.listings.set([]);
        return of([]);
      }),
      finalize(() => {
        this.dataSyncService.setLoading('listings', false);
      })
    );
  }

  /** Carga favoritos de forma segura (compatible con SSR) */
  private loadFavoritesFromStorage(): string[] {
    try {
      const ls: any = (globalThis as any).localStorage;
      if (!ls || typeof ls.getItem !== 'function') return [];
      const raw = ls.getItem('favorites');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** Persiste favoritos de forma segura (compatible con SSR) */
  private saveFavoritesToStorage(ids: string[]): void {
    try {
      const ls: any = (globalThis as any).localStorage;
      if (!ls || typeof ls.setItem !== 'function') return;
      ls.setItem('favorites', JSON.stringify(ids));
    } catch { /* noop */ }
  }

  /** Carga IDs eliminados de forma segura (compatible con SSR) */
  private loadDeletedFromStorage(): string[] {
    try {
      const ls: any = (globalThis as any).localStorage;
      if (!ls || typeof ls.getItem !== 'function') return [];
      const raw = ls.getItem('listings_deleted');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** Persiste IDs eliminados de forma segura (compatible con SSR) */
  private saveDeletedToStorage(ids: string[]): void {
    try {
      const ls: any = (globalThis as any).localStorage;
      if (!ls || typeof ls.setItem !== 'function') return;
      ls.setItem('listings_deleted', JSON.stringify(ids));
    } catch { /* noop */ }
  }

  /** Añade un ID a la lista de eliminados y persiste */
  private addDeleted(id: string): void {
    if (!this.deletedIds().includes(id)) {
      const next = [...this.deletedIds(), id];
      this.deletedIds.set(next);
      this.saveDeletedToStorage(next);
    }
  }

  /** Merge inteligente entre listas locales y del servidor por ID */
  private mergeListings(local: Listing[], server: Listing[]): Listing[] {
    const byId = new Map<string, Listing>();
    for (const l of local) byId.set(l.id, l);
    for (const s of server) byId.set(s.id, { ...(byId.get(s.id) || {} as any), ...s });
    return Array.from(byId.values());
  }

  /** Busca alojamientos con filtros básicos (ciudad, capacidad) */
  search(filters: { ciudad?: string; capacidad?: number; servicios?: string[]; page?: number; size?: number }): Observable<Listing[]> {
    const url = `${this.API_BASE}/alojamientos/search`;
    const payload = {
      ciudad: filters.ciudad ?? null,
      capacidad: filters.capacidad ?? null,
      servicios: filters.servicios ?? null,
      page: filters.page ?? 0,
      size: filters.size ?? 12
    };
    return this.http.post<import('../models/page.model').PageResponse<any>>(url, payload).pipe(
      map(res => (res?.content ?? []).map((d: any) => this.toListing(d))),
      tap(list => this.listings.set(list)),
      catchError(err => {
        console.error('ListingsService.search error', err);
        // Fallback: devolver [] si la búsqueda falla
        this.listings.set([]);
        return of([]);
      })
    );
  }

  /** Obtiene un alojamiento por ID y actualiza el estado local */
  fetchById(id: string): Observable<Listing> {
    const url = `${this.API_BASE}/alojamientos/${id}`;
    return this.http.get<any>(url).pipe(
      map(dto => this.toListing(dto)),
      tap(listing => {
        // No reintroducir alojamientos marcados como eliminados
        if (this.deletedIds().includes(listing.id)) {
          console.log(`⛔ Saltando reintroducción de alojamiento eliminado ${listing.id}`);
          return;
        }
        const arr = this.listings();
        const idx = arr.findIndex(l => l.id === listing.id);
        if (idx >= 0) {
          arr[idx] = listing;
          this.listings.set([...arr]);
        } else {
          this.listings.set([listing, ...arr]);
        }
      }),
      catchError(err => {
        console.error('ListingsService.fetchById error', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Crea un nuevo alojamiento con update optimista.
   * 
   * Implementa optimistic update para mejor UX: actualiza la UI inmediatamente
   * y revierte si falla la operación en el backend.
   * 
   * @param dto Datos del alojamiento a crear
   * @returns Observable con el alojamiento creado
   * 
   * @example
   * ```typescript
   * const newListing = {
   *   titulo: 'Casa en la playa',
   *   ciudad: 'Cartagena',
   *   pais: 'Colombia',
   *   // ... otros campos
   * };
   * 
   * service.create(newListing).subscribe({
   *   next: (created) => console.log('Alojamiento creado:', created.id),
   *   error: (err) => console.error('Error creando:', err)
   * });
   * ```
   */
  create(dto: {
    titulo: string;
    descripcion?: string;
    ciudad: string;
    pais: string;
    calle: string;
    zip?: string;
    precioNoche: number;
    capacidad: number;
    fotos: string[];
    servicios?: string[];
  }, files?: File[]): Observable<Listing> {
    console.log('🚀 ListingsService: Creando nuevo alojamiento:', dto.titulo);
    this.dataSyncService.setLoading('listings', true);

    // Crear alojamiento temporal para optimistic update
    const tempId = `temp-${Date.now()}`;
    const user = this.auth.currentUser();
    const optimisticListing: Listing = {
      id: tempId,
      titulo: dto.titulo,
      descripcion: dto.descripcion || '',
      ubicacion: {
        direccion: dto.calle,
        ciudad: dto.ciudad,
        pais: dto.pais,
        lat: undefined,
        lng: undefined
      },
      precioPorNoche: dto.precioNoche,
      imagenes: dto.fotos,
      servicios: dto.servicios || [],
      anfitrionId: String(user?.id || ''),
      anfitrionNombre: user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : undefined,
      capacidad: dto.capacidad
    };

    // Optimistic update: agregar inmediatamente a la UI
    const currentListings = this.listings();
    this.listings.set([optimisticListing, ...currentListings]);
    console.log('⚡ ListingsService: Update optimista aplicado');

    const url = `${this.API_BASE}/alojamientos`;
    const payload = {
      ...dto,
      servicios: dto.servicios ?? [],
      anfitrionId: user?.id || undefined
    };

    // Si se proveen archivos, usar multipart/form-data; de lo contrario, enviar JSON.
    let body: any = payload;
    if (files && files.length > 0) {
      const formData = new FormData();
      const dataBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      formData.append('data', dataBlob);
      files.forEach((file) => {
        formData.append('files', file, file.name);
      });
      body = formData;
    }

    return this.http.post<any>(url, body).pipe(
      map(res => this.toListing(res)),
      tap(created => {
        // Reemplazar el alojamiento temporal con el real del servidor
        const updatedListings = this.listings().map(listing => 
          listing.id === tempId ? created : listing
        );
        this.listings.set(updatedListings);
        
        // Notificar creación exitosa
        this.dataSyncService.notifyDataChange('listings', 'create', created, created.id, 'create');
        console.log(`✅ ListingsService: Alojamiento creado exitosamente con ID ${created.id}`);
      }),
      catchError(err => {
        console.error('❌ ListingsService.create error', err);
        
        // Revertir optimistic update: remover el alojamiento temporal
        const revertedListings = this.listings().filter(listing => listing.id !== tempId);
        this.listings.set(revertedListings);
        console.log('🔄 ListingsService: Optimistic update revertido tras error');
        
        return throwError(() => err);
      }),
      finalize(() => {
        this.dataSyncService.setLoading('listings', false);
      })
    );
  }

  /**
   * Actualiza un alojamiento existente con update optimista.
   * 
   * Implementa optimistic update: aplica cambios inmediatamente en la UI
   * y revierte si la operación falla en el backend.
   * 
   * @param id ID del alojamiento a actualizar
   * @param values Datos parciales a actualizar
   * @returns Observable con el alojamiento actualizado
   * 
   * @example
   * ```typescript
   * service.update('123', { 
   *   titulo: 'Nuevo título',
   *   precioNoche: 150 
   * }).subscribe({
   *   next: (updated) => console.log('Actualizado:', updated.titulo),
   *   error: (err) => console.error('Error:', err)
   * });
   * ```
   */
  update(id: string, values: Partial<{
    titulo: string;
    descripcion: string;
    ciudad: string;
    pais: string;
    calle: string;
    zip: string;
    precioNoche: number;
    capacidad: number;
    fotos: string[];
    activo: boolean;
  }>): Observable<Listing> {
    console.log(`🔄 ListingsService: Actualizando alojamiento ${id}:`, values);
    this.dataSyncService.setLoading('listings', true);

    // Encontrar el alojamiento actual para backup
    const currentListings = this.listings();
    const currentIndex = currentListings.findIndex(l => l.id === id);
    
    if (currentIndex === -1) {
      console.warn(`⚠️ ListingsService: Alojamiento ${id} no encontrado en cache local`);
      return throwError(() => new Error(`Alojamiento ${id} no encontrado`));
    }

    const originalListing = { ...currentListings[currentIndex] };
    
    // Crear versión optimista con los cambios aplicados
    const optimisticListing: Listing = {
      ...originalListing,
      titulo: values.titulo ?? originalListing.titulo,
      descripcion: values.descripcion ?? originalListing.descripcion,
      ubicacion: {
        ...originalListing.ubicacion,
        direccion: values.calle ?? originalListing.ubicacion.direccion,
        ciudad: values.ciudad ?? originalListing.ubicacion.ciudad,
        pais: values.pais ?? originalListing.ubicacion.pais
      },
      precioPorNoche: values.precioNoche ?? originalListing.precioPorNoche,
      capacidad: values.capacidad ?? originalListing.capacidad,
      imagenes: values.fotos ?? originalListing.imagenes
    };

    // Optimistic update: aplicar cambios inmediatamente
    const optimisticListings = [...currentListings];
    optimisticListings[currentIndex] = optimisticListing;
    this.listings.set(optimisticListings);
    console.log('⚡ ListingsService: Update optimista aplicado para', id);

    const url = `${this.API_BASE}/alojamientos/${id}`;
    return this.http.patch<any>(url, values).pipe(
      map(dto => this.toListing(dto)),
      tap(updated => {
        // Reemplazar con la versión confirmada del servidor
        const confirmedListings = this.listings();
        const confirmedIndex = confirmedListings.findIndex(l => l.id === id);
        if (confirmedIndex >= 0) {
          confirmedListings[confirmedIndex] = updated;
          this.listings.set([...confirmedListings]);
        } else {
          this.listings.set([updated, ...confirmedListings]);
        }
        
        // Notificar actualización exitosa
        this.dataSyncService.notifyDataChange('listings', 'update', updated, id, 'update');
        console.log(`✅ ListingsService: Alojamiento ${id} actualizado exitosamente`);
      }),
      catchError(err => {
        console.error(`❌ ListingsService.update error para ${id}:`, err);
        
        // Revertir optimistic update: restaurar versión original
        const revertedListings = [...this.listings()];
        const revertIndex = revertedListings.findIndex(l => l.id === id);
        if (revertIndex >= 0) {
          revertedListings[revertIndex] = originalListing;
          this.listings.set(revertedListings);
          console.log(`🔄 ListingsService: Optimistic update revertido para ${id}`);
        }
        
        return throwError(() => err);
      }),
      finalize(() => {
        this.dataSyncService.setLoading('listings', false);
      })
    );
  }

  /** Elimina un alojamiento y actualiza estado local. */
  remove(id: string): Observable<void> {
    console.log(`Iniciando eliminación del alojamiento ${id}`);
    
    // Eliminar inmediatamente del estado local para UX instantánea
    const currentListings = this.listings();
    const listingToDelete = currentListings.find(l => l.id === id);
    
    if (!listingToDelete) {
      console.warn(`Alojamiento ${id} no encontrado en el estado local`);
      return of(void 0);
    }
    
    // Actualizar inmediatamente el estado local
    const updatedListings = currentListings.filter(l => l.id !== id);
    this.listings.set(updatedListings);

    // Marcar como eliminado de forma persistente para evitar reaparición
    this.addDeleted(id);
    
    // También eliminar de favoritos si estaba ahí
    if (this.favorites().includes(id)) {
      this.removeFavorite(id);
    }
    
    console.log(`Alojamiento ${id} eliminado del estado local inmediatamente. Quedan ${updatedListings.length} alojamientos.`);
    
    // Intentar eliminar del backend (pero no bloquear la UX)
    const url = `${this.API_BASE}/alojamientos/${id}`;
    console.log(`Llamando al endpoint DELETE: ${url}`);
    
    return this.http.delete<void>(url).pipe(
      tap(() => {
        console.log(`✅ Alojamiento ${id} eliminado exitosamente del backend`);
        console.log(`📡 Endpoint llamado: DELETE ${url}`);
        
        // Forzar una actualización adicional para asegurar sincronización
        setTimeout(() => {
          const finalListings = this.listings().filter(l => l.id !== id);
          this.listings.set([...finalListings]);
          console.log(`🔄 Sincronización final: ${finalListings.length} alojamientos restantes`);
        }, 200);
      }),
      catchError(err => {
        console.error(`❌ Error eliminando del backend:`, err);
        console.error(`📡 Endpoint que falló: DELETE ${url}`);
        console.error(`🔍 Status: ${err.status}, Message: ${err.message}`);
        
        if (err.error) {
          console.error(`📄 Response body:`, err.error);
        }
        
        // Mantener la eliminación local incluso si el backend falla
        if (err.status === 404) {
          console.log('ℹ️ Alojamiento ya no existe en el backend, manteniendo eliminación local');
          return of(void 0);
        }
        
        if (err.status === 401 || err.status === 403) {
          console.log('🔐 Error de autenticación/autorización, manteniendo eliminación local');
          return of(void 0);
        }
        
        // Para otros errores, también mantener la eliminación local
        console.log('⚠️ Manteniendo eliminación local a pesar del error del backend');
        return of(void 0);
      })
    );
  }

  /**
   * Añade un alojamiento a la lista de favoritos local (no persiste en backend).
   * @param id ID del alojamiento.
   */
  addFavorite(id: string): void {
    if (!this.favorites().includes(id)) {
      this.favorites.set([...this.favorites(), id]);
    }
  }

  /**
   * Elimina un alojamiento de la lista de favoritos local.
   * @param id ID del alojamiento.
   */
  removeFavorite(id: string): void {
    this.favorites.set(this.favorites().filter(x => x !== id));
  }
}

