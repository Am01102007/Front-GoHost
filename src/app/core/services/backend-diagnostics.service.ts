import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, timeout } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { API_BASE } from '../../core/config';

interface CheckResult {
  name: string;
  ok: boolean;
  status?: number;
  durationMs?: number;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class BackendDiagnosticsService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationsService);

  /** Ejecuta diagnósticos básicos al iniciar la app. */
  runOnStartup(): void {
    // No ejecutar diagnósticos en SSR para evitar llamadas durante build/render.
    if (typeof window === 'undefined') {
      console.warn('[diagnostics] omitido: SSR activo');
      return;
    }
    // Si el backend no está claramente configurado, omitir diagnósticos.
    if (!this.isBackendConfigured()) {
      console.warn('[diagnostics] omitido: backend no configurado (API_BASE=', API_BASE, ')');
      return;
    }
    this.runChecks().subscribe(({ results }) => {
      const allOk = results.every(r => r.ok);
      const summary = results.map(r => `${r.name}: ${r.ok ? 'OK' : 'FAIL'}${r.status ? ` (${r.status})` : ''}`).join(' | ');
      if (!allOk) {
        this.notifications.notify('warning', `Diagnóstico backend incompleto: ${summary}`);
      } else {
        this.notifications.notify('info', 'Backend operativo');
      }
      // Log detallado para desarrolladores
      console.log('[diagnostics] resultados', results);
    });
  }

  /** Ejecuta health check y endpoints clave (público y protegido). */
  runChecks() {
    const t0 = Date.now();
    // Usamos API_BASE (inyectado vía /env.js) para hacer llamadas directas al backend
    const health$ = this.probe('Health', `${API_BASE}/alojamientos?page=0&size=1`);
    const listings$ = this.probe('Alojamientos', `${API_BASE}/alojamientos`);
    // Evitar llamar al endpoint protegido si no hay sesión/token para no generar 401 innecesarios en invitados
    let bookingsMine$;
    try {
      const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('auth_token');
      bookingsMine$ = hasToken
        ? this.probe('Reservas propias', `${API_BASE}/reservas/mias`)
        : of({ name: 'Reservas propias', ok: true, status: 401, durationMs: 0, detail: 'Auth requerida (no iniciada)' });
    } catch {
      // En SSR donde no hay localStorage, probamos normalmente (no estamos en navegador)
      bookingsMine$ = this.probe('Reservas propias', `${API_BASE}/reservas/mias`);
    }

    return forkJoin([health$, listings$, bookingsMine$]).pipe(
      map(results => {
        // Tratamos 401 en endpoint protegido como estado esperado si no hay sesión
        const normalized = results.map(r => {
          if (r.name === 'Reservas propias' && r.status === 401) {
            return { ...r, ok: true, detail: 'Auth requerida (no iniciada)' };
          }
          return r;
        });
        return { results: normalized, totalMs: Date.now() - t0 };
      })
    );
  }

  private probe(name: string, url: string) {
    const start = Date.now();
    return this.http.get(url, { observe: 'response' }).pipe(
      timeout({ each: 6000 }),
      map(resp => ({
        name,
        ok: resp.status >= 200 && resp.status < 400,
        status: resp.status,
        durationMs: Date.now() - start
      } as CheckResult)),
      catchError((err) => {
        const status: number | undefined = err?.status;
        const detail = typeof err?.error === 'string' ? err.error : (err?.message ?? 'Error');
        return of({
          name,
          ok: false,
          status,
          durationMs: Date.now() - start,
          detail
        } as CheckResult);
      })
    );
  }

  private isBackendConfigured(): boolean {
    // Consideramos configurado si API_BASE no es 'undefined' y si hay señal de configuración runtime.
    const env = (globalThis as any).__ENV__?.API_BASE_URL;
    if (!env || env === 'undefined') return false;
    return true;
  }
}
