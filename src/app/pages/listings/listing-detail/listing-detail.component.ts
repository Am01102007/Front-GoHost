import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ListingsService } from '../../../core/services/listings.service';
import { CommentsSectionComponent } from '../../../shared/components/comments-section/comments-section.component';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, CommentsSectionComponent, RouterLink],
  templateUrl: './listing-detail.component.html',
  styleUrls: ['./listing-detail.component.scss']
})
export class ListingDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  listingsSvc = inject(ListingsService);
  listing = this.listingsSvc.getById(this.route.snapshot.params['id']);

  ngOnInit() {
    setTimeout(() => {
      try {
        const mapboxgl = (window as any).mapboxgl;
        const token = (window as any).MAPBOX_TOKEN || '';
        if (!mapboxgl || !token || !this.listing?.ubicacion.lat) return;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [this.listing.ubicacion.lng!, this.listing.ubicacion.lat!],
          zoom: 12
        });
        new mapboxgl.Marker().setLngLat([this.listing.ubicacion.lng!, this.listing.ubicacion.lat!]).addTo(map);
      } catch {}
    }, 0);
  }

  round(n: number): number {
    return Math.round(n);
  }
}
