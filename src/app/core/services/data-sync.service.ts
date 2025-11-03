import { Injectable, signal, computed, effect } from '@angular/core';
import { Subject, BehaviorSubject, Observable, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

/**
 * Servicio centralizado de sincronización de datos.
 * 
 * Gestiona la comunicación entre servicios, invalidación de caché,
 * y sincronización en tiempo real de cambios de datos.
 * 
 * @example
 * ```typescript
 * // Notificar cambio en listings
 * dataSyncService.notifyDataChange('listings', 'create', newListing);
 * 
 * // Escuchar cambios en bookings
 * dataSyncService.onDataChange('bookings').subscribe(change => {
 *   // Actualizar UI o refrescar datos
 * });
 * ```
 */
// Tipos colocados a nivel de módulo para evitar errores de TS
type EntityType = 'listings' | 'bookings' | 'users' | 'favorites';
type OperationType = 'create' | 'update' | 'delete' | 'fetch';
interface DataChange {
  entityType: EntityType;
  operation: OperationType;
  entityId?: string;
  data?: any;
  timestamp: number;
  source?: string;
}

@Injectable({ providedIn: 'root' })
export class DataSyncService {
  // Listas de tipos permitidos (documentación/validación ligera)
  private readonly ENTITY_TYPES: EntityType[] = ['listings', 'bookings', 'users', 'favorites'];
  private readonly OPERATION_TYPES: OperationType[] = ['create', 'update', 'delete', 'fetch'];
  
  /**
   * Subject para notificar cambios de datos
   */
  private dataChanges$ = new Subject<DataChange>();
  
  /**
   * Estados de carga por entidad
   */
  private loadingStates = signal<Record<EntityType, boolean>>({
    listings: false,
    bookings: false,
    users: false,
    favorites: false
  });
  
  /**
   * Timestamps de última actualización por entidad
   */
  private lastUpdated = signal<Record<EntityType, number>>({
    listings: 0,
    bookings: 0,
    users: 0,
    favorites: 0
  });
  
  /**
   * Cache TTL en milisegundos (5 minutos por defecto)
   */
  private readonly CACHE_TTL = 5 * 60 * 1000;
  
  /**
   * Computed property para verificar si hay operaciones en curso
   */
  readonly hasActiveOperations = computed(() => {
    const states = this.loadingStates();
    return Object.values(states).some(loading => loading);
  });
  
  /**
   * Computed property para obtener el estado de carga de una entidad específica
   */
  isLoading(entityType: EntityType): boolean {
    return this.loadingStates()[entityType];
  }
  
  /**
   * Notifica un cambio en los datos de una entidad
   * 
   * @param entityType Tipo de entidad modificada
   * @param operation Tipo de operación realizada
   * @param data Datos relacionados con el cambio (opcional)
   * @param entityId ID de la entidad específica (opcional)
   * @param source Fuente del cambio (opcional)
   */
  notifyDataChange(
    entityType: EntityType, 
    operation: OperationType, 
    data?: any, 
    entityId?: string,
    source?: string
  ): void {
    const change: DataChange = {
      entityType,
      operation,
      entityId,
      data,
      timestamp: Date.now(),
      source
    };
    
    console.log(`🔄 DataSync: ${entityType}.${operation}`, { entityId, source, data });
    
    // Actualizar timestamp de última modificación
    this.updateLastModified(entityType);
    
    // Emitir el cambio
    this.dataChanges$.next(change);
  }
  
  /**
   * Escucha cambios en una entidad específica
   * 
   * @param entityType Tipo de entidad a observar
   * @returns Observable de cambios filtrados por entidad
   */
  onDataChange(entityType: EntityType): Observable<DataChange> {
    return this.dataChanges$.pipe(
      filter(change => change.entityType === entityType),
      debounceTime(100), // Evitar spam de notificaciones
      distinctUntilChanged((a, b) => 
        a.entityType === b.entityType && 
        a.operation === b.operation && 
        a.entityId === b.entityId
      )
    );
  }
  
  /**
   * Escucha todos los cambios de datos
   * 
   * @returns Observable de todos los cambios
   */
  onAnyDataChange(): Observable<DataChange> {
    return this.dataChanges$.pipe(
      debounceTime(50)
    );
  }
  
  /**
   * Establece el estado de carga para una entidad
   * 
   * @param entityType Tipo de entidad
   * @param loading Estado de carga
   */
  setLoading(entityType: EntityType, loading: boolean): void {
    const current = this.loadingStates();
    this.loadingStates.set({
      ...current,
      [entityType]: loading
    });
    
    if (loading) {
      console.log(`⏳ DataSync: ${entityType} loading started`);
    } else {
      console.log(`✅ DataSync: ${entityType} loading completed`);
    }
  }
  
  /**
   * Verifica si los datos de una entidad están obsoletos
   * 
   * @param entityType Tipo de entidad
   * @param customTTL TTL personalizado en milisegundos (opcional)
   * @returns true si los datos están obsoletos
   */
  isDataStale(entityType: EntityType, customTTL?: number): boolean {
    const lastUpdate = this.lastUpdated()[entityType];
    const ttl = customTTL ?? this.CACHE_TTL;
    const now = Date.now();
    
    return (now - lastUpdate) > ttl;
  }
  
  /**
   * Marca los datos de una entidad como actualizados
   * 
   * @param entityType Tipo de entidad
   */
  markAsUpdated(entityType: EntityType): void {
    this.updateLastModified(entityType);
  }
  
  /**
   * Invalida el caché de una entidad específica
   * 
   * @param entityType Tipo de entidad a invalidar
   */
  invalidateCache(entityType: EntityType): void {
    const current = this.lastUpdated();
    this.lastUpdated.set({
      ...current,
      [entityType]: 0
    });
    
    console.log(`🗑️ DataSync: ${entityType} cache invalidated`);
    
    // Notificar invalidación
    this.notifyDataChange(entityType, 'fetch', null, undefined, 'cache-invalidation');
  }
  
  /**
   * Invalida todo el caché
   */
  invalidateAllCache(): void {
    this.lastUpdated.set({
      listings: 0,
      bookings: 0,
      users: 0,
      favorites: 0
    });
    
    console.log('🗑️ DataSync: All cache invalidated');
  }
  
  /**
   * Obtiene estadísticas del estado de sincronización
   */
  getSyncStats(): {
    loadingStates: Record<EntityType, boolean>;
    lastUpdated: Record<EntityType, number>;
    hasActiveOperations: boolean;
    cacheAges: Record<EntityType, number>;
  } {
    const now = Date.now();
    const lastUpdatedData = this.lastUpdated();
    
    return {
      loadingStates: this.loadingStates(),
      lastUpdated: lastUpdatedData,
      hasActiveOperations: this.hasActiveOperations(),
      cacheAges: {
        listings: now - lastUpdatedData.listings,
        bookings: now - lastUpdatedData.bookings,
        users: now - lastUpdatedData.users,
        favorites: now - lastUpdatedData.favorites
      }
    };
  }
  
  /**
   * Actualiza el timestamp de última modificación
   * 
   * @private
   * @param entityType Tipo de entidad
   */
  private updateLastModified(entityType: EntityType): void {
    const current = this.lastUpdated();
    this.lastUpdated.set({
      ...current,
      [entityType]: Date.now()
    });
  }
}
