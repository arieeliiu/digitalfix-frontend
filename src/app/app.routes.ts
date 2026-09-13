import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { PaginaAcceso } from './pages/acceso/acceso';
import { PaginaInicio } from './pages/inicio/inicio';
import { PaginaErrorAuth } from './pages/error-auth/error-auth';

import { protegerPorRol } from './guards/roles.guard';
import { PaginaAdministracion } from './pages/administracion/administracion';
import { PaginaAccesoDenegado } from './pages/acceso-denegado/acceso-denegado';

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

  // El guard comprueba la sesión, el scope y el rol de administrador.
  {
    path: 'administracion',
    component: PaginaAdministracion,
    canActivate: [protegerPorRol],
    data: { roles: ['Admin'] },
  },
  // Permite explicar el rechazo sin volver a ejecutar el guard de roles.
  {
    path: 'acceso-denegado',
    component: PaginaAccesoDenegado,
  },

  // Cualquier dirección desconocida vuelve a la página pública.
  {
    path: '**',
    redirectTo: '',
  },
];