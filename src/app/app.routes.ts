import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { PaginaAcceso } from './pages/acceso/acceso';
import { PaginaErrorAuth } from './pages/error-auth/error-auth';
import { PaginaAccesoDenegado } from './pages/acceso-denegado/acceso-denegado';

import { PaginaDashboard } from './pages/dashboard/dashboard';
import { PaginaWorkOrders } from './pages/workorders/workorders';
import { PaginaServicios } from './pages/catalog/servicios/servicios';
import { PaginaRepuestos } from './pages/catalog/repuestos/repuestos';

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

  // Acceso al módulo de órdenes de trabajo.
  {
    path: 'workorders',
    component: PaginaWorkOrders,
    canActivate: [protegerPorRol],
    data: { roles: ['Admin', 'Operador', 'Cliente'] },
  },

  // Catálogo en dos páginas: servicios técnicos y repuestos. Admin edita; Operador solo lee.
  {
    path: 'catalog/servicios',
    component: PaginaServicios,
    canActivate: [protegerPorRol],
    data: { roles: ['Admin', 'Operador'] },
  },
  {
    path: 'catalog/repuestos',
    component: PaginaRepuestos,
    canActivate: [protegerPorRol],
    data: { roles: ['Admin', 'Operador'] },
  },
  // La dirección anterior del catálogo abre servicios, para no romper bookmarks.
  {
    path: 'catalog',
    pathMatch: 'full',
    redirectTo: 'catalog/servicios',
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
