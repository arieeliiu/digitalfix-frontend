import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MsalGuard } from '@azure/msal-angular';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from './app.routes';
import { ServicioAutenticacion } from './services/auth.service';
import { ServicioApi } from './services/api.service';
import { PaginaCatalog } from './pages/catalog/catalog';
import { PaginaAccesoDenegado } from './pages/acceso-denegado/acceso-denegado';

describe('Acceso a la ruta real /catalog', () => {
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

  it.each(['Admin', 'Operador'])('permite a %s entrar y cargar el catálogo', async valor => {
    rol = valor;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/catalog', PaginaCatalog);
    expect(TestBed.inject(Router).url).toBe('/catalog');
    expect(api.listarServicios).toHaveBeenCalledOnce();
    expect(api.listarRepuestos).toHaveBeenCalledOnce();
  });

  it('rechaza a Cliente sin consultar el catálogo', async () => {
    rol = 'Cliente';
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/catalog', PaginaAccesoDenegado);
    expect(TestBed.inject(Router).url).toBe('/acceso-denegado');
    expect(api.listarServicios).not.toHaveBeenCalled();
    expect(api.listarRepuestos).not.toHaveBeenCalled();
  });
});
