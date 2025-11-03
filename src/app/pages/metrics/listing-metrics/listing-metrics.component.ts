import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MetricsService } from '../../../core/services/metrics.service';
import { ListingsService } from '../../../core/services/listings.service';
import { ListingMetrics } from '../../../core/models/metrics.model';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-listing-metrics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './listing-metrics.component.html',
  styleUrls: ['./listing-metrics.component.scss']
})
export class ListingMetricsComponent implements OnInit {
  route = inject(ActivatedRoute);
  metricsSvc = inject(MetricsService);
  listingsSvc = inject(ListingsService);
  notifications = inject(NotificationsService);

  id!: string;
  title = '';
  metrics: ListingMetrics | null = null;

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    const listing = this.listingsSvc.getById(this.id);
    this.title = listing?.titulo || 'Alojamiento';
    this.metricsSvc.getListingMetrics(this.id).subscribe({
      next: (m) => this.metrics = m,
      error: (e) => this.notifications.error('No se pudieron cargar las métricas', e?.message)
    });
  }
}

