import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PaginaHistorial } from './historial';
import { environment } from '../../../environments/environment';

describe('Historial de una orden', () => {
  const anterior = environment.apiGatewayUrl;
  let http: HttpTestingController;
  beforeEach(() => {
    environment.apiGatewayUrl = 'http://localhost:8080';
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ orden: '42' })) } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); environment.apiGatewayUrl = anterior; });

  it('consulta al abrir, muestra actor y transición y actualiza después de un cambio', async () => {
    const fixture = TestBed.createComponent(PaginaHistorial);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Cargando historial');
    http.expectOne('http://localhost:8080/api/workorders/42/history').flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.textContent).toContain('todavía no tiene eventos');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('http://localhost:8080/api/workorders/42/history').flush([{
      eventId: 'evento-1', tipo: 'ORDEN_ESTADO_CAMBIADO', fecha: '2026-11-23T15:00:00Z',
      actorId: 'operador-1', actorRoles: 'Operador', estadoAnterior: 'CREADA', estadoNuevo: 'ASIGNADA',
    }]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelectorAll('.timeline li')).toHaveLength(1);
    expect(root.textContent).toContain('operador-1');
    expect(root.textContent).toContain('CREADA → ASIGNADA');
    expect(root.textContent).toContain('Cambio de estado');
    expect(root.querySelector('input')!.disabled).toBe(false);
  });

  it('explica los errores y permite reintentar sin conservar resultados anteriores', async () => {
    const fixture = TestBed.createComponent(PaginaHistorial);
    fixture.detectChanges();
    http.expectOne('http://localhost:8080/api/workorders/42/history').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable(); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('No se pudo cargar');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('http://localhost:8080/api/workorders/42/history').flush([], { status: 200, statusText: 'OK' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
