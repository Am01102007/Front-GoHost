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
const angularApp = new AngularNodeAppEngine();

/**
 * Proxy de API: reenvía todas las peticiones que comienzan con /api.
 * En desarrollo, se envía al proxy simple con mocks en http://localhost:4004
 * para evitar 502 cuando el backend no está disponible.
 * Debe estar registrado ANTES de los handlers de estáticos y SSR.
 */
app.use('/api', (req, res) => {
  // Permite configurar el destino vía variable de entorno; por defecto usar el proxy simple.
  const API_TARGET = process.env['API_TARGET'] || 'http://localhost:4004';
  const targetUrl = `${API_TARGET}${req.originalUrl}`;

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

      try {
        const response = await fetch(targetUrl, {
          method,
          headers,
          body
        });

        res.status(response.status);
        response.headers.forEach((value, name) => {
          const lower = name.toLowerCase();
          // No propagar content-encoding ni transfer-encoding para evitar conflictos
          // con Content-Length que Express establece en res.send(Buffer).
          if (lower === 'content-encoding' || lower === 'transfer-encoding') {
            return;
          }
          res.setHeader(name, value);
        });

        const arrayBuf = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
      } catch (err: any) {
        const detail = {
          url: targetUrl,
          message: err?.message,
          name: err?.name,
          code: err?.code ?? err?.cause?.code,
          cause: err?.cause?.message ?? String(err?.cause ?? ''),
        };
        console.error('API proxy error:', detail);
        res.status(502).json({
          error: 'Bad Gateway',
          detail: err?.message ?? 'Proxy failed'
        });
      }
    })
    .on('error', (err) => {
      console.error('Proxy request stream error:', err);
      res.status(400).json({ error: 'Bad Request', detail: 'Stream error' });
    });
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
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

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

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
