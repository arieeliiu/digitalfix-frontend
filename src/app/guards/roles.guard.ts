import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';

import { ServicioAutenticacion } from '../services/auth.service';

// Comprueba la sesión y luego los roles exigidos por la ruta.
export const protegerPorRol: CanActivateFn = async (ruta, estado) => {
  const proteccionSesion = inject(MsalGuard);
  const autenticacion = inject(ServicioAutenticacion);
  const enrutador = inject(Router);

  // Espera la comprobación de MSAL antes de consultar los permisos.S
  const resultadoSesion = await firstValueFrom(
    proteccionSesion.canActivate(ruta, estado),
  );

  if (resultadoSesion !== true) {
    return resultadoSesion;
  }

  const consultaCorrecta = await autenticacion.cargarAutorizacion();

  // Un error al consultar permisos es distinto de no tener un rol.
  if (!consultaCorrecta) {
    return enrutador.createUrlTree(['/error-autenticacion']);
  }

  const rolesPermitidos: unknown = ruta.data['roles'];

  // Si la ruta no tiene una configuración válida, deniega el acceso.
  const tieneRolPermitido =
    Array.isArray(rolesPermitidos) &&
    rolesPermitidos.some(
      (rol) => typeof rol === 'string' && autenticacion.tieneRol(rol),
    );

  const tienePermisoApi =
    autenticacion.permisos().includes('access_as_user');

  return tienePermisoApi && tieneRolPermitido
    ? true
    : enrutador.createUrlTree(['/acceso-denegado']);
};