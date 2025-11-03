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

/**
 * Servicio de comentarios (persistencia local).
 *
 * Almacena y recupera comentarios en `localStorage`. No interactúa con el backend;
 * útil como demostración y para pruebas locales.
 */
@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly storageKey = 'comments';
  private items = signal<CommentItem[]>(this.restore());

  /**
   * Lista comentarios asociados a un alojamiento.
   * @param listingId ID del alojamiento.
   */
  listByListing(listingId: string): CommentItem[] {
    return this.items().filter(c => c.listingId === listingId);
  }

  /**
   * Añade un comentario y lo persiste en almacenamiento local.
   * @param listingId ID del alojamiento.
   * @param data Contenido del comentario y calificación.
   * @returns El comentario creado.
   */
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

  private get storage(): Storage | null {
    try {
      const g = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
      return g && 'localStorage' in g ? (g.localStorage as Storage) : null;
    } catch {
      return null;
    }
  }

  private restore(): CommentItem[] {
    try {
      const raw = this.storage?.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(items: CommentItem[]): void {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(items));
    } catch {}
  }
}
