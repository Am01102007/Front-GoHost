import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Rutas manejadas por el servidor (SSR).
 *
 * Define qué paths se renderizan totalmente en el servidor (`Server`)
 * y cuáles se prerenderizan estáticamente (`Prerender`).
 * Esto mejora SEO y tiempos de primera carga en páginas clave.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'alojamientos/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'editar-alojamiento/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'metricas/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'reserva/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
