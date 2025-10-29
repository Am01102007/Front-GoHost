import { Routes } from '@angular/router';
import { BrowseListingsComponent } from './pages/listings/browse-listings/browse-listings.component';
import { ListingDetailComponent } from './pages/listings/listing-detail/listing-detail.component';
import { CreateListingComponent } from './pages/listings/create-listing/create-listing.component';
import { MyListingsComponent } from './pages/listings/my-listings/my-listings.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { MyMessagesComponent } from './pages/user/my-messages/my-messages.component';
import { EditProfileComponent } from './pages/user/edit-profile/edit-profile.component';
import { FavoritesComponent } from './pages/user/favorites/favorites.component';
import { CheckoutComponent } from './pages/checkout/checkout/checkout.component';
import { MyBookingsComponent } from './pages/booking/my-bookings/my-bookings.component';
import { BookingHistoryComponent } from './pages/booking/booking-history/booking-history.component';
import { PaymentMethodsComponent } from './pages/payments/payment-methods/payment-methods.component';
import { AccommodationRequestsComponent } from './pages/booking/accommodation-requests/accommodation-requests.component';
import { authGuard } from './core/guards/auth.guard';
import { hostGuard, guestGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', component: BrowseListingsComponent },
  { path: 'alojamientos/:id', component: ListingDetailComponent },
  
  // Rutas específicas para anfitriones
  { path: 'crear-alojamiento', component: CreateListingComponent, canActivate: [hostGuard] },
  { path: 'mis-alojamientos', component: MyListingsComponent, canActivate: [hostGuard] },
  { path: 'solicitudes-de-alojamientos', component: AccommodationRequestsComponent, canActivate: [hostGuard] },

  // Rutas de autenticación
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'recuperar', component: ResetPasswordComponent },

  // Rutas comunes para usuarios autenticados
  { path: 'perfil', component: EditProfileComponent, canActivate: [authGuard] },
  { path: 'mis-mensajes', component: MyMessagesComponent, canActivate: [authGuard] },
  { path: 'metodos-de-pago', component: PaymentMethodsComponent, canActivate: [authGuard] },

  // Rutas específicas para huéspedes
  { path: 'favoritos', component: FavoritesComponent, canActivate: [guestGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [guestGuard] },
  { path: 'mis-reservas', component: MyBookingsComponent, canActivate: [guestGuard] },
  { path: 'historial-de-estadias', component: BookingHistoryComponent, canActivate: [guestGuard] },

  { path: '**', redirectTo: '' }
];
