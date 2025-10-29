import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(AuthService.getStoredUser());

  get token(): string | undefined {
    return this.currentUser()?.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  login(email: string, password: string): Observable<User> {
    const mockUser: User = {
      id: 'u1',
      nombre: 'María',
      apellido: 'López',
      email,
      rol: 'user',
      fechaNacimiento: '1990-01-01',
      token: 'mock-token'
    };
    try { if (AuthService.hasStorage()) localStorage.setItem('user', JSON.stringify(mockUser)); } catch {}
    this.currentUser.set(mockUser);
    return of(mockUser);
  }

  register(payload: Partial<User> & { password: string }): Observable<User> {
    const mockUser: User = {
      id: 'u2',
      nombre: payload.nombre || '',
      apellido: payload.apellido || '',
      email: payload.email || '',
      telefono: payload.telefono || '',
      rol: payload.rol || 'user',
      fechaNacimiento: payload.fechaNacimiento || '',
      token: 'mock-token'
    };
    try { if (AuthService.hasStorage()) localStorage.setItem('user', JSON.stringify(mockUser)); } catch {}
    this.currentUser.set(mockUser);
    return of(mockUser);
  }

  updateProfile(values: Partial<User>): Observable<User> {
    const updated = { ...this.currentUser()!, ...values } as User;
    try { if (AuthService.hasStorage()) localStorage.setItem('user', JSON.stringify(updated)); } catch {}
    this.currentUser.set(updated);
    return of(updated);
  }

  resetPassword(email: string): Observable<boolean> {
    return of(true);
  }

  logout(): void {
    try { if (AuthService.hasStorage()) localStorage.removeItem('user'); } catch {}
    this.currentUser.set(null);
  }

  private static hasStorage(): boolean {
    try {
      // SSR-safe check
      const ls: any = (globalThis as any).localStorage;
      return !!ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function';
    } catch { return false; }
  }

  private static getStoredUser(): User | null {
    try {
      if (!AuthService.hasStorage()) return null;
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
