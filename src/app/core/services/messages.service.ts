import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';
import { API_BASE } from '../config';

export interface MessageDto {
  id: string;
  reservaId?: string;
  remitenteNombre?: string;
  remitenteId?: string;
  contenido: string;
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

  listByReserva(reservaId: string, page = 0, size = 20): Observable<MessageView[]> {
    const url = `${this.base}/reserva/${encodeURIComponent(reservaId)}?page=${page}&size=${size}`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        const data: MessageDto[] = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
        return data.map(dto => ({
          id: String(dto.id),
          from: dto.remitenteNombre || 'Usuario',
          text: dto.contenido,
          date: new Date(dto.creadoEn)
        }));
      }),
      catchError((err) => {
        this.notifications.httpError(err);
        return of([]);
      })
    );
  }

  sendToReserva(reservaId: string, contenido: string): Observable<MessageView> {
    const url = `${this.base}`;
    const payload: any = { reservaId, contenido: contenido.trim() };
    return this.http.post<any>(url, payload).pipe(
      map((dto: MessageDto) => ({
        id: String(dto.id),
        from: dto.remitenteNombre || 'Yo',
        text: dto.contenido,
        date: new Date(dto.creadoEn)
      })),
      catchError((err) => {
        this.notifications.httpError(err);
        return of({ id: Math.random().toString(36).slice(2), from: 'Yo', text: contenido, date: new Date() });
      })
    );
  }
}
