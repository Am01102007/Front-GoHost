import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListingsService } from '../../../core/services/listings.service';
import { AccommodationCardComponent } from '../../../shared/components/accommodation-card/accommodation-card.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, AccommodationCardComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent {
  listingsSvc = inject(ListingsService);
  loading = false;

  get favs() {
    const ids = this.listingsSvc.favorites();
    return this.listingsSvc.listings().filter(l => ids.includes(l.id));
  }

  ngOnInit() {
    this.loading = true;
    this.listingsSvc.refreshListings().subscribe({
      next: () => { this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
