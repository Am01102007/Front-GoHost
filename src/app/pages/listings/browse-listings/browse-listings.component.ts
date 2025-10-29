import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListingsService } from '../../../core/services/listings.service';
import { AccommodationCardComponent } from '../../../shared/components/accommodation-card/accommodation-card.component';

@Component({
  selector: 'app-browse-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, AccommodationCardComponent],
  templateUrl: './browse-listings.component.html',
  styleUrls: ['./browse-listings.component.scss']
})
export class BrowseListingsComponent {
  listingsSvc = inject(ListingsService);

  // UI según diseño: tabs y filtros simplificados
  view: 'alojamientos' | 'servicios' = 'alojamientos';
  ciudad = '';
  fechaInicio?: string;
  numPersonas?: number;

  get filtradas() {
    return this.listingsSvc.listings().filter(l => {
      const c = this.ciudad ? l.ubicacion.ciudad.toLowerCase().includes(this.ciudad.toLowerCase()) : true;
      const f = this.fechaInicio && l.disponibleDesde ? new Date(l.disponibleDesde) <= new Date(this.fechaInicio) : true;
      const n = this.numPersonas ? l.capacidad >= this.numPersonas : true;
      return c && f && n;
    });
  }
}
