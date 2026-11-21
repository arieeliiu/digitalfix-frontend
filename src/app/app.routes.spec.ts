import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MsalGuard } from '@azure/msal-angular';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from './app.routes';
import { ServicioAutenticacion } from './services/auth.service';
import { ServicioApi } from './services/api.service';
import { PaginaServicios } from './pages/catalog/servicios/servicios';
import { PaginaRepuestos } from './pages/catalog/repuestos/repuestos';
import { PaginaAccesoDenegado } from './pages/acceso-denegado/acceso-denegado';

describe('Acceso a las rutas reales del catálogo', () => {
  let rol: string;
  const api = { listarServicios: vi.fn(() => of([])), listarRepuestos: vi.fn(() => of([])) };
  beforeEach(() => {
    vi.clearAllMocks(); rol = 'Admin';
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes),
      { provide: ServicioApi, useValue: api },
      { provide: MsalGuard, useValue: { canActivate: () => of(true) } },
      { provide: ServicioAutenticacion, useValue: {
        cargarAutorizacion: async () => true,
        tieneRol: (valor: string) => valor === rol,
        permisos: () => ['access_as_user'],
      } },
    ] });
  });

  it.each([
    { rol: 'Admin', url: '/catalog/servicios' }, { rol: 'Operador', url: '/catalog/servicios' },
    { rol: 'Admin', url: '/catalog/repuestos' }, { rol: 'Operador', url: '/catalog/repuestos' },
  ])('permite a $rol entrar a $url y carga solo esa lista', async ({ rol: valor, url }) => {
    rol = valor;
    const servicios = url.endsWith('servicios');
    const harness = await RouterTestingHarness.create();
    if (servicios) await harness.navigateByUrl(url, PaginaServicios);
    else await harness.navigateByUrl(url, PaginaRepuestos);
    expect(TestBed.inject(Router).url).toBe(url);
    expect(api.listarServicios).toHaveBeenCalledTimes(servicios ? 1 : 0);
    expect(api.listarRepuestos).toHaveBeenCalledTimes(servicios ? 0 : 1);
  });

  it('la dirección anterior /catalog abre los servicios', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/catalog', PaginaServicios);
    expect(TestBed.inject(Router).url).toBe('/catalog/servicios');
  });

  it.each(['/catalog/servicios', '/catalog/repuestos'])('rechaza a Cliente en %s sin consultar el catálogo', async url => {
    rol = 'Cliente';
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, PaginaAccesoDenegado);
    expect(TestBed.inject(Router).url).toBe('/acceso-denegado');
    expect(api.listarServicios).not.toHaveBeenCalled();
    expect(api.listarRepuestos).not.toHaveBeenCalled();
  });
});
