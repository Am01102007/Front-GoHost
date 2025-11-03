import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommentsService, CommentItem } from '../../../core/services/comments.service';
import { AuthService } from '../../../core/services/auth.service';
import { ListingsService } from '../../../core/services/listings.service';

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

  open = signal(false);

  form = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    text: ['', [Validators.required, Validators.minLength(3)]]
  });

  get items(): CommentItem[] {
    return this.commentsSvc.listByListing(this.listingId);
  }

  toggle() {
    this.open.set(!this.open());
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
    this.commentsSvc.add(this.listingId, { text: v.text, rating: v.rating, user });
    this.form.reset({ rating: 5, text: '' });
  }
}
