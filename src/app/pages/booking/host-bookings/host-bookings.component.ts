import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
import { ListingsService } from '../../../core/services/listings.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AuthService } from '../../../core/services/auth.service';
import { EmailService } from '../../../core/services/email.service';
import { Booking } from '../../../core/models/booking.model';
import { isCloudinaryUrl, withTransforms, buildSrcSet, thumbSizes } from '../../../shared/cloudinary.util';

@Component({
  selector: 'app-host-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './host-bookings.component.html',
  styleUrls: ['./host-bookings.component.scss']
})
export class HostBookingsComponent implements OnInit {
  private readonly bookings = inject(BookingsService);
  private readonly listings = inject(ListingsService);
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly email = inject(EmailService);
  private readonly hostBookings = signal<Booking[]>([]);

  tab: 'todas' | 'pendientes' | 'activas' | 'canceladas' = 'todas';
  actionLoading: Record<string, boolean> = {};

  ngOnInit() {
    // Asegurar datos de alojamientos y reservas del anfitrión
    this.listings.fetchForHost().subscribe();
    this.bookings.fetchForHost().subscribe({
      next: (list) => this.hostBookings.set(list),
      error: () => this.hostBookings.set([])
    });
  }

  private readonly myListingIds = computed(() => {
    const uid = this.auth.currentUser()?.id;
    if (!uid) return [] as string[];
    // Los alojamientos ya vienen filtrados por anfitrión en fetchForHost
    return this.listings.listings().map(l => l.id);
  });

  readonly all = computed(() => {
    // Mostrar todas las reservas devueltas por el backend para el anfitrión.
    // Si los alojamientos no han cargado, no filtramos por IDs para evitar lista vacía.
    return this.hostBookings()
      .map((b: Booking) => ({ ...b, listing: this.listings.getById(b.listingId) }));
  });

  get pendientes() {
    return this.all().filter((b: any) => b.estado === 'pendiente');
  }

  get activas() {
    // Activas = confirmadas/pagadas y futuras
    const now = new Date();
    return this.all().filter((b: any) => b.estado !== 'cancelado' && new Date(b.fechaInicio) >= now);
  }

  get canceladas() {
    return this.all().filter((b: any) => b.estado === 'cancelado');
  }

  get items() {
    switch (this.tab) {
      case 'pendientes': return this.pendientes;
      case 'activas': return this.activas;
      case 'canceladas': return this.canceladas;
      default: return this.all();
    }
  }

  aceptar(id: string) {
    this.actionLoading[id] = true;
    this.bookings.updateStatus(id, 'pagado').subscribe({
      next: () => {
        this.notifications.success('Reserva confirmada', 'La reserva fue confirmada correctamente');
        try {
          const b = this.all().find((x: any) => x.id === id) || this.bookings.bookings().find(x => x.id === id);
          const guestEmail = (b as any)?.guestEmail as string | undefined;
          const guestName = (b as any)?.guestName as string | undefined;
          if (b && guestEmail) {
            this.email.init();
            this.email.sendBookingPaid({
              to_email: guestEmail,
              to_name: guestName,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              huespedes: b.huespedes,
              recipient_role: 'HUESPED',
            });
          }
          const host = this.auth.userProfile();
          if (b && host?.email) {
            this.email.sendBookingPaid({
              to_email: host.email,
              to_name: host.nombre,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              huespedes: b.huespedes,
              recipient_role: 'ANFITRION',
            });
          }
        } catch {}
      },
      error: (err) => this.notifications.httpError(err),
      complete: () => { this.actionLoading[id] = false; }
    });
  }

  rechazar(id: string) {
    this.actionLoading[id] = true;
    this.bookings.updateStatus(id, 'cancelado').subscribe({
      next: () => {
        this.notifications.success('Reserva cancelada', 'La reserva fue cancelada correctamente');
        try {
          const b = this.all().find((x: any) => x.id === id) || this.bookings.bookings().find(x => x.id === id);
          const guestEmail = (b as any)?.guestEmail as string | undefined;
          const guestName = (b as any)?.guestName as string | undefined;
          if (b && guestEmail) {
            this.email.init();
            this.email.sendBookingCancelled({
              to_email: guestEmail,
              to_name: guestName,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Rechazada por anfitrión',
              recipient_role: 'HUESPED',
            });
          }
          const host = this.auth.userProfile();
          if (b && host?.email) {
            this.email.sendBookingCancelled({
              to_email: host.email,
              to_name: host.nombre,
              alojamientoId: b.listingId,
              fechaInicio: b.fechaInicio,
              fechaFin: b.fechaFin,
              motivo: 'Rechazada por anfitrión',
              recipient_role: 'ANFITRION',
            });
          }
        } catch {}
      },
      error: (err) => this.notifications.httpError(err),
      complete: () => { this.actionLoading[id] = false; }
    });
  }

  /**
   * Método de diagnóstico para probar la conectividad del backend
   * Útil para debugging y verificación de endpoints de reservas
   */
  testBackendConnection(): void {
    console.log('🧪 Ejecutando diagnóstico de reservas del anfitrión...');
    
    // Verificar autenticación
    const currentUser = this.auth.user();
    const token = localStorage.getItem('auth_token');
    
    console.log('👤 Usuario actual:', currentUser);
    console.log('🔑 Token presente:', !!token);
    console.log('🏠 Rol del usuario:', currentUser?.rol);
    
    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return;
    }
    
    if (currentUser.rol !== 'ANFITRION') {
      console.warn('⚠️ Usuario no es anfitrión, rol actual:', currentUser.rol);
    }
    
    if (!token) {
      console.error('❌ No hay token de autenticación');
      return;
    }
    
    // Test de listings del anfitrión
    this.listings.fetchForHost(0, 12).subscribe({
      next: (listings) => {
        console.log(`✅ Listings API (host): ${listings.length} alojamientos obtenidos`);
        console.log('📡 Endpoint: GET /api/alojamientos/anfitrion');
        
        if (listings.length > 0) {
          const testId = listings[0].id;
          console.log(`🎯 Probando reservas para alojamiento ID: ${testId}`);
          
          // Test del nuevo método fetchByListing
          this.bookings.fetchByListing(testId).subscribe({
            next: (bookings) => {
              console.log(`✅ Reservas por alojamiento: ${bookings.length} reservas obtenidas`);
              console.log(`📡 Endpoint: GET /api/reservas/alojamiento/${testId}`);
              bookings.forEach(b => {
                console.log(`   - Reserva ${b.id}: ${b.estado} (${b.fechaInicio} - ${b.fechaFin})`);
              });
            },
            error: (err) => {
              console.error(`❌ Reservas por alojamiento falló:`, err);
              console.error(`📡 Status: ${err.status}, Message: ${err.message}`);
            }
          });
        }
      },
      error: (err) => {
        console.error('❌ Listings API (host) falló:', err);
        console.error(`📡 Status: ${err.status}, Message: ${err.message}`);
      }
    });

    // Test de reservas del anfitrión
    this.bookings.fetchForHost().subscribe({
      next: (bookings) => {
        console.log(`✅ Bookings API (host): ${bookings.length} reservas obtenidas`);
        console.log('📡 Endpoint: GET /api/reservas/anfitrion');
        bookings.forEach(b => {
          console.log(`   - Reserva ${b.id}: ${b.estado} para alojamiento ${b.listingId}`);
        });
      },
      error: (err) => {
        console.error('❌ Bookings API (host) falló:', err);
        console.error(`📡 Status: ${err.status}, Message: ${err.message}`);
      }
    });
  }

  thumb(url?: string): string {
    const u = url || '';
    if (!u) return '/images/placeholder.jpg';
    return isCloudinaryUrl(u) ? withTransforms(u, 'c_fill,f_auto,q_auto,w_300,h_200,dpr_auto') : u;
  }

  thumbSrcSet(url?: string): string {
    return url && isCloudinaryUrl(url) ? buildSrcSet(url, [200, 300, 400, 600]) : '';
  }

  thumbSize(): string {
    return thumbSizes();
  }
}
