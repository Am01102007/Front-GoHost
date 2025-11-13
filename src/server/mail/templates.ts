export type EmailRender = { subject: string; html: string; text?: string };

const baseStyles = 'font-family: Arial, sans-serif; color: #222; line-height:1.5;';
const brand = '<h1 style="font-size:20px; margin:0 0 12px">GoHost</h1>';
const footer = '<p style="font-size:12px; color:#666">Gracias por usar GoHost</p>';
const wrap = (title: string, body: string) => `<div style="${baseStyles}">${brand}<h2 style="font-size:18px">${title}</h2><div>${body}</div>${footer}</div>`;

export function renderWelcome(data: any): EmailRender {
  const subject = '¡Bienvenido a GoHost!';
  const html = wrap('Bienvenido', `<p>Hola ${data?.to_name || ''}, tu cuenta se creó correctamente.</p>`);
  const text = `Hola ${data?.to_name || ''}, tu cuenta se creó correctamente.`;
  return { subject, html, text };
}

export function renderBookingCreated(data: any): EmailRender {
  const subject = 'Reserva creada';
  const html = wrap('Reserva creada', `<p>Tu reserva se ha creado correctamente.</p><ul><li><b>Alojamiento:</b> ${data?.alojamientoId}</li><li><b>Fechas:</b> ${data?.fechaInicio} - ${data?.fechaFin}</li><li><b>Huéspedes:</b> ${data?.huespedes}</li></ul>`);
  const text = 'Tu reserva se ha creado correctamente.';
  return { subject, html, text };
}

export function renderBookingPaid(data: any): EmailRender {
  const subject = 'Reserva confirmada';
  const html = wrap('Reserva confirmada', `<p>Tu pago fue recibido y la reserva está confirmada.</p><ul><li><b>Fechas:</b> ${data?.fechaInicio} - ${data?.fechaFin}</li></ul>`);
  const text = 'Tu pago fue recibido y la reserva está confirmada.';
  return { subject, html, text };
}

export function renderBookingCancelled(data: any): EmailRender {
  const subject = 'Reserva cancelada';
  const motivo = data?.motivo ? `<li><b>Motivo:</b> ${data?.motivo}</li>` : '';
  const html = wrap('Reserva cancelada', `<p>Tu reserva fue cancelada.</p><ul><li><b>Fechas:</b> ${data?.fechaInicio} - ${data?.fechaFin}</li>${motivo}</ul>`);
  const text = 'Tu reserva fue cancelada.';
  return { subject, html, text };
}

export function renderPasswordResetRequested(data: any): EmailRender {
  const subject = 'Solicitud de restablecimiento de contraseña';
  const html = wrap('Restablecimiento de contraseña', `<p>Recibimos tu solicitud de restablecer la contraseña. Si no fuiste tú, puedes ignorar este mensaje.</p>`);
  const text = 'Recibimos tu solicitud de restablecer la contraseña.';
  return { subject, html, text };
}

export function renderPasswordChanged(data: any): EmailRender {
  const subject = 'Contraseña cambiada';
  const html = wrap('Contraseña cambiada', `<p>Tu contraseña ha sido cambiada correctamente.</p>`);
  const text = 'Tu contraseña ha sido cambiada correctamente.';
  return { subject, html, text };
}

export function renderProfileUpdated(data: any): EmailRender {
  const subject = 'Perfil actualizado';
  const html = wrap('Perfil actualizado', `<p>Tu perfil fue actualizado correctamente.</p>`);
  const text = 'Tu perfil fue actualizado correctamente.';
  return { subject, html, text };
}

export function render(type: string, data: any): EmailRender {
  switch ((type || '').toLowerCase()) {
    case 'welcome': return renderWelcome(data);
    case 'booking_created': return renderBookingCreated(data);
    case 'booking_paid': return renderBookingPaid(data);
    case 'booking_cancelled': return renderBookingCancelled(data);
    case 'password_reset_requested': return renderPasswordResetRequested(data);
    case 'password_changed': return renderPasswordChanged(data);
    case 'profile_updated': return renderProfileUpdated(data);
    default: {
      const subject = data?.subject || 'Notificación GoHost';
      const html = wrap('Notificación', `<p>${data?.message || 'Tienes una nueva notificación.'}</p>`);
      const text = data?.message || 'Tienes una nueva notificación.';
      return { subject, html, text };
    }
  }
}

