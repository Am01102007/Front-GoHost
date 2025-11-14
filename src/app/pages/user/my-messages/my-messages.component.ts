import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesService, MessageView } from '../../../core/services/messages.service';
import { ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private notifications = inject(NotificationsService);
  reservaId!: string;
  page = 0;
  size = 20;
  invalidReserva = false;
  hasMore = true;
  @ViewChild('listEl') listEl?: ElementRef<HTMLDivElement>;

  trackById(_i: number, item: MessageView) { return item.id; }
  onEnter(ev: any, input: HTMLTextAreaElement) {
    if (ev.shiftKey) return;
    this.send(input.value);
    input.value = '';
    ev.preventDefault();
  }

  ngOnInit() {
    this.reservaId = String(this.route.snapshot.paramMap.get('id') || '');
    if (!this.reservaId) {
      this.invalidReserva = true;
      this.loading = false;
      this.notifications.info('Selecciona una reserva', 'Abre los mensajes desde el detalle o la lista de reservas');
      return;
    }
    this.loadPage(0);
  }

  loadPage(p: number) {
    this.loading = true;
    this.page = p;
    this.messages.listByReserva(this.reservaId, this.page, this.size).subscribe({
      next: (items: MessageView[]) => { this.items = items; this.loading = false; },
      error: (_err: unknown) => { this.loading = false; }
    });
  }

  loadMore() {
    const nextPage = this.page + 1;
    this.messages.listByReserva(this.reservaId, nextPage, this.size).subscribe({
      next: (older: MessageView[]) => {
        if (!older.length) { this.hasMore = false; return; }
        this.page = nextPage;
        this.items = older.concat(this.items);
      },
      error: (_err: unknown) => {}
    });
  }

  send(msg: string) {
    const text = msg.trim();
    if (!text) return;
    this.sending = true;
    this.messages.sendToReserva(this.reservaId, text).subscribe({
      next: () => {
        this.notifications.success('Mensaje enviado', 'Tu mensaje fue enviado correctamente');
        // Refrescar hilo desde backend para consistencia
        this.loadPage(this.page);
        this.sending = false;
        setTimeout(() => {
          const el = this.listEl?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        }, 100);
      },
      error: (err: unknown) => {
        this.notifications.httpError(err);
        this.sending = false;
      }
    });
  }
}
