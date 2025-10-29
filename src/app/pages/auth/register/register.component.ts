import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
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

  form = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    telefono: ['', Validators.required],
    rol: ['', Validators.required],
    fechaNacimiento: ['', Validators.required]
  });

  register() {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.auth.register({
      nombre: v.nombre!,
      email: v.email!,
      password: v.password!,
      telefono: v.telefono!,
      rol: v.rol!,
      fechaNacimiento: v.fechaNacimiento!
    })
      .subscribe(() => this.router.navigate(['/']));
  }
}
