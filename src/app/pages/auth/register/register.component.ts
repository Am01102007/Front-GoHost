import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  router = inject(Router);
  notify = inject(NotificationsService);
  tipoDocumentoOptions = ['CC', 'CE', 'PASAPORTE', 'NIT', 'DNI'];

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    telefono: ['', Validators.required],
    rol: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    tipoDocumento: ['', Validators.required],
    numeroDocumento: ['', Validators.required],
    ciudad: ['', Validators.required],
    pais: ['', Validators.required]
  });

  register() {
    if (this.form.invalid) {
      try { this.notify.error('Completa todos los campos requeridos'); } catch {}
      try { this.form.markAllAsTouched(); } catch {}
      return;
    }
    const v = this.form.value;
    this.auth.register({
      nombre: v.nombre!,
      apellido: v.apellidos!,
      email: v.email!,
      password: v.password!,
      telefono: v.telefono!,
      rol: (v.rol === 'anfitrion' ? 'ANFITRION' : 'HUESPED') as 'ANFITRION' | 'HUESPED',
      ciudad: v.ciudad!,
      pais: v.pais!,
      fechaNacimiento: v.fechaNacimiento!,
      tipoDocumento: v.tipoDocumento!,
      numeroDocumento: v.numeroDocumento!
    })
      .subscribe({
        next: () => {
          try { this.notify.success('Registro exitoso', 'Tu cuenta fue creada correctamente'); } catch {}
          this.router.navigate(['/']);
        },
        error: (err) => {
          try { this.notify.httpError(err); } catch {}
        }
      });
  }
}
