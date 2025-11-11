import { Component, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommentsService, CommentItem } from '../../../core/services/comments.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListingsService } from '../../../core/services/listings.service';
import { BookingsService } from '../../../core/services/bookings.service';

@Component({
  selector: 'app-comments-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comments-section.component.html',
  styleUrls: ['./comments-section.component.scss']
})
export class CommentsSectionComponent {
  @Input({ required: true }) listingId!: string;
  fb = inject(FormBuilder);
  commentsSvc = inject(CommentsService);
  auth = inject(AuthService);
  listings = inject(ListingsService);
  bookings = inject(BookingsService);

  open = signal(false);

  form = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    text: ['', [Validators.required, Validators.minLength(3)]]
  });

  // Detectar próxima reserva elegible para reseñar (completada y sin reseña previa)
  nextBookingToReview = computed(() => {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return null;
    const now = new Date();
    const allMine = this.bookings.byUser(userId);
    const elegibles = allMine
      .filter(b => b.listingId === this.listingId && b.estado === 'pagado' && new Date(b.fechaFin) < now)
      .sort((a, b) => new Date(b.fechaFin).getTime() - new Date(a.fechaFin).getTime());
    if (elegibles.length === 0) return null;
    const yaComentadas = this.commentsSvc.listByListing(this.listingId)
      .filter(c => c.userId === userId && !!c.bookingId)
      .map(c => String(c.bookingId));
    const siguiente = elegibles.find(b => !yaComentadas.includes(String(b.id)));
    return siguiente ?? null;
  });

  // Solo permitir comentar si existe una reserva elegible sin reseña
  canComment = computed(() => !!this.nextBookingToReview());

  get items(): CommentItem[] {
    return this.commentsSvc.listByListing(this.listingId);
  }

  toggle() {
    const newState = !this.open();
    this.open.set(newState);
    // Asegurar que las reservas del usuario estén cargadas al abrir
    if (newState) {
      this.bookings.fetchMine().subscribe({
        error: () => {}
      });
    }
  }

  add() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const user = this.auth.currentUser()?.nombre;
    const currentUserId = this.auth.currentUser()?.id;
    const listing = this.listings.getById(this.listingId);
    if (listing && currentUserId && listing.anfitrionId === currentUserId) {
      console.warn('No puedes comentar tu propio alojamiento');
      return;
    }
    if (!this.canComment()) {
      console.warn('Solo puedes comentar si completaste una estadía en este alojamiento');
      return;
    }
    const booking = this.nextBookingToReview();
    if (!booking) {
      console.warn('Ya has realizado reseña para todas tus reservas elegibles de este alojamiento');
      return;
    }
    this.commentsSvc.add(this.listingId, {
      text: v.text,
      rating: v.rating,
      user,
      userId: currentUserId!,
      bookingId: String(booking.id)
    });
    this.form.reset({ rating: 5, text: '' });
  }
}
