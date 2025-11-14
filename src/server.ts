import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { IncomingMessage } from 'node:http';
import { join } from 'node:path';

// Asegurar que las llamadas locales no pasen por proxies del sistema
process.env['NO_PROXY'] = [
  process.env['NO_PROXY'],
  'localhost',
  '127.0.0.1'
].filter(Boolean).join(',');
process.env['HTTP_PROXY'] = process.env['HTTP_PROXY'] ?? '';
process.env['HTTPS_PROXY'] = process.env['HTTPS_PROXY'] ?? '';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Seguridad básica y compatibilidad de respuestas
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Por defecto, no cachear respuestas dinámicas
  if (!req.url.startsWith('/assets') && !req.url.startsWith('/env.js')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
const angularApp = new AngularNodeAppEngine();

// Parse JSON bodies for custom endpoints
app.use(express.json({ limit: '1mb' }));
// Resuelve el destino del backend para el proxy de API.
// En producción (Railway), usa el dominio público del backend;
// en desarrollo, apunta a localhost.
function resolveApiTarget(): string {
  const envTarget = process.env['API_TARGET']
    || process.env['VITE_API_BASE_URL']
    || process.env['REACT_APP_API_BASE_URL'];
  if (envTarget) return envTarget;
  const fallback = process.env['NODE_ENV'] === 'production'
    ? 'https://backend-gohost-production.up.railway.app'
    : 'http://127.0.0.1:8081';
  return fallback;
}

// Segundo destino de respaldo cuando el primario falla en desarrollo
function resolveApiFallbackTarget(primary: string): string | null {
  // Si ya es remoto, no tiene sentido intentar otro
  if (/^https?:\/\//.test(primary) && !/localhost|127\.0\.0\.1/.test(primary)) {
    return null;
  }
  // Apunta al backend remoto publicado en Railway
  return 'https://backend-gohost-production.up.railway.app';
}

/**
 * Proxy de API (opcional): reenvía las peticiones que comienzan con /api.
 * Habilitar sólo si `ENABLE_SSR_API_PROXY=true` en entorno.
 * En desarrollo, apunta a localhost; en prod, se recomienda que el cliente
 * llame directo al backend público y no depender de este proxy.
 */
if (process.env['ENABLE_SSR_API_PROXY'] === 'true') {
  app.use('/api', (req, res) => {
  // Resuelve el destino vía variable de entorno, con fallback sensible.
  const API_TARGET = resolveApiTarget();
  const API_FALLBACK = resolveApiFallbackTarget(API_TARGET);

  const method = req.method;
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers[key] = value;
  }
  delete headers['host'];
  delete headers['connection'];
  delete headers['content-length'];
  // Evitar que el backend active CORS por orígenes dinámicos del dev server
  delete headers['origin'];
  delete headers['referer'];

  // Evitar pasar Authorization inválido (p.ej., "Bearer null" o vacío)
  if (headers['authorization']) {
    const auth = headers['authorization'].trim();
    if (!auth || /^Bearer\s*(null|undefined)?$/i.test(auth)) {
      delete headers['authorization'];
    }
  }

  const chunks: Buffer[] = [];

  (req as IncomingMessage)
    .on('data', (chunk: Buffer) => chunks.push(chunk))
    .on('end', async () => {
      const bodyBuffer = Buffer.concat(chunks);
      const body = (method === 'GET' || method === 'HEAD')
        ? undefined
        : (bodyBuffer.length ? bodyBuffer : undefined);

      // Helper para intentar un destino
      const doFetch = async (base: string) => {
        const targetUrl = `${base}${req.originalUrl}`;
        const response = await fetch(targetUrl, { method, headers, body });
        return { response, targetUrl } as const;
      };

      try {
        let { response, targetUrl } = await doFetch(API_TARGET);
        // Si el primario devuelve 5xx y tenemos fallback, intentar remoto
        if (response.status >= 500 && API_FALLBACK) {
          console.warn(`[SSR] API primario ${API_TARGET} respondió ${response.status}. Intentando fallback...`);
          ({ response, targetUrl } = await doFetch(API_FALLBACK));
        }

        res.status(response.status);
        response.headers.forEach((value, name) => {
          const lower = name.toLowerCase();
          if (lower === 'content-encoding' || lower === 'transfer-encoding') return;
          res.setHeader(name, value);
        });
        const arrayBuf = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
      } catch (err: any) {
        // Intentar un fetch de respaldo si falló por red/ECONNREFUSED
        if (API_FALLBACK) {
          try {
            console.warn(`[SSR] API primario ${API_TARGET} falló (${err?.code || err?.message}). Intentando fallback...`);
            const { response } = await doFetch(API_FALLBACK);
            res.status(response.status);
            response.headers.forEach((value, name) => {
              const lower = name.toLowerCase();
              if (lower === 'content-encoding' || lower === 'transfer-encoding') return;
              res.setHeader(name, value);
            });
            const arrayBuf = await response.arrayBuffer();
            res.send(Buffer.from(arrayBuf));
            return;
          } catch (err2: any) {
            const detail = {
              primary: API_TARGET,
              fallback: API_FALLBACK,
              message: err2?.message,
              name: err2?.name,
              code: err2?.code ?? err2?.cause?.code,
              cause: err2?.cause?.message ?? String(err2?.cause ?? ''),
            };
            console.error('API proxy error (fallback):', detail);
          }
        }
        res.status(502).json({ error: 'Bad Gateway', detail: err?.message ?? 'Proxy failed' });
      }
    })
    .on('error', (err) => {
      console.error('Proxy request stream error:', err);
      res.status(400).json({ error: 'Bad Request', detail: 'Stream error' });
    });
});
}
/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Endpoint de configuración runtime: /env.js
 * Debe declararse ANTES de static para sobrescribir el archivo generado.
 * Expone window.__ENV__.API_BASE_URL para que el cliente use el backend correcto.
 */
app.get('/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  // API base: si estamos en localhost, usar proxy SSR '/api' para evitar CORS;
  // en producción, apuntar al backend remoto público.
  const isLocalHost = /localhost|127\.0\.0\.1/i.test(req.hostname || '');
  let apiBaseUrl: string;
  if (isLocalHost) {
    apiBaseUrl = '/api';
  } else {
    const rawTarget = process.env['API_TARGET'] || 'https://backend-gohost-production.up.railway.app';
    const normalizedTarget = rawTarget.endsWith('/') ? rawTarget.slice(0, -1) : rawTarget;
    apiBaseUrl = normalizedTarget.endsWith('/api') ? normalizedTarget : `${normalizedTarget}/api`;
  }
  // Proveedor de correo: por defecto 'backend' (correo lo envía el backend)
  const mailProvider = process.env['MAIL_PROVIDER'] || 'backend';
  const payloadObj = {
    API_BASE_URL: apiBaseUrl,
    MAIL_PROVIDER: mailProvider,
  };
  const payload = `window.__ENV__ = Object.assign({}, window.__ENV__, ${JSON.stringify(payloadObj)});`;
  res.send(payload);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      // Cache estático fuerte con immutable para assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }),
);

/**
 * Endpoint de configuración runtime: /env.js
 * Expone window.__ENV__.API_BASE_URL para que el cliente use el backend correcto.
 */

/**
 * Endpoint de envío de correo vía SSR usando Nodemailer (Elastic Email)
 * Variables de entorno requeridas (NO se exponen al cliente):
 * - MAIL_PROVIDER=ssrsmtp
 * - SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
 * - SMTP_FROM_EMAIL, SMTP_FROM_NAME
 * Body esperado:
 * { type: string, to: string, data: object }
 */
// Mail SSR eliminado: el backend gestiona el envío de correos

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    const target = resolveApiTarget();
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`[SSR] API proxy target: ${target}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
