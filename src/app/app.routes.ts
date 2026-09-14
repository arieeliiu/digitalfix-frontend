import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { PaginaAcceso } from './pages/acceso/acceso';
import { PaginaErrorAuth } from './pages/error-auth/error-auth';
import { PaginaAccesoDenegado } from './pages/acceso-denegado/acceso-denegado';

import { PaginaDashboard } from './pages/dashboard/dashboard';
import { PaginaWorkOrders } from './pages/workorders/workorders';
import { PaginaCatalog } from './pages/catalog/catalog';

import { protegerPorRol } from './guards/roles.guard';

export const routes: Routes = [
  // Página pública desde donde el usuario puede iniciar sesión.
  {
    path: '',
    component: PaginaAcceso,
  },

  // Dashboard principal: accesible para todos los roles autenticados.
  {
    path: 'dashboard',
    component: PaginaDashboard,
    canActivate: [MsalGuard],
  },

  // Órdenes de trabajo: Admin, Supervisor y Cliente (cada rol ve lo que corresponde).
  {
    path: 'workorders',
    component: PaginaWorkOrders,
    canActivate: [protegerPorRol],
    data: { roles: ['Admin', 'Supervisor', 'Cliente'] },
  },

  // Catálogo técnico: solo Admin y Supervisor.
  {
    path: 'catalog',
    component: PaginaCatalog,
    canActivate: [protegerPorRol],
    data: { roles: ['Admin', 'Supervisor'] },
  },

  // Muestra un mensaje cuando la autenticación no puede completarse.
  {
    path: 'error-autenticacion',
    component: PaginaErrorAuth,
  },

  // Permite explicar el rechazo sin volver a ejecutar el guard de roles.
  {
    path: 'acceso-denegado',
    component: PaginaAccesoDenegado,
  },

  // Rutas antiguas redirigidas para no romper bookmarks.
  {
    path: 'inicio',
    redirectTo: 'dashboard',
  },
  {
    path: 'administracion',
    redirectTo: 'dashboard',
  },

  // Cualquier dirección desconocida vuelve a la página pública.
  {
    path: '**',
    redirectTo: '',
  },
];