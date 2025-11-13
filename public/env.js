// Runtime config para frontend (dev): configura API y claves de EmailJS
(function(w){
  w.__ENV__ = Object.assign({}, w.__ENV__ || {}, {
    API_BASE_URL: w.__ENV__?.API_BASE_URL || '/api',
    // Selección del proveedor de correo: 'smtpjs' | 'emailjs'
    MAIL_PROVIDER: w.__ENV__?.MAIL_PROVIDER || 'smtpjs',
    // SMTP.js (Elastic Email)
    SMTP_HOST: w.__ENV__?.SMTP_HOST || 'smtp.elasticemail.com',
    SMTP_PORT: w.__ENV__?.SMTP_PORT || '2525',
    SMTP_USERNAME: w.__ENV__?.SMTP_USERNAME || 'mhernandezg_1@uqvirtual.edu.co',
    SMTP_PASSWORD: w.__ENV__?.SMTP_PASSWORD || '8A00CC95A838C912A883269254ABE0CCFA8A',
    SMTP_FROM_EMAIL: w.__ENV__?.SMTP_FROM_EMAIL || 'mhernandezg_1@uqvirtual.edu.co',
    SMTP_FROM_NAME: w.__ENV__?.SMTP_FROM_NAME || 'GoHost',
    EMAILJS_PUBLIC_KEY: 'ZYoAZIvht99JLWSGY',
    EMAILJS_SERVICE_ID: 'service_755g249',
    // Placeholders: reemplazar por IDs reales de EmailJS (p.ej. template_abc123)
    EMAILJS_TEMPLATE_ID_BOOKING_CREATED: w.__ENV__?.EMAILJS_TEMPLATE_ID_BOOKING_CREATED || 'template_booking_created',
    EMAILJS_TEMPLATE_ID_BOOKING_PAID: w.__ENV__?.EMAILJS_TEMPLATE_ID_BOOKING_PAID || 'template_booking_paid',
    EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED: w.__ENV__?.EMAILJS_TEMPLATE_ID_BOOKING_CANCELLED || 'template_booking_cancelled',
    EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED: w.__ENV__?.EMAILJS_TEMPLATE_ID_PASSWORD_RESET_REQUESTED || 'template_password_reset_requested',
    EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED: w.__ENV__?.EMAILJS_TEMPLATE_ID_PASSWORD_CHANGED || 'template_password_changed',
    EMAILJS_TEMPLATE_ID_WELCOME: w.__ENV__?.EMAILJS_TEMPLATE_ID_WELCOME || 'template_welcome',
    EMAILJS_TEMPLATE_ID_PROFILE_UPDATED: w.__ENV__?.EMAILJS_TEMPLATE_ID_PROFILE_UPDATED || 'template_profile_updated'
  });
})(window);
