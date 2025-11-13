import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  notify = inject(NotificationsService);

  form = this.fb.nonNullable.group({
    nombre: this.auth.currentUser()?.nombre || '',
    apellido: this.auth.currentUser()?.apellido || '',
    email: [this.auth.currentUser()?.email || '', [Validators.required, Validators.email]],
    telefono: this.auth.currentUser()?.telefono || '',
    telefonoCodigo: [''],
    descripcion: [''],
    passwordActual: [''],
    passwordNueva: ['']
  });

  documentos: File [] = [];
  fotoPerfilNombre = '';
  fotoPerfilFile: File | null = null;
  saving = false;

  // Mantener el formulario sincronizado si el usuario cambia
  userFormSync = effect(() => {
    const u = this.auth.currentUser();
    if (!u) return;
    try {
      this.form.patchValue({
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        email: u.email || '',
        telefono: (u as any).telefono || ''
      }, { emitEvent: false });
    } catch {}
  });

  ngOnInit(): void {
    // Cargar datos reales del perfil desde el backend
    this.auth.loadProfile().subscribe({
      next: (u) => {
        try {
          this.form.patchValue({
            nombre: u.nombre || '',
            apellido: u.apellido || '',
            email: u.email || '',
            telefono: (u as any).telefono || '',
            telefonoCodigo: (u as any).telefonoCodigo || '',
            descripcion: (u as any).descripcion || ''
          });
        } catch {}
      },
      error: (err) => {
        this.notify.httpError(err);
      }
    });
  }

  save() {
  if (this.form.invalid) {
    this.notify.error('Formulario inválido', 'Por favor revisa los campos marcados en rojo.');
    return;
  }

  this.saving = true;
  const formData = this.form.getRawValue();

  this.auth.updateProfile(formData, this.fotoPerfilFile || undefined /*, this.documentos */)
    .subscribe({
      next: (updatedUser) => {
        this.saving = false;
        this.notify.success('Perfil actualizado', 'Los cambios se han guardado correctamente.');

        // Limpiar campos sensibles
        this.form.patchValue({
          passwordActual: '',
          passwordNueva: ''
        });

        // Sincronizar el formulario con el usuario actualizado (o el actual del auth)
        const user = updatedUser || this.auth.currentUser();
        if (user) {
          this.form.patchValue({
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            email: user.email || '',
            telefono: (user as any).telefono || '',
            telefonoCodigo: (user as any).telefonoCodigo || '',
            descripcion: (user as any).descripcion || '',
            passwordActual: '',
            passwordNueva: ''
          });
        }

        // Marcar el formulario como limpio → el guard deja de avisar
        this.form.markAsPristine();
        this.form.markAsUntouched();

        // Limpiar estado visual de la foto pendiente
        this.fotoPerfilNombre = '';
        this.fotoPerfilFile = null;
      },
      error: (err: any) => {
        this.saving = false;
        this.notify.httpError(err);
      }
    });
}


  cambiarContrasena() {
    const v = this.form.getRawValue();
    if (!v.passwordActual || !v.passwordNueva) {
      this.notify.error('Campos requeridos', 'Debes ingresar tanto la contraseña actual como la nueva.');
      return;
    }

    this.saving = true;
    this.auth.changePassword(v.passwordActual, v.passwordNueva).subscribe({
      next: () => {
        this.saving = false;
        this.notify.success('Contraseña actualizada', 'Tu contraseña ha sido cambiada exitosamente.');
        this.form.patchValue({ passwordActual: '', passwordNueva: '' });
      },
      error: (err) => {
        this.saving = false;
        this.notify.httpError(err);
      }
    });
  }

  onSubirDocumentos(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  if (files.length === 0) return;

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));

  if (invalidFiles.length > 0) {
    this.notify.error('Tipo de archivo no válido', 'Solo se permiten archivos PDF, JPG y PNG.');
    input.value = '';
    return;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const oversizedFiles = files.filter(file => file.size > maxSize);

  if (oversizedFiles.length > 0) {
    this.notify.error('Archivo muy grande', 'Los archivos no pueden superar los 5MB.');
    input.value = '';
    return;
  }

  // Guardar los objetos File completos
  this.documentos = [...this.documentos, ...files];
  input.value = '';

  this.notify.success('Documentos agregados', `Se agregaron ${files.length} documento(s).`);
}


  onSubirFoto(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = (input.files || [])[0];

  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    this.notify.error('Tipo de archivo no válido', 'Solo se permiten imágenes JPG y PNG.');
    input.value = '';
    return;
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    this.notify.error('Imagen muy grande', 'La imagen no puede superar los 2MB.');
    input.value = '';
    return;
  }

  this.fotoPerfilNombre = file.name;
  this.fotoPerfilFile = file;
  input.value = '';

  // Subir y guardar inmediatamente la foto junto con los datos actuales
  this.saving = true;
  const currentValues = this.form.getRawValue();

  this.auth.updateProfile(currentValues, file /*, this.documentos */)
    .subscribe({
      next: (updatedUser) => {
        this.saving = false;
        this.notify.success('Foto de perfil actualizada', 'La foto se ha guardado en tu perfil.');

        const user = updatedUser || this.auth.currentUser();
        if (user) {
          this.form.patchValue({
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            email: user.email || '',
            telefono: (user as any).telefono || '',
            telefonoCodigo: (user as any).telefonoCodigo || '',
            descripcion: (user as any).descripcion || ''
          });
        }

        // Ya no hay archivo pendiente visualmente
        this.fotoPerfilNombre = '';
        this.fotoPerfilFile = null;
      },
      error: (err) => {
        this.saving = false;
        this.notify.httpError(err);
      }
    });
  }


  removeDocument(index: number) {
  this.documentos.splice(index, 1);
  this.documentos = [...this.documentos]; // ayuda si usas change detection OnPush
  this.notify.info('Documento eliminado', 'El documento se ha removido de la lista.');
  }

}
