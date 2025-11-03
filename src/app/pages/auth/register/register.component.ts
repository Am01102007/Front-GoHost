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
    if (this.form.invalid) return;
    const v = this.form.value;
    this.auth.register({
      nombre: v.nombre!,
      apellido: v.apellidos!,
      email: v.email!,
      password: v.password!,
      telefono: v.telefono!,
      rol: (v.rol === 'anfitrion' ? 'ANFITRION' : 'HUESPED') as 'ANFITRION' | 'HUESPED'
    })
      .subscribe(() => this.router.navigate(['/']));
  }
}
