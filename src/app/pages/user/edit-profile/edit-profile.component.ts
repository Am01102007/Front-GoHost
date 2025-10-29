import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);

  form = this.fb.nonNullable.group({
    nombre: this.auth.currentUser()?.nombre || '',
    apellido: this.auth.currentUser()?.apellido || '',
    email: [this.auth.currentUser()?.email || '', [Validators.required, Validators.email]],
    telefonoCodigo: [''],
    descripcion: [''],
    passwordActual: [''],
    passwordNueva: ['']
  });

  documentos: string[] = [];
  fotoPerfilNombre = '';

  save() {
    this.auth.updateProfile(this.form.getRawValue()).subscribe();
  }

  cambiarContrasena() {
    const v = this.form.getRawValue();
    if (!v.passwordActual || !v.passwordNueva) return;
    // Simulación de cambio de contraseña
    console.log('Cambio de contraseña solicitado', v.passwordActual, '->', v.passwordNueva);
    this.form.patchValue({ passwordActual: '', passwordNueva: '' });
  }

  onSubirDocumentos(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []).map(f => f.name);
    this.documentos = [...this.documentos, ...files];
    input.value = '';
  }

  onSubirFoto(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = (input.files || [])[0];
    this.fotoPerfilNombre = file ? file.name : '';
    input.value = '';
  }
}
