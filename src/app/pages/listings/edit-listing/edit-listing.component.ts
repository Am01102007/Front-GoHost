import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../../../core/config';
import { catchError, map, of } from 'rxjs';

@Component({
  selector: 'app-edit-listing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-listing.component.html',
  styleUrls: ['./edit-listing.component.scss']
})
export class EditListingComponent implements OnInit {
  fb = inject(FormBuilder);
  listingsSvc = inject(ListingsService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  notifications = inject(NotificationsService);
  http = inject(HttpClient);

  listingId: string = this.route.snapshot.params['id'];
  listing = this.listingsSvc.getById(this.listingId);

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    direccion: ['', Validators.required],
    ciudad: ['', Validators.required],
    pais: ['', Validators.required],
    precioPorNoche: [100, [Validators.required, Validators.min(1)]],
    capacidad: [1, [Validators.required, Validators.min(1)]]
  });

  photoPreview: string | null = null;
  selectedFile: File | null = null;
  uploading = false;

  ngOnInit(): void {
    if (this.listing) {
      this.patchFormFromListing();
    } else {
      this.listingsSvc.fetchById(this.listingId).subscribe({
        next: (l) => {
          this.listing = l;
          this.patchFormFromListing();
        },
        error: (err) => this.notifications.httpError?.(err)
      });
    }
  }

  private patchFormFromListing(): void {
    const l = this.listing!;
    this.form.patchValue({
      titulo: l.titulo,
      descripcion: l.descripcion,
      direccion: l.ubicacion.direccion,
      ciudad: l.ubicacion.ciudad,
      pais: l.ubicacion.pais,
      precioPorNoche: l.precioPorNoche,
      capacidad: l.capacidad
    });
    this.photoPreview = (l.imagenes && l.imagenes.length) ? l.imagenes[0] : null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.photoPreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  private uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${API_BASE}/images`, formData).pipe(
      map(res => res?.secureUrl || res?.secure_url || res?.url || ''),
      catchError(err => {
        this.notifications.httpError?.(err);
        return of('');
      })
    );
  }

  guardar() {
    if (this.form.invalid || !this.listingId) return;
    this.uploading = true;
    const v = this.form.value;
    const payloadBase: any = {
      titulo: v.titulo!,
      descripcion: v.descripcion!,
      ciudad: v.ciudad!,
      pais: v.pais!,
      calle: v.direccion!,
      precioNoche: v.precioPorNoche!,
      capacidad: v.capacidad!
    };

    const doUpdate = (photoUrl?: string) => {
      const payload = { ...payloadBase } as any;
      if (photoUrl) payload.fotos = [photoUrl];
      this.listingsSvc.update(this.listingId, payload).subscribe({
        next: () => {
          this.notifications.success('Alojamiento actualizado', 'Los cambios fueron guardados correctamente');
          this.router.navigate(['/mis-alojamientos']);
        },
        error: (err) => this.notifications.httpError?.(err),
        complete: () => { this.uploading = false; }
      });
    };

    if (this.selectedFile) {
      this.uploadImage(this.selectedFile).subscribe({
        next: (url) => { this.uploading = false; doUpdate(url || undefined); },
        error: () => { this.uploading = false; doUpdate(undefined); }
      });
    } else {
      doUpdate(undefined);
      this.uploading = false;
    }
  }
}
