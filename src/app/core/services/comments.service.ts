import { Injectable, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

export interface CommentItem {
  id: string;
  listingId: string;
  user?: string;
  rating: number; // 1..5
  text: string;
  createdAt: string; // ISO
}

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private items = signal<CommentItem[]>(this.restore());

  listByListing(listingId: string): CommentItem[] {
    return this.items().filter(c => c.listingId === listingId);
  }

  add(listingId: string, data: { text: string; rating: number; user?: string }): CommentItem {
    const item: CommentItem = {
      id: uuidv4(),
      listingId,
      text: data.text.trim(),
      rating: Math.max(1, Math.min(5, data.rating)),
      user: data.user,
      createdAt: new Date().toISOString()
    };
    const next = [...this.items(), item];
    this.items.set(next);
    this.persist(next);
    return item;
  }

  private hasStorage(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
      return false;
    }
  }

  private restore(): CommentItem[] {
    if (!this.hasStorage()) return [];
    try {
      const raw = localStorage.getItem('comments');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(items: CommentItem[]): void {
    if (!this.hasStorage()) return;
    try {
      localStorage.setItem('comments', JSON.stringify(items));
    } catch {}
  }
}

