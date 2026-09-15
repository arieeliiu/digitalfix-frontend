import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MSAL_INTERCEPTOR_CONFIG, MsalInterceptor, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { crearConfiguracionInterceptor } from '../config/msal.config';
import { ServicioApi } from './api.service';

describe('Conexión autenticada al Gateway', () => {
  const originalUrl = environment.apiGatewayUrl;
  const baseUrl = 'https://digitalfix.example.test/dev';
  const adquirirToken = vi.fn(() => of({ accessToken: 'token-de-prueba' }));
  let http: HttpTestingController;

  beforeEach(() => {
    environment.apiGatewayUrl = `${baseUrl}/`;
    adquirirToken.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
      { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: crearConfiguracionInterceptor },
      { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
      { provide: MsalService, useValue: {
        instance: { getActiveAccount: () => ({ homeAccountId: 'cliente' }) },
        getLogger: () => ({ verbose: vi.fn(), info: vi.fn(), infoPii: vi.fn(), warning: vi.fn() }),
        acquireTokenSilent: adquirirToken,
      } },
      { provide: MsalBroadcastService, useValue: {} },
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    environment.apiGatewayUrl = originalUrl;
  });

  it('consulta perfil conservando el stage y adjunta el access token', () => {
    TestBed.inject(ServicioApi).consultarPerfil().subscribe();
    const request = http.expectOne(`${baseUrl}/api/perfil`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(adquirirToken).toHaveBeenCalledWith(expect.objectContaining({ scopes: [environment.entra.scopeApi] }));
    request.flush({ mensaje: 'Acceso autenticado a DigitalFix.' });
  });

  it.each([
    'https://otra-api.example.test/api/perfil',
    'https://digitalfix.example.test.evil.test/dev/api/perfil',
    `${baseUrl}/public/info`,
    'https://digitalfix.example.test/otro-stage/api/perfil',
  ])('no envía el token fuera de la API configurada: %s', (url) => {
    TestBed.inject(HttpClient).get(url).subscribe();
    const request = http.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(adquirirToken).not.toHaveBeenCalled();
    request.flush({});
  });

  it('no hace una llamada relativa cuando falta la URL', () => {
    environment.apiGatewayUrl = '';
    const error = vi.fn();
    TestBed.inject(ServicioApi).consultarPerfil().subscribe({ error });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Falta configurar apiGatewayUrl.' }));
    http.expectNone(() => true);
  });

  it('consulta catálogo y órdenes y crea sin enviar identidad elegida por el cliente', () => {
    const api = TestBed.inject(ServicioApi);
    api.listarServicios().subscribe();
    api.listarOrdenes().subscribe();
    api.consultarOrden(1).subscribe();
    const datos = { servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123', solicitanteId: 'otra-persona' };
    api.crearOrden(datos).subscribe();
    for (const path of ['/api/catalog/services', '/api/workorders', '/api/workorders/1']) {
      const req = http.expectOne(r => r.url === `${baseUrl}${path}` && r.method === 'GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
      req.flush(path.endsWith('/1') ? {} : []);
    }
    const creada = http.expectOne(r => r.url === `${baseUrl}/api/workorders` && r.method === 'POST');
    expect(creada.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(creada.request.body).toEqual({ servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123' });
    creada.flush({ id: 1 }, { status: 201, statusText: 'Created' });
  });

  it('no llama al placeholder de la guía', () => {
    environment.apiGatewayUrl = 'https://<INVOKE-URL>';
    const api = TestBed.inject(ServicioApi);
    expect(api.estaConfigurada()).toBe(false);
    const error = vi.fn();
    api.listarServicios().subscribe({ error });
    expect(error).toHaveBeenCalled();
    http.expectNone(() => true);
  });
});
