import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BACKEND_URL } from '../../shared/config';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Preferir BACKEND_URL si está definido; de lo contrario, usar environment.apiUrl
  private baseUrl = BACKEND_URL || environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Headers mínimos para evitar preflight innecesario en peticiones simples.
  private getAcceptHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json'
    });
  }

  // Headers para envíos con cuerpo JSON (POST/PUT), donde sí corresponde Content-Type.
  private getJsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getAcceptHeaders()
    });
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getJsonHeaders()
    });
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getJsonHeaders()
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getAcceptHeaders()
    });
  }
}
