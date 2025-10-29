import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { v4 as uuidv4 } from 'uuid';
import { Router } from '@angular/router';

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

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    direccion: ['', Validators.required],
    ciudad: ['', Validators.required],
    pais: ['', Validators.required],
    precioPorNoche: [100, [Validators.required, Validators.min(1)]],
    capacidad: [1, [Validators.required, Validators.min(1)]]
  });

  crear() {
    if (this.form.invalid) return;
    const id = uuidv4();
    const v = this.form.value;
    const nuevo = {
      id,
      titulo: v.titulo!,
      descripcion: v.descripcion!,
      ubicacion: { direccion: v.direccion!, ciudad: v.ciudad!, pais: v.pais! },
      precioPorNoche: v.precioPorNoche!,
      imagenes: ['https://picsum.photos/seed/' + id + '/800/500'],
      servicios: [],
      anfitrionId: 'u1',
      capacidad: v.capacidad!
    };
    this.listingsSvc.create(nuevo);
    this.router.navigate(['/mis-alojamientos']);
  }
}