import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesService, MessageView } from '../../../core/services/messages.service';
import { NotificationsService } from '../../../core/services/notifications.service';

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
  items: MessageView[]=[];
  private messages = inject(MessagesService);
  private notifications = inject(NotificationsService);

  ngOnInit() {
    this.messages.listMine(0, 20).subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  send(msg: string) {
    const text = msg.trim();
    if (!text) return;
    this.sending = true;
    this.messages.sendText(text).subscribe({
      next: (m) => {
        this.items.unshift(m);
        this.notifications.success('Mensaje enviado', 'Tu mensaje fue enviado correctamente');
        this.sending = false;
      },
      error: (err) => {
        this.notifications.httpError(err);
        this.sending = false;
      }
    });
  }
}
