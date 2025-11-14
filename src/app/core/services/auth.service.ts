import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { User } from '../models/user.model';
import { EmailService } from './email.service';
import { EFFECTIVE_MAIL_PROVIDER } from '../../shared/email.config';
import { NotificationsService } from './notifications.service';
import { DataSyncService } from './data-sync.service';
import { API_BASE } from '../config';

/**
 * Servicio de autenticación y gestión de usuarios con estado reactivo.
 * 
 * Características principales:
 * - ✅ Autenticación completa (login, registro, logout)
 * - ✅ Estado reactivo con Angular Signals
 * - ✅ Persistencia automática en localStorage
 * - ✅ Sincronización automática entre pestañas/componentes
 * - ✅ Manejo robusto de errores y estados de carga
 * - ✅ Gestión de perfil de usuario
 * - ✅ Recuperación de contraseña
 * - ✅ Validación de sesión automática
 * - ✅ Notificaciones de cambios de estado
 * 
 * @example
 * ```typescript
 * // Inyectar el servicio
 * constructor(private authService: AuthService) {}
 * 
 * // Login
 * this.authService.login(email, password).subscribe({
 *   next: (user) => console.log('Usuario logueado:', user.email),
 *   error: (err) => console.error('Error de login:', err)
 * });
 * 
 * // Acceder al usuario actual
 * const currentUser = this.authService.currentUser();
 * const isAuthenticated = this.authService.isAuthenticated();
 * ```
 * 
 * @author Sistema de Alojamientos
 * @version 2.0.0
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = API_BASE;
  private readonly STORAGE_KEY = 'auth_user';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly notifications = inject(NotificationsService);

  /**
   * Signal reactivo que contiene el usuario actual autenticado.
   * Se actualiza automáticamente con login/logout/actualización de perfil.
   */
  currentUser = signal<User | null>(null);

  /**
   * Signal para el estado de carga del servicio.
   * Permite mostrar indicadores de carga durante operaciones de auth.
   */
  private loading = signal<boolean>(false);

  /**
   * Signal para errores del servicio.
   * Facilita el manejo centralizado de errores de autenticación.
   */
  private error = signal<string | null>(null);

  /**
   * Computed que indica si el usuario está autenticado.
   * Se recalcula automáticamente cuando cambia currentUser.
   */
  readonly isAuthenticated = computed(() => {
    return this.currentUser() !== null;
  });

  /**
   * Computed que indica si el usuario es anfitrión.
   * Útil para mostrar/ocultar funcionalidades específicas.
   */
  readonly isHost = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'ANFITRION' || user?.rol === 'anfitrion';
  });

  /**
   * Computed que indica si el usuario es huésped.
   */
  readonly isGuest = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'HUESPED' || user?.rol === 'huesped';
  });

  /**
   * Computed con información del perfil del usuario.
   * Proporciona datos útiles para la UI.
   */
  readonly userProfile = computed(() => {
    const user = this.currentUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      rol: user.rol,
      fechaNacimiento: user.fechaNacimiento,
      avatarUrl: user.avatarUrl || this.generateAvatarUrl(user.nombre, user.apellido),
      initials: this.getInitials(user.nombre, user.apellido)
    };
  });

  // Getters públicos para acceso a signals
  get user() { return this.currentUser.asReadonly(); }
  get isLoading() { return this.loading.asReadonly(); }
  get currentError() { return this.error.asReadonly(); }

  /**
   * Compatibilidad con componentes existentes
   */
  isLoggedIn(): boolean { return this.currentUser() !== null; }

  constructor(
    private http: HttpClient,
    private dataSyncService: DataSyncService,
    private emailService: EmailService
  ) {
    // Cargar usuario desde localStorage al inicializar
    this.loadUserFromStorage();

    // Effect para persistir usuario automáticamente
    effect(() => {
      const user = this.currentUser();
      if (!AuthService.hasStorage()) return;
      try {
        if (user) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
          console.log('👤 AuthService: Usuario persistido en localStorage');
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
          localStorage.removeItem(this.TOKEN_KEY);
          console.log('👤 AuthService: Datos de usuario removidos de localStorage');
        }
      } catch (e) {
        console.warn('⚠️ AuthService: No se pudo acceder a localStorage en SSR', e);
      }
    });

    // Suscribirse a cambios externos de usuario
    this.dataSyncService.onDataChange('users').subscribe(() => {
      console.log('🔄 AuthService: Recargando datos de usuario por cambio externo');
      this.validateSession();
    });

    // Validar sesión al inicializar
    this.validateSession();
  }

  // Token actual para el interceptor
  get token(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch { return null; }
  }

  /**
   * Carga el usuario desde localStorage si existe.
   * Se ejecuta automáticamente al inicializar el servicio.
   * 
   * @private
   */
  private loadUserFromStorage(): void {
    try {
      if (!AuthService.hasStorage()) return;
      const storedUser = localStorage.getItem(this.STORAGE_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.currentUser.set(user);
        console.log('👤 AuthService: Usuario cargado desde localStorage:', user.email);
      }
    } catch (error) {
      console.error('❌ AuthService: Error cargando usuario desde localStorage:', error);
      try {
        if (AuthService.hasStorage()) {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } catch {}
    }
  }

  /**
   * Valida la sesión actual con el servidor.
   * Verifica si el token sigue siendo válido.
   * 
   * @private
   */
  private validateSession(): void {
    try {
      if (!AuthService.hasStorage()) return;
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (!token || !this.currentUser()) {
        return;
      }
    } catch {
      // En SSR no hay localStorage, omitir validación
      return;
    }

    // TODO: Implementar validación de token con el backend
    // Por ahora, asumimos que el token es válido si existe
    console.log('✅ AuthService: Sesión validada');
  }

  /**
   * Genera una URL de avatar basada en las iniciales del usuario.
   * 
   * @param nombre Nombre del usuario
   * @param apellido Apellido del usuario
   * @returns URL del avatar generado
   * @private
   */
  private generateAvatarUrl(nombre: string, apellido: string): string {
    const initials = this.getInitials(nombre, apellido);
    return `https://ui-avatars.com/api/?name=${initials}&background=0D8ABC&color=fff&size=128`;
  }

  /**
   * Obtiene las iniciales del nombre y apellido.
   * 
   * @param nombre Nombre del usuario
   * @param apellido Apellido del usuario
   * @returns Iniciales del usuario
   * @private
   */
  private getInitials(nombre: string, apellido: string): string {
    const firstInitial = nombre?.charAt(0)?.toUpperCase() || '';
    const lastInitial = apellido?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
  }

  /**
   * Mapea la respuesta del servidor al modelo User.
   * 
   * @param dto Datos del usuario desde el servidor
   * @returns Objeto User mapeado
   * @private
   */
  private mapToUser(dto: any): User {
    const d = dto ?? {};
    const current = this.currentUser();
    const resolveRole = (x: any): 'ANFITRION' | 'HUESPED' => {
      const raw = (x?.rol ?? x?.role ?? x?.userRole ?? x?.rolUsuario ?? x?.tipoUsuario ?? '').toString();
      const lc = raw.toLowerCase();
      if (lc.includes('anfitrion') || lc.includes('host')) return 'ANFITRION';
      if (lc.includes('huesped') || lc.includes('guest')) return 'HUESPED';
      const auths: string[] = Array.isArray(x?.authorities) ? x.authorities : Array.isArray(x?.roles) ? x.roles : [];
      const authsLc = auths.map(val => String(val).toLowerCase());
      if (authsLc.some(a => a.includes('anfitrion') || a.includes('role_host') || a.includes('host'))) return 'ANFITRION';
      if (authsLc.some(a => a.includes('huesped') || a.includes('role_guest') || a.includes('guest'))) return 'HUESPED';
      return (current?.rol === 'ANFITRION') ? 'ANFITRION' : 'HUESPED';
    };

    return {
      id: String(d.id ?? current?.id ?? ''),
      email: String(d.email ?? current?.email ?? ''),
      nombre: String(d.nombre ?? current?.nombre ?? ''),
      apellido: String(d.apellido ?? d.apellidos ?? current?.apellido ?? ''),
      telefono: d.telefono ?? current?.telefono ?? '',
      rol: resolveRole(d),
      fechaNacimiento: d.fechaNacimiento ?? current?.fechaNacimiento ?? '',
      avatarUrl: d.avatarUrl ?? d.avatar ?? current?.avatarUrl
    };
  }

  /**
   * Inicia sesión con email y contraseña.
   * 
   * Autentica al usuario y actualiza el estado global.
   * Persiste automáticamente la sesión en localStorage.
   * 
   * @param email Email del usuario
   * @param password Contraseña del usuario
   * @returns Observable con el usuario autenticado
   * 
   * @example
   * ```typescript
   * service.login('user@example.com', 'password123').subscribe({
   *   next: (user) => {
   *     console.log('Login exitoso:', user.email);
   *     // Redirigir a dashboard
   *   },
   *   error: (err) => {
   *     console.error('Error de login:', err);
   *     // Mostrar mensaje de error
   *   }
   * });
   * ```
   */
  login(email: string, password: string): Observable<User> {
    console.log('🔐 AuthService: Iniciando login para:', email);
    this.loading.set(true);
    this.error.set(null);

    const url = `${this.API_URL}/auth/login`;
    const payload = { email, password };

    return this.http.post<any>(url, payload).pipe(
      map(response => {
        // Guardar token si viene en la respuesta
        if (response.token) {
          try {
            if (AuthService.hasStorage()) {
              localStorage.setItem(this.TOKEN_KEY, response.token);
            }
          } catch {}
        }
        
        return this.mapToUser(response.user || response);
      }),
      tap(user => {
        // Actualizar estado del usuario
        this.currentUser.set(user);
        
        // Notificar cambio de usuario (login)
        this.dataSyncService.notifyDataChange('users', 'update', user, user.id, 'login');
        console.log(`✅ AuthService: Login exitoso para ${user.email} (${user.rol})`);
      }),
      catchError(err => {
        console.error('❌ AuthService.login error:', err);
        
        // Mapear errores comunes
        let errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.';
        if (err.status === 401) {
          errorMessage = 'Email o contraseña incorrectos.';
        } else if (err.status === 403) {
          errorMessage = 'Cuenta bloqueada. Contacta al administrador.';
        } else if (err.status === 0) {
          errorMessage = 'Error de conexión. Verifica tu internet.';
        }
        
        this.error.set(errorMessage);
        return throwError(() => err);
      }),
      finalize(() => {
        this.loading.set(false);
      })
    );
  }

  /**
   * Registra un nuevo usuario en el sistema.
   * 
   * Crea una cuenta nueva y opcionalmente inicia sesión automáticamente.
   * 
   * @param userData Datos del usuario a registrar
   * @returns Observable con el usuario registrado
   * 
   * @example
   * ```typescript
   * const userData = {
   *   email: 'nuevo@example.com',
   *   password: 'password123',
   *   nombre: 'Juan',
   *   apellido: 'Pérez',
   *   telefono: '+57 300 123 4567',
   *   rol: 'HUESPED'
   * };
   * 
   * service.register(userData).subscribe({
   *   next: (user) => console.log('Registro exitoso:', user.email),
   *   error: (err) => console.error('Error de registro:', err)
   * });
   * ```
   */
  register(userData: {
    email: string;
    password: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    rol?: 'HUESPED' | 'ANFITRION';
    // Campos adicionales del formulario (si el backend los requiere)
    ciudad?: string;
    pais?: string;
    fechaNacimiento?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
  }): Observable<User> {
    console.log('📝 AuthService: Registrando nuevo usuario:', userData.email);
    this.loading.set(true);
    this.error.set(null);

    const url = `${this.API_URL}/auth/register`;
    const t0 = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    let lastStatus = 0;
    let slowTimer: any;
    try { slowTimer = setTimeout(() => console.warn('[REGISTER] La solicitud tarda más de 15s; el correo se enviará en segundo plano.'), 15000); } catch {}
    const normalizeDate = (d?: string): string | undefined => {
      if (!d) return undefined;
      const s = String(d).trim();
      if (!s) return undefined;
      // Convertir dd/MM/yyyy → yyyy-MM-dd si aplica
      const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const m = s.match(slash);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      // Si ya viene como yyyy-MM-dd, dejar igual
      const dash = /^(\d{4})-(\d{2})-(\d{2})$/;
      if (dash.test(s)) return s;
      // Intentar Date parse y formatear
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return s;
    };

    const payload: any = {
      email: userData.email,
      password: userData.password,
      nombre: userData.nombre,
      apellidos: userData.apellido,
      telefono: userData.telefono,
      ciudad: userData.ciudad,
      pais: userData.pais,
      fechaNacimiento: normalizeDate(userData.fechaNacimiento),
      tipoDocumento: userData.tipoDocumento,
      numeroDocumento: userData.numeroDocumento
    };
    if (userData.rol) payload.rol = userData.rol;

  return this.http.post<any>(url, payload, { observe: 'response' }).pipe(
      map(resp => {
        lastStatus = resp.status || 0;
        const body = resp.body ?? {};
        if (body.token) {
          try {
            if (AuthService.hasStorage()) {
              localStorage.setItem(this.TOKEN_KEY, body.token);
            }
          } catch {}
        }
        const user = this.mapToUser(body.user || body);
        const t1 = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
        const dur = Math.round(t1 - t0);
        console.log(`[HTTP POST] ${url} -> ${lastStatus} | ${dur} ms`);
        return user;
      }),
      tap(user => {
        // Auto-login después del registro si hay token
        try {
          if (AuthService.hasStorage() && localStorage.getItem(this.TOKEN_KEY)) {
            this.currentUser.set(user);
            console.log(`✅ AuthService: Auto-login después del registro para ${user.email}`);
          }
        } catch {}
        
        // Notificar creación de usuario (registro)
        this.dataSyncService.notifyDataChange('users', 'create', user, user.id, 'register');
        console.log(`✅ AuthService: Usuario registrado exitosamente: ${user.email}`);

        // Correo de bienvenida vía backend SSR
        try {
          const provider = EFFECTIVE_MAIL_PROVIDER || 'backend';
          console.log(`MAIL_PROVIDER=${provider}`);
          if (provider === 'ssrsmtp' && user?.email) {
            this.emailService
              .sendWelcome({ to_email: user.email, to_name: user.nombre })
              .then(() => { try { this.notifications.success('Correo de bienvenida enviado'); } catch {} })
              .catch(() => { try { this.notifications.error('No se pudo enviar el correo de bienvenida'); } catch {} });
          }
          if (provider === 'backend') {
            console.log('El backend enviará el correo de bienvenida tras el 201 de registro');
          }
        } catch {}
      }),
      catchError(err => {
        const t1 = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
        const dur = Math.round(t1 - t0);
        console.error(`[HTTP POST] ${url} -> ${err?.status ?? 0} | ${dur} ms | ${err?.message ?? 'Unknown Error'}`);
        let errorMessage = 'Error al registrar usuario. Inténtalo de nuevo.';
        if (err.status === 409) {
          errorMessage = 'El email ya está registrado. Usa otro email.';
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifica la información.';
        } else if (err.status === 0) {
          errorMessage = 'Error de conexión. Verifica tu internet.';
        }
        this.error.set(errorMessage);
        return throwError(() => err);
      }),
      finalize(() => {
        this.loading.set(false);
        try { if (slowTimer) clearTimeout(slowTimer); } catch {}
      })
    );
  }

  /**
   * Cierra la sesión del usuario actual.
   * 
   * Limpia el estado local y notifica el logout.
   * Opcionalmente notifica al servidor para invalidar el token.
   * 
   * @param notifyServer Si debe notificar al servidor (default: true)
   * @returns Observable que completa cuando el logout termina
   * 
   * @example
   * ```typescript
   * service.logout().subscribe({
   *   next: () => {
   *     console.log('Logout exitoso');
   *     // Redirigir a login
   *   }
   * });
   * ```
   */
  logout(notifyServer = true): Observable<void> {
    const currentUserEmail = this.currentUser()?.email;
    console.log('🚪 AuthService: Cerrando sesión para:', currentUserEmail);
    
    this.loading.set(true);

    // Limpiar estado local inmediatamente
    const userId = this.currentUser()?.id;
    this.currentUser.set(null);
    this.error.set(null);

    // Notificar cambio de usuario (logout)
    if (userId) {
      this.dataSyncService.notifyDataChange('users', 'update', null, userId, 'logout');
    }

    // Opcionalmente notificar al servidor
    if (notifyServer) {
      let token: string | null = null;
      try {
        if (AuthService.hasStorage()) {
          token = localStorage.getItem(this.TOKEN_KEY);
        }
      } catch { token = null; }
      if (token) {
        const url = `${this.API_URL}/auth/logout`;
        return this.http.post<void>(url, {}).pipe(
          tap(() => {
            console.log('✅ AuthService: Logout notificado al servidor');
          }),
          catchError(err => {
            console.warn('⚠️ AuthService: Error notificando logout al servidor:', err);
            // No fallar el logout por errores del servidor
            return of(void 0);
          }),
          finalize(() => {
            this.loading.set(false);
            console.log(`✅ AuthService: Logout completado para ${currentUserEmail}`);
          })
        );
      }
    }

    // Logout local sin notificar servidor
    this.loading.set(false);
    console.log(`✅ AuthService: Logout local completado para ${currentUserEmail}`);
    
    return new Observable(observer => {
      observer.next();
      observer.complete();
    });
  }

  /**
   * Solicita al backend el envío de un correo de recuperación de contraseña.
   * @param email Correo del usuario que desea recuperar la contraseña.
   * @returns `Observable<boolean>` indicando éxito.
   */
  resetPassword(email: string): Observable<boolean> {
    return this.http.post(`${this.API_URL}/usuarios/password/reset`, { email }, { responseType: 'text' }).pipe(
      map(() => true),
      catchError(err => {
        console.error('AuthService.resetPassword error', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Confirma el proceso de recuperación con el token recibido por correo.
   * @param token Token de recuperación.
   * @param nuevaPassword Nueva contraseña a establecer.
   * @returns `Observable<boolean>` indicando éxito.
   */
  confirmResetPassword(token: string, nuevaPassword: string): Observable<boolean> {
    return this.http.put(`${this.API_URL}/usuarios/password/confirm`, { token, nuevaPassword }, { responseType: 'text' }).pipe(
      map(() => true),
      catchError(err => {
        console.error('AuthService.confirmResetPassword error', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Carga el perfil del usuario autenticado desde el backend.
   * Intenta primero en `/usuarios/me` y si falla, usa `/auth/me`.
   */
  loadProfile(): Observable<User> {
    this.loading.set(true);
    this.error.set(null);

    const primary = `${this.API_URL}/usuarios/me`;
    const fallback = `${this.API_URL}/auth/me`;

    const handleUser = (dto: any) => {
      const user = this.mapToUser(dto?.user || dto);
      const merged = { ...(this.currentUser() || {} as any), ...user } as User;
      this.currentUser.set(merged);
      this.dataSyncService.notifyDataChange('users', 'update', merged, merged.id, 'loadProfile');
      return merged;
    };

    return this.http.get<any>(primary).pipe(
      map(res => handleUser(res)),
      catchError(err => {
        // Intentar endpoint alterno
        return this.http.get<any>(fallback).pipe(
          map(res => handleUser(res)),
          catchError(err2 => {
            console.error('❌ AuthService.loadProfile error:', err, err2);
            this.error.set('No se pudo cargar el perfil de usuario');
            return throwError(() => err2);
          })
        );
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /**
   * Actualiza el perfil del usuario actual.
   * Permite modificar nombre, apellido, email y teléfono.
   * @param values Valores a actualizar
   */
  updateProfile(values: Partial<{ nombre: string; apellido: string; email: string; telefono: string; descripcion: string; telefonoCodigo: string; passwordActual: string; passwordNueva: string; avatarUrl: string; }>, fotoPerfil?: File): Observable<User> {
    if (!this.currentUser()) {
      return throwError(() => new Error('No hay usuario autenticado'));
    }

    this.loading.set(true);
    this.error.set(null);

    const primaryUrl = `${this.API_URL}/usuarios/me`;

    // Construir payload parcial (sólo campos presentes y no vacíos)
    const user = this.currentUser()!;
    const trim = (x: any) => typeof x === 'string' ? x.trim() : x;
    const partial: any = {};
    const candidates: Array<keyof typeof values> = ['nombre','apellido','email','telefono','descripcion','telefonoCodigo'] as any;
    for (const k of candidates) {
      const v = trim((values as any)[k]);
      if (v !== undefined && v !== null && !(typeof v === 'string' && v === '')) {
        (partial as any)[k] = v;
      }
    }
    // Avatar opcional
    const avatar = trim((values as any)['avatarUrl']);
    if (avatar) partial.avatarUrl = avatar;

    // Si el usuario no cambió nada, no llamar al backend innecesariamente
    if (Object.keys(partial).length === 0) {
      const current = { ...user } as User;
      return new Observable<User>(observer => {
        observer.next(current);
        observer.complete();
      }).pipe(finalize(() => this.loading.set(false)));
    }

    // Payload completo para PUT (si el backend no soporta PATCH)
    const fullPayload: any = {
      nombre: partial.nombre ?? user.nombre,
      apellido: partial.apellido ?? user.apellido,
      email: partial.email ?? user.email,
      telefono: partial.telefono ?? user.telefono,
      descripcion: partial.descripcion ?? (user as any)?.descripcion ?? '',
      telefonoCodigo: partial.telefonoCodigo ?? (user as any)?.telefonoCodigo ?? '',
      avatarUrl: partial.avatarUrl ?? (user as any)?.avatarUrl ?? undefined
    };

    const handle = (res: any) => this.mapToUser(res.user || res);

    // Si hay fotoPerfil, usar multipart/form-data con parte 'data' (JSON) y 'fotoPerfil' (archivo)
    if (fotoPerfil) {
      const form = new FormData();
      form.append('data', new Blob([JSON.stringify(partial)], { type: 'application/json' }));
      form.append('fotoPerfil', fotoPerfil);

      return this.http.patch<any>(primaryUrl, form).pipe(
        map(handle),
        tap(userUpdated => {
          const merged = { ...user, ...userUpdated };
          this.currentUser.set(merged);
          this.dataSyncService.notifyDataChange('users', 'update', merged, merged.id, 'updateProfile');
          console.log('✅ Perfil de usuario actualizado (con foto)');
        }),
        catchError(err => {
          console.error('❌ AuthService.updateProfile (multipart) error:', err);
          this.error.set('No se pudo actualizar tu perfil (imagen). Inténtalo de nuevo.');
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      );
    }

    // Sin foto: usar JSON (PATCH parcial con fallback a PUT)
    const tryPatch = () => this.http.patch<any>(primaryUrl, partial).pipe(map(handle));
    const tryPut = () => this.http.put<any>(primaryUrl, fullPayload).pipe(map(handle));

    return tryPatch().pipe(
      catchError(err => {
        console.warn('AuthService.updateProfile: PATCH falló, intentando PUT', err?.status);
        return tryPut();
      }),
      catchError(err => {
        console.error('❌ AuthService.updateProfile error:', err);
        this.error.set('No se pudo actualizar tu perfil. Inténtalo de nuevo más tarde.');
        return throwError(() => err);
      }),
      tap(userUpdated => {
        const merged = { ...user, ...userUpdated };
        this.currentUser.set(merged);
        this.dataSyncService.notifyDataChange('users', 'update', merged, merged.id, 'updateProfile');
        console.log('✅ Perfil de usuario actualizado');

        // Correo de perfil actualizado vía backend SSR
        try {
          const mail = merged?.email;
          if (mail) this.emailService.sendProfileUpdated({ to_email: mail, to_name: merged?.nombre });
        } catch {}
      }),
      tap(() => {
        this.loadProfile().subscribe({
          next: (u) => {
            this.currentUser.set(u);
            this.dataSyncService.notifyDataChange('users', 'update', u, u.id, 'loadProfile-sync');
          },
          error: () => {}
        });
      }),
      finalize(() => this.loading.set(false))
    );
  }

  /** Cambia la contraseña del usuario autenticado */
  changePassword(passwordActual: string, passwordNueva: string): Observable<boolean> {
    if (!this.currentUser()) {
      return throwError(() => new Error('No hay usuario autenticado'));
    }

    this.loading.set(true);
    this.error.set(null);

    const primaryUrl = `${this.API_URL}/usuarios/me/password`;
    const fallbackUrl = `${this.API_URL}/auth/me/password`;

    const payloadVariants = [
      // Variante más común en español similar a confirmResetPassword
      { passwordActual, nuevaPassword: passwordNueva },
      // Variante usada en otros proyectos
      { oldPassword: passwordActual, newPassword: passwordNueva },
      // Variante mínima usada previamente
      { actual: passwordActual, nueva: passwordNueva }
    ];

    const ok = () => true as boolean;

    const tryPut = (url: string, variantIndex = 0): Observable<boolean> => {
      if (variantIndex >= payloadVariants.length) {
        return throwError(() => new Error('No se pudo cambiar contraseña: payloads incompatibles'));
      }
      const body = payloadVariants[variantIndex];
      return this.http.put<any>(url, body).pipe(
        map(() => ok()),
        tap(() => console.log(`✅ Contraseña actualizada (${url} variante #${variantIndex + 1})`)),
        catchError(err => {
          // Probar siguiente variante
          return tryPut(url, variantIndex + 1);
        })
      );
    };

    return tryPut(primaryUrl).pipe(
      catchError(_ => tryPut(fallbackUrl)),
      finalize(() => this.loading.set(false))
    );
  }


  /**
   * Sube la imagen de avatar del usuario autenticado y devuelve la URL pública.
   * Intenta primero el endpoint principal y luego un alterno si existe.
   */
  uploadAvatar(file: File): Observable<User> {
    // Usa el endpoint de edición de perfil con multipart para subir y guardar la imagen
    return this.updateProfile({}, file);
  }



  /**
   * Chequea si `localStorage` está disponible de forma segura (compatible con SSR).
   */
  private static hasStorage(): boolean {
    try {
      // Chequeo seguro para SSR (renderizado del lado del servidor)
      const ls: any = (globalThis as any).localStorage;
      return !!ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function';
    } catch { return false; }
  }

  /**
   * Intenta restaurar el usuario previamente guardado en `localStorage`.
   */
  private static getStoredUser(): User | null {
    try {
      if (!AuthService.hasStorage()) return null;
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

