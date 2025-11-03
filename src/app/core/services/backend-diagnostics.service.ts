import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, timeout } from 'rxjs';
import { NotificationsService } from './notifications.service';

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
    const health$ = this.probe('Health', '/actuator/health');
    const listings$ = this.probe('Alojamientos', '/api/alojamientos');
    const bookingsMine$ = this.probe('Reservas propias', '/api/reservas/mias');

    return forkJoin([health$, listings$, bookingsMine$]).pipe(
      map(results => ({ results, totalMs: Date.now() - t0 }))
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
}
