import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private currency = this.load('currency', 'USD');
  private locale = this.load('locale', typeof navigator !== 'undefined' ? navigator.language : 'es');

  getCurrency(): string { return this.currency; }
  getLocale(): string { return this.locale; }
  setCurrency(c: string): void { this.currency = c; this.save('currency', c); }
  setLocale(l: string): void { this.locale = l; this.save('locale', l); }
  format(amount: number): string {
    const cur = this.currency || 'USD';
    const loc = this.locale || 'es';
    try { return new Intl.NumberFormat(loc, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(amount ?? 0); } catch { return `${amount ?? 0}`; }
  }

  private load(k: string, d: string): string {
    try { const v = localStorage.getItem(k); return v || d; } catch { return d; }
  }
  private save(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch {}
  }
}
