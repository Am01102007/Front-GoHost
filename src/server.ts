import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
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
// Compresión de respuestas dinámicas para reducir TTFB y tamaño
app.use(compression({ threshold: 1024 }));
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
// Target activo seleccionado por salud
let ACTIVE_API_BASE = resolveApiTarget();
async function selectHealthyApiBase() {
  const primary = resolveApiTarget();
  const remote = 'https://backend-gohost-production.up.railway.app';
  const candidates = [primary, remote];
  for (const base of candidates) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 1500);
      const r = await fetch(`${base}/health`, { method: 'GET', signal: ctrl.signal });
      clearTimeout(to);
      if (r.ok) {
        ACTIVE_API_BASE = base;
        return;
      }
    } catch {}
  }
  ACTIVE_API_BASE = primary;
}
void selectHealthyApiBase();
setInterval(() => void selectHealthyApiBase(), 60_000);

// Caché simple en memoria para GET públicos
type CacheEntry = { ts: number; status: number; headers: [string, string][]; data: Buffer };
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000;

function canCache(pathname: string, hasAuth: boolean) {
  if (hasAuth) return false;
  // Cachear listados y métricas públicas
  return pathname.startsWith('/api/alojamientos');
}

async function timedFetch(url: string, init: RequestInit, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(to);
  }
}

/**
 * Proxy de API: reenvía las peticiones que comienzan con /api.
 */
app.use('/api', async (req, res) => {
  const API_TARGET = ACTIVE_API_BASE;

  const method = req.method;
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers[key] = value;
  }
  delete headers['host'];
  delete headers['connection'];
  delete headers['content-length'];
  delete headers['origin'];
  delete headers['referer'];
  const hasAuthHeader = !!headers['authorization'];
  if (hasAuthHeader) {
    const auth = headers['authorization'].trim();
    if (!auth || /^Bearer\s*(null|undefined)?$/i.test(auth)) {
      delete headers['authorization'];
      
      
    }
  }

  const getBodyBuffer = (): Buffer | undefined => {
    if (method === 'GET' || method === 'HEAD') return undefined;
    const parsed = (req as any).body;
    if (parsed && typeof parsed === 'object') {
      const raw = Buffer.from(JSON.stringify(parsed));
      if (!headers['content-type']) headers['content-type'] = 'application/json';
      return raw;
    }
    return undefined;
  };

  const ensureBody = async (): Promise<Buffer | undefined> => {
    const fromParsed = getBodyBuffer();
    if (fromParsed) return fromParsed;
    const chunks: Buffer[] = [];
    const msg = req as IncomingMessage;
    if (msg.readableEnded) {
      return chunks.length ? Buffer.concat(chunks) : undefined;
    }
    await new Promise<void>((resolve, reject) => {
      msg.on('data', (chunk: Buffer) => chunks.push(chunk));
      msg.on('end', () => resolve());
      msg.on('error', (e) => reject(e));
    });
    const buf = Buffer.concat(chunks);
    if (buf.length && !headers['content-type']) headers['content-type'] = 'application/json';
    return buf.length ? buf : undefined;
  };

  const doFetch = async (base: string, body?: Buffer) => {
    const targetUrl = `${base}${req.originalUrl}`;
    const bodyInit = body ? new Uint8Array(body) : undefined;
    const response = await timedFetch(targetUrl, { method, headers, body: bodyInit as any });
    return { response, targetUrl } as const;
  };

  try {
    const body = await ensureBody();
    // Cache rápido para GET públicos
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const now = Date.now();
    if (method === 'GET' && canCache(req.originalUrl, !!headers['authorization'])) {
      const hit = apiCache.get(cacheKey);
      if (hit && (now - hit.ts) < CACHE_TTL_MS) {
        res.status(hit.status);
        for (const [name, value] of hit.headers) res.setHeader(name, value);
        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=120');
        res.send(hit.data);
        return;
      }
    }

    const { response } = await doFetch(API_TARGET, body);
    const status = response.status;
    const headersOut: [string, string][] = [];
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (lower === 'content-encoding' || lower === 'transfer-encoding') return;
      headersOut.push([name, value]);
      res.setHeader(name, value);
    });
    const buf = Buffer.from(await response.arrayBuffer());
    if (method === 'GET' && status === 200 && canCache(req.originalUrl, hasAuthHeader)) {
      apiCache.set(cacheKey, { ts: now, status, headers: headersOut, data: buf });
      res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=120');
    }
    res.status(status);
    res.send(buf);
  } catch (err: any) {
    res.status(502).json({ error: 'Bad Gateway', detail: err?.message ?? 'Proxy failed' });
  }
});
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
  const base = resolveApiTarget();
  const isProd = process.env['NODE_ENV'] === 'production';
  const apiBaseUrl = isProd
    ? `${base}/api`
    : (process.env['ENABLE_SSR_API_PROXY'] === 'true' ? '/api' : `${base}/api`);
  // Proveedor de correo: por defecto 'backend' (correo lo envía el backend)
  const mailProvider = 'backend';
  const mailEnabled = isProd ? 'true' : (process.env['MAIL_ENABLED'] ?? 'false');
  const payloadObj = {
    API_BASE_URL: apiBaseUrl,
    MAIL_PROVIDER: mailProvider,
    MAIL_ENABLED: mailEnabled,
  };
  const payload = `window.__ENV__ = Object.assign({}, window.__ENV__, ${JSON.stringify(payloadObj)});`;
  res.send(payload);
});

// Healthcheck SSR que consulta el backend
app.get('/health', async (req, res) => {
  try {
    const base = resolveApiTarget();
    const url = `${base}/health`;
    const response = await fetch(url, { method: 'GET' });
    res.status(response.status);
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (lower === 'content-encoding' || lower === 'transfer-encoding') return;
      res.setHeader(name, value);
    });
    const buf = Buffer.from(await response.arrayBuffer());
    res.send(buf);
  } catch (err: any) {
    res.status(503).json({ status: 'DOWN', error: err?.message || 'healthcheck failed' });
  }
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
    const target = ACTIVE_API_BASE;
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`[SSR] API proxy target: ${target}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
