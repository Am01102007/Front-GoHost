import { Routes } from '@angular/router';
import { BrowseListingsComponent } from './pages/listings/browse-listings/browse-listings.component';
import { CreateListingComponent } from './pages/listings/create-listing/create-listing.component';
import { MyListingsComponent } from './pages/listings/my-listings/my-listings.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { MyMessagesComponent } from './pages/user/my-messages/my-messages.component';
import { EditProfileComponent } from './pages/user/edit-profile/edit-profile.component';
import { FavoritesComponent } from './pages/user/favorites/favorites.component';
import { MyBookingsComponent } from './pages/booking/my-bookings/my-bookings.component';
import { AccommodationRequestsComponent } from './pages/booking/accommodation-requests/accommodation-requests.component';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';
import { hostGuard, guestGuard, hostMatch, guestMatch } from './core/guards/role.guard';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';
import { listingResolver } from './core/resolvers/listing.resolver';

/**
 * Rutas de la aplicación.
 *
 * Organiza navegación por áreas:
 * - Públicas: landing y detalle de alojamiento (con `listingResolver`).
 * - Anfitrión: crear/editar/listar/métricas, protegidas por `hostGuard/hostMatch`.
 * - Autenticación: login/registro/recuperar, protegidas por `noAuthGuard`.
 * - Comunes autenticadas: perfil, mensajes, pagos (con `authGuard`).
 * - Huésped: favoritos, checkout, reservas, historial (con `guestGuard/guestMatch`).
 * Usa `pendingChangesGuard` para confirmar navegación con formularios sucios.
 */
export const routes: Routes = [
  { path: '', component: BrowseListingsComponent },
  { path: 'alojamientos/:id', loadComponent: () => import('./pages/listings/listing-detail/listing-detail.component').then(m => m.ListingDetailComponent), resolve: { listing: listingResolver } },
  // Página de diagnósticos eliminada
  
  // Rutas específicas para anfitriones
  { path: 'crear-alojamiento', component: CreateListingComponent, canMatch: [hostMatch], canActivate: [hostGuard] },
  { path: 'editar-alojamiento/:id', loadComponent: () => import('./pages/listings/edit-listing/edit-listing.component').then(m => m.EditListingComponent), canMatch: [hostMatch], canActivate: [hostGuard] },
  { path: 'mis-alojamientos', component: MyListingsComponent, canMatch: [hostMatch], canActivate: [hostGuard] },
  { path: 'solicitudes-de-alojamientos', component: AccommodationRequestsComponent, canMatch: [hostMatch], canActivate: [hostGuard] },
  // Reservas del anfitrión (todas las reservas asociadas a sus alojamientos)
  { path: 'reservas-anfitrion', loadComponent: () => import('./pages/booking/host-bookings/host-bookings.component').then(m => m.HostBookingsComponent), canMatch: [hostMatch], canActivate: [hostGuard] },
  // Detalle de una reserva (solo anfitrión)
  { path: 'reserva/:id', loadComponent: () => import('./pages/booking/booking-detail/booking-detail.component').then(m => m.BookingDetailComponent), canMatch: [hostMatch], canActivate: [hostGuard] },
  { path: 'reserva/:id/mensajes', component: MyMessagesComponent, canActivate: [authGuard] },
  // Métricas por alojamiento (solo anfitrión propietario)
  { path: 'metricas/:id', loadComponent: () => import('./pages/metrics/listing-metrics/listing-metrics.component').then(m => m.ListingMetricsComponent), canMatch: [hostMatch], canActivate: [hostGuard] },

  // Rutas de autenticación
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },
  { path: 'registro', component: RegisterComponent, canActivate: [noAuthGuard] },
  { path: 'recuperar', component: ResetPasswordComponent, canActivate: [noAuthGuard] },

  // Rutas comunes para usuarios autenticados
  { path: 'perfil', component: EditProfileComponent, canActivate: [authGuard] },
  { path: 'mis-mensajes', component: MyMessagesComponent, canActivate: [authGuard] },
  { path: 'metodos-de-pago', loadComponent: () => import('./pages/payments/payment-methods/payment-methods.component').then(m => m.PaymentMethodsComponent), canActivate: [authGuard] },

  // Rutas específicas para huéspedes
  { path: 'favoritos', component: FavoritesComponent, canMatch: [guestMatch], canActivate: [guestGuard] },
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout/checkout.component').then(m => m.CheckoutComponent), canMatch: [guestMatch], canActivate: [guestGuard] },
  { path: 'mis-reservas', component: MyBookingsComponent, canMatch: [guestMatch], canActivate: [guestGuard] },
  { path: 'historial-de-estadias', loadComponent: () => import('./pages/booking/booking-history/booking-history.component').then(m => m.BookingHistoryComponent), canMatch: [guestMatch], canActivate: [guestGuard] },

  { path: '**', redirectTo: '' }
];
