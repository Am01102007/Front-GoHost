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
  fotoPerfilUrl: string | null = null;   
  fotoPerfilPreview: string | null = null;
  
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
  this.auth.loadProfile().subscribe({
    next: (u) => {
      try {
        this.form.patchValue({
          nombre: u.nombre || '',
          apellido: u.apellido || '',
          email: u.email || '',
          telefono: (u as any).telefono || '',
          telefonoCodigo: (u as any).telefonoCodigo || '',
          // si el backend no trae descripcion, dejamos string vacío
          descripcion: (u as any).descripcion || ''
        });

        // 🔥 aquí tomas la URL que te devuelve el backend / Cloudinary
        // cambia 'fotoPerfilUrl' por el nombre real (ej: 'avatarUrl', 'profileImage', etc.)
        this.fotoPerfilUrl =
          (u as any).fotoPerfilUrl ||
          (u as any).avatarUrl ||
          (u as any).profileImage ||
          null;

        // para mostrar en el <img> al inicio
        this.fotoPerfilPreview = this.fotoPerfilUrl;
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
  const formValue = this.form.getRawValue();

  // Opcional: tercer parámetro con documentos si tu servicio lo soporta
  this.auth.updateProfile(formValue, this.fotoPerfilFile || undefined /*, this.documentos */)
    .subscribe({
      next: (u) => {
        this.saving = false;
        this.notify.success('Perfil actualizado', 'Los cambios se han guardado correctamente.');

        // limpiar campos de contraseña
        this.form.patchValue({
          passwordActual: '',
          passwordNueva: ''
        });

        // 🔥 Si el backend devuelve el usuario actualizado, resincronizamos sin perder descripcion
        if (u) {
          const current = this.form.getRawValue(); // lo que el usuario ve ahora

          this.form.patchValue({
            nombre: u.nombre ?? current.nombre,
            apellido: u.apellido ?? current.apellido,
            email: u.email ?? current.email,
            telefono: (u as any).telefono ?? current.telefono,
            telefonoCodigo: (u as any).telefonoCodigo ?? current.telefonoCodigo,
            // si el backend no envía descripcion, mantenemos la actual
            descripcion: (u as any).descripcion ?? current.descripcion
          });

          // actualizar URL de foto si viene una nueva de Cloudinary
          const nuevaUrl =
            (u as any).fotoPerfilUrl ||
            (u as any).avatarUrl ||
            (u as any).profileImage ||
            null;

          if (nuevaUrl) {
            this.fotoPerfilUrl = nuevaUrl;
            this.fotoPerfilPreview = nuevaUrl;
          }
        }

        // marcar el formulario como "limpio" → el guard ya no molesta
        this.form.markAsPristine();
        this.form.markAsUntouched();

        // limpiar estado de foto pendiente
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

  this.documentos = [...this.documentos, ...files];
  input.value = '';

  this.notify.success('Documentos agregados', `Se agregaron ${files.length} documento(s).`);
}



  oonSubirFoto(ev: Event) {
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

  // 🔥 preview local inmediatamente
  const reader = new FileReader();
  reader.onload = () => {
    this.fotoPerfilPreview = reader.result as string;
  };
  reader.readAsDataURL(file);

  // Subir a backend (que a su vez sube a Cloudinary)
  this.saving = true;
  const currentValues = this.form.getRawValue();

  this.auth.updateProfile(currentValues, file /*, this.documentos */)
    .subscribe({
      next: (u) => {
        this.saving = false;
        this.notify.success('Foto de perfil actualizada', 'La foto se ha guardado en tu perfil.');

        if (u) {
          const nuevaUrl =
            (u as any).fotoPerfilUrl ||
            (u as any).avatarUrl ||
            (u as any).profileImage ||
            null;

          if (nuevaUrl) {
            // sobreescribimos el preview con la URL oficial de Cloudinary
            this.fotoPerfilUrl = nuevaUrl;
            this.fotoPerfilPreview = nuevaUrl;
          }
        }

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
