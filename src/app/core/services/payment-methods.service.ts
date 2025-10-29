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
  private storageKey = 'app_payment_methods';

  private get storageAvailable(): boolean {
    try { return typeof window !== 'undefined' && !!window.localStorage; } catch { return false; }
  }

  list(): PaymentMethod[] {
    if (!this.storageAvailable) return [];
    const raw = localStorage.getItem(this.storageKey);
    try { return raw ? JSON.parse(raw) as PaymentMethod[] : []; } catch { return []; }
  }

  saveAll(items: PaymentMethod[]) {
    if (!this.storageAvailable) return;
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  add(method: PaymentMethod) {
    const items = this.list();
    if (method.default) items.forEach(m => m.default = false);
    items.push(method);
    this.saveAll(items);
  }

  remove(id: string) {
    this.saveAll(this.list().filter(m => m.id !== id));
  }

  setDefault(id: string) {
    const items = this.list().map(m => ({ ...m, default: m.id === id }));
    this.saveAll(items);
  }
}
