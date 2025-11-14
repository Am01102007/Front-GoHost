# Despliegue en Railway (Frontend SSR + API directa al backend)

Este documento describe cómo desplegar el frontend `AppAlojamiento` en Railway usando SSR de producción y cómo configurar el acceso directo al backend. El proxy `/api` del SSR es opcional y debe usarse solo en desarrollo.

## Servicios y carpetas
- **Frontend**: carpeta `AppAlojamiento/` (Angular SSR)
- **Backend**: servicio separado en el mismo proyecto Railway (Spring/Node/etc.)

## Configuración del servicio Frontend
- `Root Directory`: `AppAlojamiento/`
- `Install Command`: `npm ci`
- `Build Command`: `npm run build`
- `Start Command`: `npm start`
  - Este comando arranca el servidor SSR de producción (`node dist/AppAlojamientoTmp/server/server.mjs`). No usa `ng serve` ni tooling de desarrollo, por lo que evita problemas de memoria.

### Variables de entorno (Frontend)
- `API_TARGET`: origen del backend (sin sufijos de ruta). Ejemplos:
  - Fijo: `https://backend-gohost-production.up.railway.app`
  - Recomendado (referencia automática si ambos servicios están en el mismo proyecto):
    - `https://${{ backend.RAILWAY_PUBLIC_DOMAIN }}`
    - Ajusta `backend` al nombre real del servicio backend en Railway.
- `ENABLE_SSR_API_PROXY`: opcional. Si `true`, habilita el proxy `/api` en el SSR. Por defecto no se registra en producción; el cliente llama directamente al backend.

> Nota: El SSR tiene un fallback integrado. Si `API_TARGET` no está definido:
> - En producción usa `https://backend-gohost-production.up.railway.app`.
> - En desarrollo usa `http://127.0.0.1:8081`.
> Aun así, se recomienda definir `API_TARGET` explícitamente en Railway.

### Variables de entorno (Backend)
- `CORS_ALLOWED_ORIGINS`: incluye el dominio público del frontend. Ejemplo:
  - `https://front-gohost-production.up.railway.app`
  - Si usas dominio custom para el frontend, añádelo también (separados por comas).

## Redeploy y logs
1. Configura las variables y comandos del servicio Frontend.
2. Pulsa “Redeploy”.
3. En logs espera:
   - `Node Express server listening on http://localhost:<PORT>`
   - `[SSR] API proxy target: https://...` (muestra el destino de `API_TARGET`)

## Verificación
- `https://<dominio-frontend>/env.js`
  - Debe contener: `API_BASE_URL: 'https://<dominio-backend>/api'`.
- `https://<dominio-backend>/api/alojamientos?page=0&size=12`
  - Debe responder **200** con datos.
- `https://<dominio-frontend>/reserva/123`
  - Debe renderizar correctamente vía SSR.

## Proxy `/api` (opcional)
- Si `ENABLE_SSR_API_PROXY=true`, las peticiones que empiezan por `/api` en el SSR se envían al `API_TARGET`.
- Recomendación: en producción, que el cliente llame directo al backend público (`https://<dominio-backend>/api/...`) y mantener el proxy deshabilitado.

## Errores comunes y soluciones
- **503: Service Unavailable – "API target no configurado"**
  - Define `API_TARGET` en el servicio Frontend y redeploya.
  - Asegúrate de usar protocolo `https://` y solo el origen (sin `'/api'`).
- **“Killed” durante arranque**
  - Railway mató procesos de desarrollo por memoria. Usa `Start Command: npm start` (SSR de producción).
- **Build fallando por memoria (esbuild)**
  - Evita prerender general con comodín. La ruta `'**'` está configurada en modo `Server` para reducir memoria en build.

## Desarrollo local
- `npm run start:dev` en `AppAlojamiento/` corre `ng serve` con `proxy.conf.json`.
- Para SSR local de producción: `npm start` (requiere build previo `npm run build`).

## Cambios relevantes en el código
- `src/server.ts`:
  - `resolveApiTarget()` obtiene `API_TARGET` de entorno, con fallback a Railway/localhost.
  - `/env.js` expone `window.__ENV__.API_BASE_URL` siempre con sufijo `/api`.
  - Proxy `/api` solo se registra si `ENABLE_SSR_API_PROXY=true`.
  - Logs informan el target del proxy en arranque.

