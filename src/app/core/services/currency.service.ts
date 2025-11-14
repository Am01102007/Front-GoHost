import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private currency = this.load('currency', 'USD');
  private locale = this.load('locale', typeof navigator !== 'undefined' ? navigator.language : 'es');
  private rates: Record<string, number> = this.loadRates() || { USD: 1, EUR: 0.92, COP: 4100, MXN: 17.2 };

  getCurrency(): string { return this.currency; }
  getLocale(): string { return this.locale; }
  setCurrency(c: string): void { this.currency = c; this.save('currency', c); }
  setLocale(l: string): void { this.locale = l; this.save('locale', l); }
  format(amount: number): string {
    const cur = this.currency || 'USD';
    const loc = this.locale || 'es';
    try { return new Intl.NumberFormat(loc, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(amount ?? 0); } catch { return `${amount ?? 0}`; }
  }

  convert(amount: number, from: string, to: string): number {
    const f = (from || 'USD').toUpperCase();
    const t = (to || 'USD').toUpperCase();
    if (!this.rates[f]) this.rates[f] = 1;
    if (!this.rates[t]) this.rates[t] = 1;
    const usdAmount = amount / this.rates[f];
    return usdAmount * this.rates[t];
  }

  formatFrom(amount: number, from: string): string {
    const to = this.getCurrency();
    const converted = this.convert(amount, from, to);
    return this.format(converted);
  }

  setRate(code: string, value: number): void { this.rates[code.toUpperCase()] = value; this.saveRates(); }
  setRates(r: Record<string, number>): void { this.rates = { ...this.rates, ...r }; this.saveRates(); }

  private loadRates(): Record<string, number> | null {
    try { const raw = localStorage.getItem('currency_rates'); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  private saveRates(): void { try { localStorage.setItem('currency_rates', JSON.stringify(this.rates)); } catch {} }

  private load(k: string, d: string): string {
    try { const v = localStorage.getItem(k); return v || d; } catch { return d; }
  }
  private save(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch {}
  }
}
