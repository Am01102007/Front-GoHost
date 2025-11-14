import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PaymentMethodsService, PaymentMethod } from '../../../core/services/payment-methods.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.scss']
})
export class PaymentMethodsComponent {
  fb = inject(FormBuilder);
  pm = inject(PaymentMethodsService);
  saving = false;
  actionLoading: Record<string, boolean> = {};

  form = this.fb.group({
    tipo: ['tarjeta', Validators.required],
    etiqueta: ['', Validators.required],
    brand: ['Visa'],
    last4: ['']
  });

  get items(): PaymentMethod[] {
    return this.pm.list();
  }

  add() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const id = Math.random().toString(36).slice(2, 9);
    this.pm.add({
      id,
      tipo: v.tipo as any,
      etiqueta: v.etiqueta!,
      brand: v.brand || undefined,
      last4: v.last4 || undefined,
      default: !this.items.length,
      createdAt: new Date().toISOString()
    });
    this.form.reset({ tipo: 'tarjeta', brand: 'Visa' });
    this.saving = false;
  }

  remove(id: string) { this.actionLoading[id] = true; this.pm.remove(id); this.actionLoading[id] = false; }
  setDefault(id: string) { this.actionLoading[id] = true; this.pm.setDefault(id); this.actionLoading[id] = false; }
}
