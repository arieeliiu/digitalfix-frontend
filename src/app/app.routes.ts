import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { PaginaAcceso } from './pages/acceso/acceso';
import { PaginaInicio } from './pages/inicio/inicio';
import { PaginaErrorAuth } from './pages/error-auth/error-auth';

export const routes: Routes = [
  // Página pública desde donde el usuario puede iniciar sesión.
  {
    path: '',
    component: PaginaAcceso,
  },

  // Solo permite entrar si MSAL confirma una sesión autenticada.
  {
    path: 'inicio',
    component: PaginaInicio,
    canActivate: [MsalGuard],
  },

  // Muestra un mensaje cuando la autenticación no puede completarse.
  {
    path: 'error-autenticacion',
    component: PaginaErrorAuth,
  },

  // Cualquier dirección desconocida vuelve a la página pública.
  {
    path: '**',
    redirectTo: '',
  },
];