import { HttpErrorResponse } from '@angular/common/http';
export function mensajeErrorApi(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Tu sesión no pudo validarse. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para esta operación.';
    if (error.status === 404) return 'No se encontró el recurso solicitado.';
    if (error.status === 400) return 'Revisa el servicio, la descripción y la dirección ingresados.';
    if (error.status === 409) return 'La orden cambió o su estado no permite esta operación. Actualiza las órdenes.';
    return 'No se pudo completar la solicitud. Actualiza tus órdenes antes de volver a enviar una creación.';
  }
  return 'No fue posible conectar. Revisa la configuración de la aplicación o vuelve a iniciar sesión.';
}

