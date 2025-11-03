import { Injectable } from '@angular/core';

export type PaymentType = 'tarjeta' | 'paypal' | 'transferencia';

export interface PaymentMethod {
  id: string;
  tipo: PaymentType;
  etiqueta: string; // "Visa •••• 1234"
  brand?: string;   // Visa/Mastercard
  last4?: string;
  default?: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodsService {
  private readonly storageKey = 'app_payment_methods';

  /**
   * Devuelve referencia segura a `localStorage` si está disponible.
   * Compatible con SSR (puede retornar `null`).
   */
  private get storage(): Storage | null {
    try {
      const g = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
      return g && 'localStorage' in g ? (g.localStorage as Storage) : null;
    } catch {
      return null;
    }
  }

  /** Lista los métodos de pago persistidos en almacenamiento local */
  list(): PaymentMethod[] {
    const raw = this.storage?.getItem(this.storageKey);
    try { return raw ? JSON.parse(raw) as PaymentMethod[] : []; } catch { return []; }
  }

  /** Persistencia masiva de métodos de pago */
  saveAll(items: PaymentMethod[]) {
    try { this.storage?.setItem(this.storageKey, JSON.stringify(items)); } catch {}
  }

  /**
   * Añade un método de pago. Si el nuevo es `default`, desmarca el resto.
   */
  add(method: PaymentMethod) {
    const items = this.list();
    if (method.default) items.forEach(m => m.default = false);
    items.push(method);
    this.saveAll(items);
  }

  /** Elimina un método de pago por ID */
  remove(id: string) {
    this.saveAll(this.list().filter(m => m.id !== id));
  }

  /** Marca un método como predeterminado y desmarca los demás */
  setDefault(id: string) {
    const items = this.list().map(m => ({ ...m, default: m.id === id }));
    this.saveAll(items);
  }
}
