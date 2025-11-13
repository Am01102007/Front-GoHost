import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmailService } from '../../../core/services/email.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  notify = inject(NotificationsService);
  email = inject(EmailService);
  
  step = signal<'request' | 'confirm' | 'success'>('request');
  loading = false;
  constructor() {
    // Envío de correo gestionado por SSR; no requiere init en cliente
  }

  form = this.fb.group({ 
    email: ['', [Validators.required, Validators.email]] 
  });
  
  confirmForm = this.fb.group({
    token: ['', [Validators.required, Validators.minLength(6)]],
    nuevaPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    ]]
  });

  submit() {
    if (this.form.invalid || this.loading) return;
    
    this.loading = true;
    const email = this.form.value.email!;
    
    this.auth.resetPassword(email).subscribe({
      next: () => {
        this.loading = false;
        this.step.set('confirm');
        this.notify.success('Código enviado', 'Revisa tu correo electrónico.');
        // Notificación de restablecimiento vía backend SSR
        try { this.email.sendPasswordResetRequested({ to_email: email }); } catch {}
      },
      error: (err) => {
        this.loading = false;
        this.notify.httpError(err);
      }
    });
  }

  confirm() {
    if (this.confirmForm.invalid || this.loading) return;
    
    this.loading = true;
    const { token, nuevaPassword } = this.confirmForm.value as any;
    
    this.auth.confirmResetPassword(token, nuevaPassword).subscribe({
      next: () => {
        this.loading = false;
        this.step.set('success');
        this.notify.success('Contraseña restablecida', 'Ya puedes iniciar sesión con tu nueva contraseña.');
        // Notificación de contraseña cambiada vía backend SSR
        try {
          const mail = this.form.value.email || this.auth.currentUser()?.email;
          if (mail) this.email.sendPasswordChanged({ to_email: mail });
        } catch {}
      },
      error: (err) => {
        this.loading = false;
        this.notify.httpError(err);
      }
    });
  }

  goBack() {
    this.step.set('request');
    this.confirmForm.reset();
  }
}
