import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mensajeErrorCatalogo } from './error-catalogo';

describe('Mensajes de error de Catalog', () => {
  it.each([
    [400, 'Revisa los datos ingresados en el catálogo.'],
    [401, 'Tu sesión no pudo validarse. Vuelve a iniciar sesión.'],
    [403, 'Tu cuenta no tiene permiso para esta operación.'],
    [404, 'No se encontró el elemento del catálogo solicitado.'],
    [409, 'No se pudo completar la operación porque existe un conflicto con el estado actual del catálogo.'],
    [500, 'No se pudo completar la operación en el catálogo. Inténtalo nuevamente.'],
    [502, 'No se pudo completar la operación en el catálogo. Inténtalo nuevamente.'],
    [503, 'No se pudo completar la operación en el catálogo. Inténtalo nuevamente.'],
    [0, 'No fue posible conectar con el servicio de catálogo.'],
  ])('traduce HTTP %s sin exponer detalles internos', (status, mensaje) => {
    const error = new HttpErrorResponse({ status: status as number, error: { detail: 'Traza interna' } });
    expect(mensajeErrorCatalogo(error)).toBe(mensaje);
  });

  it.each([new Error('Traza interna'), null, undefined, 'Error interno'])('maneja errores que no son HttpErrorResponse: %s', error => {
    expect(mensajeErrorCatalogo(error)).toBe('No fue posible conectar con el servicio de catálogo.');
  });
});
