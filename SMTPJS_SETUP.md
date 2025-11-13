Envío de correos seguro en AppAlojamiento (SSR + Nodemailer)

Resumen
- El proyecto envía correos desde el servidor (SSR) usando Nodemailer contra Elastic Email.
- `MAIL_PROVIDER` queda en `ssrsmtp` por defecto. EmailJS sigue disponible como fallback.

Requisitos (Elastic Email)
- Cuenta de Elastic Email con credenciales SMTP (Host, Puerto, Usuario, Password).
- Variables en entorno del frontend SSR (Railway/Local):
  - `MAIL_PROVIDER=ssrsmtp`
  - `SMTP_HOST=smtp.elasticemail.com`
  - `SMTP_PORT=2525`
  - `SMTP_USERNAME=<usuario smtp>`
  - `SMTP_PASSWORD=<password smtp>`
  - `SMTP_FROM_EMAIL=<from email>`
  - `SMTP_FROM_NAME=GoHost`

Dónde se configuran
- SSR no expone credenciales SMTP al cliente; sólo `MAIL_PROVIDER` y claves públicas de EmailJS.
- Desarrollo: `public/env.js` no contiene secretos. Los secretos van en variables de entorno del servidor.

Cómo funciona
- `EmailService` detecta `MAIL_PROVIDER='ssrsmtp'` y envía al endpoint `/mail/send` con `{ type, to, data }`.
- El SSR compone la plantilla HTML según `type` y envía vía Nodemailer a Elastic Email.

Seguridad
- Las credenciales SMTP nunca se exponen al cliente. El envío se realiza exclusivamente en el servidor.

Prueba rápida
1. Configura variables en tu entorno de despliegue (Railway) o en tu `.env` local exportadas al proceso del SSR.
2. Registra un usuario. Deberías ver notificación de bienvenida y recibir el correo.
3. Prueba reset de contraseña y cambios de perfil para correos adicionales.

Referencia
- Nodemailer: https://nodemailer.com/about/
- Elastic Email SMTP: https://elasticemail.com/developers/documentation/smtp
