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
 * Proxy de API: reenvía todas las peticiones que comienzan con /api.
 * En desarrollo, se envía al backend en http://localhost:8081
 * para evitar 502 cuando el backend no está disponible.
 * Debe estar registrado ANTES de los handlers de estáticos y SSR.
 */
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
 * Endpoint de configuración runtime: /env.js
 * Expone window.__ENV__.API_BASE_URL para que el cliente use el backend correcto.
 */
app.get('/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  // Fijar siempre '/api' como base para el cliente, en cualquier entorno.
  // El SSR reenvía '/api/*' al backend configurado por API_TARGET.
  const apiBaseUrl = '/api';
  // Proveedor de correo (emailjs | mailtrap)
  const mailProvider = process.env['MAIL_PROVIDER'] || 'smtpjs';
  // Claves de EmailJS tomadas del entorno del servidor (Railway/Local)
  const emailPublic = process.env['EMAILJS_PUBLIC_KEY'] || '';
  const emailService = process.env['EMAILJS_SERVICE_ID'] || '';
  const emailTemplateBookingCreated = process.env['EMAILJS_TEMPLATE_ID_BOOKING_CREATED'] || '';
  const emailTemplateBookingPaid = process.env['EMAILJS_TEMPLATE_ID_BOOKING_PAID'] || '';
  const emailTemplateBookingCancelled = process.env['EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED'] || '';
  const emailTemplatePasswordResetRequested = process.env['EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED'] || '';
  const emailTemplatePasswordChanged = process.env['EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED'] || '';
  const emailTemplateWelcome = process.env['EMAILJS_TEMPLATE_ID_WELCOME'] || '';
  const emailTemplateProfileUpdated = process.env['EMAILJS_TEMPLATE_ID_PROFILE_UPDATED'] || '';
  // Config SMTP para SMTP.js (Mailtrap)
  const smtpHost = process.env['SMTP_HOST'] || '';
  const smtpPort = process.env['SMTP_PORT'] || '';
  const smtpUsername = process.env['SMTP_USERNAME'] || '';
  const smtpPassword = process.env['SMTP_PASSWORD'] || '';
  const smtpFromEmail = process.env['SMTP_FROM_EMAIL'] || '';
  const smtpFromName = process.env['SMTP_FROM_NAME'] || '';
  const payloadObj = {
    API_BASE_URL: apiBaseUrl,
    MAIL_PROVIDER: mailProvider,
    EMAILJS_PUBLIC_KEY: emailPublic,
    EMAILJS_SERVICE_ID: emailService,
    EMAILJS_TEMPLATE_ID_BOOKING_CREATED: emailTemplateBookingCreated,
    EMAILJS_TEMPLATE_ID_BOOKING_PAID: emailTemplateBookingPaid,
    EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED: emailTemplateBookingCancelled,
    EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED: emailTemplatePasswordResetRequested,
    EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED: emailTemplatePasswordChanged,
    EMAILJS_TEMPLATE_ID_WELCOME: emailTemplateWelcome,
    EMAILJS_TEMPLATE_ID_PROFILE_UPDATED: emailTemplateProfileUpdated,
    SMTP_HOST: smtpHost,
    SMTP_PORT: smtpPort,
    SMTP_USERNAME: smtpUsername,
    SMTP_PASSWORD: smtpPassword,
    SMTP_FROM_EMAIL: smtpFromEmail,
    SMTP_FROM_NAME: smtpFromName,
  };
  const payload = `window.__ENV__ = Object.assign({}, window.__ENV__, ${JSON.stringify(payloadObj)});`;
  res.send(payload);
});

/**
 * Endpoint de envío de correo vía Mailtrap
 * Requiere variables de entorno:
 * - MAIL_PROVIDER=mailtrap
 * - MAILTRAP_API_TOKEN (Bearer)
 * - MAILTRAP_FROM_EMAIL
 * - MAILTRAP_FROM_NAME (opcional)
 */
app.post('/mail/send', async (req, res) => {
  try {
    const provider = process.env['MAIL_PROVIDER'] || 'emailjs';
    if (provider !== 'mailtrap') {
      res.status(501).json({ error: 'Mail provider not enabled', provider });
      return;
    }

    const token = process.env['MAILTRAP_API_TOKEN'];
    const fromEmail = process.env['MAILTRAP_FROM_EMAIL'];
    const fromName = process.env['MAILTRAP_FROM_NAME'] || 'GoHost';
    if (!token || !fromEmail) {
      res.status(500).json({ error: 'Mailtrap not configured', missing: { token: !token, fromEmail: !fromEmail } });
      return;
    }

    const { to, subject, text, html, cc, bcc } = req.body || {};
    const toEmail = typeof to === 'string' ? to : to?.email;
    if (!toEmail || !subject) {
      res.status(400).json({ error: 'Missing required fields', required: ['to', 'subject'] });
      return;
    }

    const payload: any = {
      from: { email: fromEmail, name: fromName },
      to: [{ email: toEmail }],
      subject,
    };
    if (text) payload.text = String(text);
    if (html) payload.html = String(html);
    if (Array.isArray(cc)) payload.cc = cc.map((e: any) => ({ email: e?.email || e }));
    if (Array.isArray(bcc)) payload.bcc = bcc.map((e: any) => ({ email: e?.email || e }));

    const resp = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const respText = await resp.text();
    let json: any = null;
    try { json = JSON.parse(respText); } catch { json = { raw: respText }; }

    if (resp.ok) {
      res.status(200).json({ ok: true, result: json });
    } else {
      res.status(resp.status).json({ ok: false, status: resp.status, result: json });
    }
  } catch (err: any) {
    console.error('Mailtrap send error:', { message: err?.message, name: err?.name });
    res.status(500).json({ error: 'Internal Server Error', detail: err?.message || 'Unknown error' });
  }
});

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
