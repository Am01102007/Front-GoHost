import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptorFn } from './core/interceptors/auth.interceptor';
import { httpErrorInterceptorFn } from './core/interceptors/http-error.interceptor';
import { BackendDiagnosticsService } from './core/services/backend-diagnostics.service';

function diagnosticsStartupFactory(diag: BackendDiagnosticsService) {
  return () => diag.runOnStartup();
}

/**
 * Configuración principal de la aplicación Angular.
 *
 * Registra:
 * - Router con las rutas de la app.
 * - HttpClient con interceptores de autenticación y manejo de errores.
 * - Hidratación del cliente para SSR con reenvío de eventos.
 * - Listeners globales de errores y cambio de detección sin Zone.js.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptorFn, httpErrorInterceptorFn])),
    provideClientHydration(withEventReplay()),
    { provide: APP_INITIALIZER, useFactory: diagnosticsStartupFactory, deps: [BackendDiagnosticsService], multi: true }
  ]
};
