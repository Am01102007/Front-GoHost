// src/app/pages/listings/create-listing/create-listing.component.ts

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-create-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-listing.component.html',
  styleUrls: ['./create-listing.component.scss']
})
export class CreateListingComponent implements OnInit {
  form!: FormGroup;
  
  // ✅ Signals para manejo de archivos
  selectedFiles = signal<File[]>([]);
  imagePreviews = signal<string[]>([]);
  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private listingsService: ListingsService,
    private notifications: NotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: [''],
      ciudad: ['', Validators.required],
      pais: ['Colombia', Validators.required],
      calle: ['', Validators.required],
      zip: [''],
      precioNoche: [0, [Validators.required, Validators.min(1)]],
      capacidad: [1, [Validators.required, Validators.min(1)]],
      servicios: [[]]
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) {
      return;
    }

    // Validar cantidad
    if (files.length > 10) {
      this.notifications.error(
        'Demasiadas imágenes',
        'Puedes subir máximo 10 imágenes'
      );
      input.value = '';
      return;
    }

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        this.notifications.error(
          'Formato no válido',
          `${file.name} no es una imagen válida (JPEG, PNG, WebP)`
        );
        continue;
      }

      if (file.size > maxSize) {
        this.notifications.error(
          'Archivo muy grande',
          `${file.name} excede el tamaño máximo de 10MB`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      this.notifications.error(
        'Sin imágenes válidas',
        'Selecciona archivos JPEG, PNG o WebP menores a 10MB'
      );
      input.value = '';
      return;
    }

    this.selectedFiles.set(validFiles);
    this.generatePreviews(validFiles);
    
    console.log(`✅ ${validFiles.length} imagen(es) seleccionada(s)`);
  }

  private generatePreviews(files: File[]): void {
    const previews: string[] = [];
    let loaded = 0;
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          previews.push(e.target.result as string);
          loaded++;
          
          if (loaded === files.length) {
            this.imagePreviews.set(previews);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  removeFile(index: number): void {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);
    
    const previews = this.imagePreviews();
    previews.splice(index, 1);
    this.imagePreviews.set([...previews]);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.notifications.error(
        'Formulario inválido',
        'Completa todos los campos requeridos'
      );
      return;
    }

    if (this.selectedFiles().length === 0) {
      this.notifications.error(
        'Sin imágenes',
        'Debes seleccionar al menos 1 imagen'
      );
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.form.value;
    
    // ✅ CORRECCIÓN: Enviar File[] directamente, no string[]
    const payload = {
      titulo: formValue.titulo,
      descripcion: formValue.descripcion || '',
      ciudad: formValue.ciudad,
      pais: formValue.pais,
      calle: formValue.calle,
      zip: formValue.zip || '',
      precioNoche: Number(formValue.precioNoche),
      capacidad: Number(formValue.capacidad),
      fotos: this.selectedFiles(), // ✅ File[], no string[]
      servicios: formValue.servicios || []
    };

    console.log('📤 Enviando alojamiento con', this.selectedFiles().length, 'imágenes');

    this.listingsService.create(payload).subscribe({
      next: (created) => {
        console.log('✅ Alojamiento creado:', created.id);
        this.notifications.success(
          '¡Éxito!',
          'Alojamiento creado correctamente'
        );
        
        // Resetear formulario
        this.form.reset({
          pais: 'Colombia',
          precioNoche: 0,
          capacidad: 1,
          servicios: []
        });
        this.selectedFiles.set([]);
        this.imagePreviews.set([]);
        this.isSubmitting.set(false);
        
        // Redirigir a la lista de alojamientos
        this.router.navigate(['/host/listings']);
      },
      error: (err) => {
        console.error('❌ Error creando alojamiento:', err);
        this.isSubmitting.set(false);
        
        let mensaje = 'No se pudo crear el alojamiento';
        
        if (err.status === 415) {
          mensaje = 'Error de formato. Verifica que las imágenes sean válidas.';
        } else if (err.status === 413) {
          mensaje = 'Las imágenes son muy grandes. Reduce el tamaño.';
        } else if (err.status === 401) {
          mensaje = 'Tu sesión ha expirado. Inicia sesión nuevamente.';
        } else if (err.error?.error) {
          mensaje = err.error.error;
        } else if (err.error?.detalles) {
          mensaje = err.error.detalles;
        }
        
        this.notifications.error('Error', mensaje);
      }
    });
  }
}