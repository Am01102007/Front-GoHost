import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../../../core/config';
import { catchError, map, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-listing.component.html',
  styleUrls: ['./create-listing.component.scss']
})
export class CreateListingComponent {
  fb = inject(FormBuilder);
  listingsSvc = inject(ListingsService);
  router = inject(Router);
  notifications = inject(NotificationsService);
  http = inject(HttpClient);

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    direccion: ['', Validators.required],
    ciudad: ['', Validators.required],
    pais: ['', Validators.required],
    precioPorNoche: [100, [Validators.required, Validators.min(1)]],
    capacidad: [1, [Validators.required, Validators.min(1)]],
    servicios: [[] as string[]]
  });

  selectedFiles: File[] = [];
  photoPreviews: string[] = [];
  uploading = false;

  // Constantes para validación
  readonly MIN_IMAGES = 1;
  readonly MAX_IMAGES = 10;
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Lista de servicios comunes para facilitar la selección
  readonly serviciosComunes = [
    'WiFi', 'Piscina', 'Aire acondicionado', 'Cocina', 'Estacionamiento',
    'Gimnasio', 'Spa', 'Desayuno', 'Mascotas permitidas', 'TV por cable'
  ];

  get canAddMoreImages(): boolean {
    return this.selectedFiles.length < this.MAX_IMAGES;
  }

  get hasMinimumImages(): boolean {
    return this.selectedFiles.length >= this.MIN_IMAGES;
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    
    if (files.length === 0) return;

    // Validar que no exceda el máximo
    if (this.selectedFiles.length + files.length > this.MAX_IMAGES) {
      this.notifications.error(
        'Demasiadas imágenes', 
        `Solo puedes subir máximo ${this.MAX_IMAGES} imágenes. Actualmente tienes ${this.selectedFiles.length}.`
      );
      input.value = '';
      return;
    }

    // Validar tipos de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      this.notifications.error(
        'Tipo de archivo no válido', 
        'Solo se permiten imágenes JPG, PNG y WebP.'
      );
      input.value = '';
      return;
    }

    // Validar tamaño de archivos
    const oversizedFiles = files.filter(file => file.size > this.MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      this.notifications.error(
        'Archivo muy grande', 
        'Las imágenes no pueden superar los 5MB cada una.'
      );
      input.value = '';
      return;
    }

    // Agregar archivos válidos
    this.selectedFiles.push(...files);
    
    // Generar previsualizaciones
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreviews.push(reader.result as string);
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
    
    this.notifications.success(
      'Imágenes agregadas', 
      `Se agregaron ${files.length} imagen(es). Total: ${this.selectedFiles.length}/${this.MAX_IMAGES}`
    );
  }

  async removeImage(index: number) {
    const ok = await this.notifications.confirm('Eliminar imagen', '¿Deseas eliminar esta imagen?');
    if (!ok) return;
    this.selectedFiles.splice(index, 1);
    this.photoPreviews.splice(index, 1);
    this.notifications.info('Imagen eliminada', `Quedan ${this.selectedFiles.length} imagen(es).`);
  }

  // Eliminado: uploadImages. El backend recibe las imágenes directamente vía multipart/form-data.

  async crear() {
    if (this.form.invalid) {
      this.notifications.error('Formulario inválido', 'Por favor completa todos los campos requeridos.');
      return;
    }

    if (!this.hasMinimumImages) {
      this.notifications.error(
        'Imágenes requeridas', 
        `Debes subir al menos ${this.MIN_IMAGES} imagen(es) para crear el alojamiento.`
      );
      return;
    }

    const v = this.form.value;
    const ok = await this.notifications.confirm('Crear alojamiento', `¿Deseas crear "${v.titulo}"?`);
    if (!ok) return;
    
    const doCreate = () => {
      this.listingsSvc.create({
        titulo: v.titulo!,
        descripcion: v.descripcion!,
        ciudad: v.ciudad!,
        pais: v.pais!,
        calle: v.direccion!,
        precioNoche: v.precioPorNoche!,
        capacidad: v.capacidad!,
        fotos: this.selectedFiles,
        servicios: (v.servicios || [])
      }).subscribe({
        next: () => {
          this.notifications.success(
            'Alojamiento creado', 
            `Tu alojamiento "${v.titulo}" fue creado correctamente con ${this.selectedFiles.length} imagen(es).`
          );
          this.notifications.info('Correo enviado', 'Se envió una confirmación por correo desde el backend.');
          this.router.navigate(['/mis-alojamientos']);
        },
        error: (err) => {
          this.uploading = false;
          this.notifications.httpError(err);
        }
      });
    };
    this.uploading = true;
    doCreate();
  }

  // --- Gestión de servicios ---
  addService(raw: string | undefined) {
    const s = (raw || '').trim();
    if (!s) return;
    const current = this.form.value.servicios || [];
    if (current.includes(s)) return;
    this.form.patchValue({ servicios: [...current, s] });
  }

  async removeService(index: number) {
    const ok = await this.notifications.confirm('Eliminar servicio', '¿Deseas eliminar este servicio?');
    if (!ok) return;
    const current = this.form.value.servicios || [];
    if (index < 0 || index >= current.length) return;
    const next = current.slice(0, index).concat(current.slice(index + 1));
    this.form.patchValue({ servicios: next });
  }
}
