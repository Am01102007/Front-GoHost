import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-messages.component.html',
  styleUrls: ['./my-messages.component.scss']
})
export class MyMessagesComponent {
  loading = true;
  sending = false;
  items: Array<{ id: string; from: string; text: string; date: Date }>=[];

  ngOnInit() {
    setTimeout(() => {
      this.items = [
        { id: '1', from: 'Sistema', text: 'Bienvenido a tus mensajes', date: new Date() },
        { id: '2', from: 'Soporte', text: '¿Necesitas ayuda? Escríbenos.', date: new Date() }
      ];
      this.loading = false;
    }, 600);
  }

  send(msg: string) {
    if (!msg.trim()) return;
    this.sending = true;
    setTimeout(() => {
      this.items.unshift({ id: Math.random().toString(36).slice(2), from: 'Yo', text: msg.trim(), date: new Date() });
      this.sending = false;
    }, 400);
  }
}
