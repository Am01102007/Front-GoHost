import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../../core/services/currency.service';

@Pipe({ name: 'currencyUser', standalone: true, pure: false })
export class CurrencyUserPipe implements PipeTransform {
  constructor(private svc: CurrencyService) {}
  transform(value: number | string | null | undefined, from?: string): string {
    const n = typeof value === 'string' ? Number(value) : (value ?? 0 as any);
    if (from) return this.svc.formatFrom(Number(n) || 0, from);
    return this.svc.format(Number(n) || 0);
  }
}
