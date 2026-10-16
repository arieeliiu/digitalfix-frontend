import { HttpErrorResponse } from '@angular/common/http';

export function mensajeErrorCatalogo(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.status === 0) {
    return 'No fue posible conectar con el servicio de catálogo.';
  }
  switch (error.status) {
    case 400: return 'Revisa los datos ingresados en el catálogo.';
    case 401: return 'Tu sesión no pudo validarse. Vuelve a iniciar sesión.';
    case 403: return 'Tu cuenta no tiene permiso para esta operación.';
    case 404: return 'No se encontró el elemento del catálogo solicitado.';
    case 409: return 'No se pudo completar la operación porque existe un conflicto con el estado actual del catálogo.';
    default: return 'No se pudo completar la operación en el catálogo. Inténtalo nuevamente.';
  }
}
