# Plantillas EmailJS

Define estas plantillas en tu cuenta de EmailJS y reemplaza los placeholders en `public/env.js` por los `Template ID` reales (formato típico `template_abc123`).

Variables comunes disponibles en todas las plantillas:
- `to_email`: destinatario
- `to_name`: nombre del destinatario (opcional)

## 1) Bienvenida (`EMAILJS_TEMPLATE_ID_WELCOME`)
- Asunto sugerido: `¡Bienvenido a GoHost, {{to_name}}!`
- Cuerpo (texto):
  - `Hola {{to_name}},`
  - `Tu cuenta ha sido creada correctamente. Ya puedes iniciar sesión y reservar alojamientos.`

## 2) Reserva creada (`EMAILJS_TEMPLATE_ID_BOOKING_CREATED`)
Parámetros usados:
- `alojamientoId`, `fechaInicio`, `fechaFin`, `huespedes`, `huesped_email` (opcional), `huesped_nombre` (opcional)

Asunto: `Solicitud de reserva creada para {{alojamientoId}}`
Cuerpo:
- `Tu solicitud de reserva ha sido registrada.`
- `Alojamiento: {{alojamientoId}}`
- `Fechas: {{fechaInicio}} a {{fechaFin}}`
- `Huéspedes: {{huespedes}}`

## 3) Reserva pagada/confirmada (`EMAILJS_TEMPLATE_ID_BOOKING_PAID`)
Parámetros usados:
- `alojamientoId`, `fechaInicio`, `fechaFin`, `huespedes` (opcional), `recipient_role` (`HUESPED` | `ANFITRION`)

Asunto: `Reserva confirmada para {{alojamientoId}}`
Cuerpo:
- `Tu reserva fue confirmada.`
- `Rol: {{recipient_role}}`
- `Fechas: {{fechaInicio}} a {{fechaFin}}`
- `Huéspedes: {{huespedes}}`

## 4) Reserva cancelada (`EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED`)
Parámetros usados:
- `alojamientoId`, `fechaInicio`, `fechaFin`, `motivo` (opcional), `recipient_role`

Asunto: `Reserva cancelada para {{alojamientoId}}`
Cuerpo:
- `Tu reserva fue cancelada.`
- `Motivo: {{motivo}}`
- `Rol: {{recipient_role}}`

## 5) Restablecimiento solicitado (`EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED`)
Parámetros usados:
- `to_email`, `to_name` (opcional)

Asunto: `Solicitud de restablecimiento de contraseña`
Cuerpo:
- `Hemos recibido una solicitud para restablecer tu contraseña.`
- `Sigue las instrucciones enviadas por el sistema.`

## 6) Contraseña cambiada (`EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED`)
Parámetros usados:
- `to_email`, `to_name` (opcional)

Asunto: `Tu contraseña ha sido actualizada`
Cuerpo:
- `Confirmamos que tu contraseña fue cambiada exitosamente.`

## 7) Perfil actualizado (`EMAILJS_TEMPLATE_ID_PROFILE_UPDATED`)
Parámetros usados:
- `to_email`, `to_name` (opcional)

Asunto: `Tu perfil ha sido actualizado`
Cuerpo:
- `Hemos recibido y guardado los cambios de tu perfil.`

## Pasos para activar
1. Crea cada plantilla en EmailJS con el contenido anterior.
2. Copia el `Template ID` de EmailJS y actualiza `public/env.js`:
   - `EMAILJS_TEMPLATE_ID_WELCOME: 'template_xxxxxx'`
   - `EMAILJS_TEMPLATE_ID_BOOKING_CREATED: 'template_xxxxxx'`
   - `EMAILJS_TEMPLATE_ID_BOOKING_PAID: 'template_xxxxxx'`
   - `EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED: 'template_xxxxxx'`
   - `EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED: 'template_xxxxxx'`
   - `EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED: 'template_xxxxxx'`
   - `EMAILJS_TEMPLATE_ID_PROFILE_UPDATED: 'template_xxxxxx'`
3. Despliega y prueba un flujo (registro o aceptar/cancelar reserva). Observa la consola: si faltan IDs, verás un aviso.

