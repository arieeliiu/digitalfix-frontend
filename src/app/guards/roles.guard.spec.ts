import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServicioAutenticacion } from '../services/auth.service';
import { protegerPorRol } from './roles.guard';

describe('Protección de rutas por rol', () => {
  let ruta: ActivatedRouteSnapshot;
  let enrutador: Router;
  let rolActual: string;

  // Simula una sesión autenticada sin conectarse a Entra.
  const sesion = {
    canActivate: vi.fn(() => of(true)),
  };

  // Simula el resultado del servicio, conservando el guard real.
  const autenticacion = {
    cargarAutorizacion: vi.fn(async () => true),
    tieneRol: vi.fn((rol: string) => rol === rolActual),
    permisos: vi.fn(() => ['access_as_user']),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    rolActual = 'Admin';
    sesion.canActivate.mockReturnValue(of(true));
    autenticacion.cargarAutorizacion.mockResolvedValue(true);
    autenticacion.tieneRol.mockImplementation(
      (rol: string) => rol === rolActual,
    );
    autenticacion.permisos.mockReturnValue(['access_as_user']);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MsalGuard, useValue: sesion },
        { provide: ServicioAutenticacion, useValue: autenticacion },
      ],
    });

    enrutador = TestBed.inject(Router);
    ruta = new ActivatedRouteSnapshot();
    ruta.data = { roles: ['Admin'] };
  });

  // Ejecuta el guard dentro del contexto de inyección de Angular.
  async function ejecutarGuard() {
    const resultado = await TestBed.runInInjectionContext(() =>
      protegerPorRol(
        ruta,
        { url: '/administracion' } as RouterStateSnapshot,
      ),
    );

    // Convierte las redirecciones en rutas fáciles de comprobar.
    return resultado instanceof UrlTree
      ? enrutador.serializeUrl(resultado)
      : resultado;
  }

  it('permite entrar a Admin con el scope requerido', async () => {
    expect(await ejecutarGuard()).toBe(true);
  });

  it.each(['Operador', 'Cliente', ''])(
    'deniega el acceso al rol "%s"',
    async (rol) => {
      rolActual = rol;

      expect(await ejecutarGuard()).toBe('/acceso-denegado');
    },
  );

  it('deniega el acceso a Admin si falta el scope', async () => {
    autenticacion.permisos.mockReturnValue([]);

    expect(await ejecutarGuard()).toBe('/acceso-denegado');
  });

  it('dirige a error cuando falla la consulta de permisos', async () => {
    autenticacion.cargarAutorizacion.mockResolvedValue(false);

    expect(await ejecutarGuard()).toBe('/error-autenticacion');
  });

  it('no consulta permisos si MSAL bloquea la navegación', async () => {
    sesion.canActivate.mockReturnValue(of(false));

    expect(await ejecutarGuard()).toBe(false);
    expect(autenticacion.cargarAutorizacion).not.toHaveBeenCalled();
  });

  it('deniega una ruta sin roles configurados', async () => {
    ruta.data = {};

    expect(await ejecutarGuard()).toBe('/acceso-denegado');
  });

  it('espera los permisos antes de comprobar el rol', async () => {
    let terminarConsulta!: (resultado: boolean) => void;

    // Mantiene la consulta pendiente hasta que el test la complete.
    autenticacion.cargarAutorizacion.mockReturnValue(
      new Promise<boolean>((resolver) => {
        terminarConsulta = resolver;
      }),
    );

    const resultadoPendiente = ejecutarGuard();

    // Permite que termine la comprobación inicial de MSAL.
    await Promise.resolve();
    await Promise.resolve();

    expect(autenticacion.cargarAutorizacion).toHaveBeenCalledOnce();
    expect(autenticacion.tieneRol).not.toHaveBeenCalled();

    terminarConsulta(true);

    expect(await resultadoPendiente).toBe(true);
    expect(autenticacion.tieneRol).toHaveBeenCalledWith('Admin');
  });
});