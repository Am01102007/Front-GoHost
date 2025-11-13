SMTP.js en AppAlojamiento

Resumen
- Este proyecto puede enviar correos desde el frontend usando SMTP.js (cliente) o EmailJS.
- Por solicitud, MAIL_PROVIDER queda en `smtpjs` por defecto.

Requisitos SMTP.js (Elastic Email)
- Cuenta de Elastic Email con credenciales SMTP (Host, Puerto, Usuario, Password).
- Variables en entorno del frontend SSR (Railway/Local):
  - `MAIL_PROVIDER=smtpjs`
  - `SMTP_HOST=smtp.elasticemail.com`
  - `SMTP_PORT=2525`
  - `SMTP_USERNAME=mhernandezg_1@uqvirtual.edu.co`
  - `SMTP_PASSWORD=8A00CC95A838C912A883269254ABE0CCFA8A`
  - `SMTP_FROM_EMAIL=mhernandezg_1@uqvirtual.edu.co`
  - `SMTP_FROM_NAME=GoHost`

Dónde se configuran
- SSR `/env.js` expone todas las claves a `window.__ENV__`.
- Desarrollo: `public/env.js` está configurado con tus credenciales de Elastic Email (usadas sólo por tu solicitud para facilitar pruebas).

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
- Guía SMTP.js: https://mailtrap.io/es/blog/javascript-send-email/#Enviar-emails-usando-SMTPjs
- Elastic Email SMTP: https://elasticemail.com/developers/documentation/smtp
