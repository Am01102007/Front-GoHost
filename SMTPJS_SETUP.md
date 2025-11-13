SMTP.js en AppAlojamiento

Resumen
- Este proyecto puede enviar correos desde el frontend usando SMTP.js (cliente) o EmailJS.
- Por solicitud, MAIL_PROVIDER queda en `smtpjs` por defecto.

Requisitos SMTP.js (Mailtrap)
- Cuenta de Mailtrap con credenciales SMTP del inbox (Host, Puerto, Usuario, Password).
- Variables en entorno del frontend SSR (Railway/Local):
  - `MAIL_PROVIDER=smtpjs`
  - `SMTP_HOST=smtp.mailtrap.io`
  - `SMTP_PORT=2525`
  - `SMTP_USERNAME=<tu usuario SMTP>`
  - `SMTP_PASSWORD=<tu password SMTP>`
  - `SMTP_FROM_EMAIL=no-reply@example.test`
  - `SMTP_FROM_NAME=GoHost`

Dónde se configuran
- SSR `/env.js` expone todas las claves a `window.__ENV__`.
- Desarrollo: `public/env.js` tiene placeholders; no agregar secretos reales al repositorio.

Cómo funciona
- `src/index.html` incluye `<script src="https://smtpjs.com/v3/smtp.js"></script>`.
- `EmailService` detecta `MAIL_PROVIDER='smtpjs'` y llama `Email.send(...)` con tus valores SMTP.
- No se requieren plantillas; el cuerpo del email se construye en código.

Seguridad
- Incluir credenciales SMTP en el cliente no es seguro. Para producción se recomienda un endpoint backend (Mailtrap API) o un SMTP en el servidor.

Prueba rápida
1. Configura variables en tu entorno de despliegue (Railway) o en tu `.env` local exportadas al proceso del SSR.
2. Registra un usuario. Deberías ver notificación de bienvenida y recibir el correo.
3. Prueba reset de contraseña y cambios de perfil para correos adicionales.

Referencia
- Guía: https://mailtrap.io/es/blog/javascript-send-email/#Enviar-emails-usando-SMTPjs
