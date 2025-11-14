import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';
import { API_BASE } from '../config';

export interface MessageDto {
  id: string;
  remitenteNombre?: string;
  remitenteId?: string;
  destinatarioId?: string;
  texto: string;
  creadoEn: string;
}

export interface MessageView {
  id: string;
  from: string;
  text: string;
  date: Date;
}

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);
  private notifications = inject(NotificationsService);
  private base = `${API_BASE}/mensajes`;

  listMine(page = 0, size = 20): Observable<MessageView[]> {
    const url = `${this.base}/mias?page=${page}&size=${size}`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        const data: MessageDto[] = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        return data.map(dto => ({
          id: String(dto.id),
          from: dto.remitenteNombre || 'Usuario',
          text: dto.texto,
          date: new Date(dto.creadoEn)
        }));
      }),
      catchError((err) => {
        this.notifications.httpError(err);
        return of([]);
      })
    );
  }

  sendText(text: string, toUserId?: string): Observable<MessageView> {
    const url = `${this.base}`;
    const payload: any = { texto: text.trim() };
    if (toUserId) payload.destinatarioId = toUserId;
    return this.http.post<any>(url, payload).pipe(
      map((dto: MessageDto) => ({
        id: String(dto.id),
        from: dto.remitenteNombre || 'Yo',
        text: dto.texto,
        date: new Date(dto.creadoEn)
      })),
      catchError((err) => {
        this.notifications.httpError(err);
        return of({ id: Math.random().toString(36).slice(2), from: 'Yo', text, date: new Date() });
      })
    );
  }
}
