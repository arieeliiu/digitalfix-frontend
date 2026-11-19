import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaDashboard } from './dashboard';
import { EstadoOrden, OrdenTrabajo, ServicioApi } from '../../services/api.service';
import { ServicioAutenticacion } from '../../services/auth.service';

function orden(id: number, estado: EstadoOrden, dia: number): OrdenTrabajo {
  return {
    id, estado, servicioId: 1, descripcion: `Orden ${id}`, direccion: `Calle ${id}`,
    solicitanteId: 'cliente', fechaCreacion: `2026-11-${String(dia).padStart(2, '0')}T10:00:00Z`,
  };
}

describe('Dashboard por rol', () => {
  const ordenes = [
    orden(1, 'CREADA', 5), orden(2, 'CREADA', 2), orden(3, 'ASIGNADA', 3),
    orden(4, 'EN_DESPLAZAMIENTO', 4), orden(5, 'EN_EJECUCION', 6), orden(6, 'CERRADA', 1), orden(7, 'CANCELADA', 7),
  ];
  const repuestos = [
    { id: 3, nombre: 'Cable', descripcion: null, stock: 4 },
    { id: 7, nombre: 'Interruptor', descripcion: null, stock: 0 },
  ];
  const roles = signal<string[]>([]);
  const api = {
    estaConfigurada: vi.fn(() => true),
    consultarPerfil: vi.fn(() => of({ mensaje: 'ok' })),
    listarOrdenes: vi.fn(() => of(ordenes)),
    listarServicios: vi.fn(() => of([{ id: 1, nombre: 'Mantención', descripcion: null, tarifa: 25000 }])),
    listarRepuestos: vi.fn(() => of(repuestos)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.consultarPerfil.mockReturnValue(of({ mensaje: 'ok' }));
    api.listarOrdenes.mockReturnValue(of(ordenes));
    roles.set([]);
    TestBed.configureTestingModule({ imports: [PaginaDashboard], providers: [
      provideRouter([]), { provide: ServicioApi, useValue: api },
      { provide: ServicioAutenticacion, useValue: {
        roles,
        cargarAutorizacion: vi.fn(async () => true),
        cargandoAutorizacion: signal(false),
        mensajeError: signal(''),
      } },
    ] });
  });

  // Sin zone.js, whenStable no espera las promesas de carga: se espera el estado real.
  async function preparar(...conRoles: string[]) {
    roles.set(conRoles);
    const fixture = TestBed.createComponent(PaginaDashboard);
    const root = fixture.nativeElement as HTMLElement;
    const pagina = fixture.componentInstance;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(pagina['estadoConexion']() === 'Conexión con DigitalFix verificada.' || pagina['errorConexion']()).toBeTruthy();
      expect(pagina['cargando']()).toBe(false);
    });
    fixture.detectChanges();
    return { fixture, root };
  }

  function kpi(root: HTMLElement, etiqueta: string): string | undefined {
    const tarjeta = Array.from(root.querySelectorAll('.kpi')).find(k => k.querySelector('dt')?.textContent?.trim() === etiqueta);
    return tarjeta?.querySelector('dd')?.textContent?.trim();
  }

  function idsDe(root: HTMLElement, tituloId: string): string[] {
    const seccion = root.querySelector(`[aria-labelledby="${tituloId}"]`)!;
    return Array.from(seccion.querySelectorAll('tbody tr td:first-child')).map(td => td.textContent!.trim());
  }

  it('Admin ve los indicadores de la red y los repuestos sin stock', async () => {
    const { root } = await preparar('Admin');

    expect(kpi(root, 'Órdenes activas')).toBe('5');
    expect(kpi(root, 'Por asignar')).toBe('2');
    expect(kpi(root, 'En terreno')).toBe('2');
    expect(kpi(root, 'Cerradas')).toBe('1');
    expect(kpi(root, 'Repuestos sin stock')).toBe('1');
    expect(root.querySelector('.aviso-stock')?.textContent).toContain('Interruptor');
    expect(root.querySelector('.aviso-stock')?.textContent).not.toContain('Cable');
    expect(root.querySelector('#titulo-por-asignar')).toBeNull();
  });

  it('Operador ve por asignar (más antiguas primero) y en terreno, sin consultar stock', async () => {
    const { root } = await preparar('Operador');

    expect(idsDe(root, 'titulo-por-asignar')).toEqual(['#2', '#1']);
    expect(idsDe(root, 'titulo-en-terreno')).toEqual(['#4', '#5']);
    expect(root.querySelector('[aria-labelledby="titulo-en-terreno"]')?.textContent).toContain('En desplazamiento');
    expect(root.textContent).toContain('Mantención');
    expect(root.querySelector('.kpis')).toBeNull();
    expect(api.listarRepuestos).not.toHaveBeenCalled();
  });

  it('Operador sin pendientes ve los estados vacíos', async () => {
    api.listarOrdenes.mockReturnValue(of([orden(6, 'CERRADA', 1)]));
    const { root } = await preparar('Operador');

    expect(root.textContent).toContain('No hay órdenes esperando técnico.');
    expect(root.textContent).toContain('No hay técnicos en desplazamiento ni en ejecución.');
  });

  it('Cliente ve sus últimas órdenes, más recientes primero y con tope de filas', async () => {
    api.listarOrdenes.mockReturnValue(of(Array.from({ length: 10 }, (_, i) => orden(i + 1, 'CREADA', i + 1))));
    const { root } = await preparar('Cliente');

    const ids = idsDe(root, 'titulo-ultimas');
    expect(ids).toHaveLength(8);
    expect(ids[0]).toBe('#10');
    expect(root.textContent).toContain('Y 2 más en Órdenes de trabajo.');
    expect(root.querySelector('.kpis')).toBeNull();
    expect(root.querySelector('#titulo-por-asignar')).toBeNull();
  });

  it('Cliente sin órdenes ve un mensaje vacío', async () => {
    api.listarOrdenes.mockReturnValue(of([]));
    const { root } = await preparar('Cliente');

    expect(root.textContent).toContain('Todavía no tienes órdenes de trabajo.');
  });

  it('una cuenta sin rol ve el aviso y no consulta órdenes', async () => {
    const { root } = await preparar();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no tiene un rol asignado');
    expect(api.listarOrdenes).not.toHaveBeenCalled();
    expect(root.querySelector('button[aria-label="Actualizar"]')).toBeNull();
  });

  it('si falla el perfil informa el error y no consulta órdenes', async () => {
    api.consultarPerfil.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const { root } = await preparar('Admin');

    expect(root.textContent).toContain('Tu cuenta no tiene permiso para acceder a DigitalFix.');
    expect(api.listarOrdenes).not.toHaveBeenCalled();
  });

  it('el error de órdenes se informa y el icono de reintentar vuelve a consultar', async () => {
    api.listarOrdenes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const { fixture, root } = await preparar('Operador');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar las órdenes.');

    api.listarOrdenes.mockReturnValue(of(ordenes));
    (root.querySelector('button[aria-label="Reintentar órdenes"]') as HTMLButtonElement).click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelector('#titulo-por-asignar')).not.toBeNull(); });

    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('el icono de actualizar vuelve a pedir los datos del rol', async () => {
    const { fixture, root } = await preparar('Admin');
    expect(api.listarOrdenes).toHaveBeenCalledTimes(1);

    (root.querySelector('button[aria-label="Actualizar"]') as HTMLButtonElement).click();
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.componentInstance['cargando']()).toBe(false); });

    expect(api.listarOrdenes).toHaveBeenCalledTimes(2);
    expect(api.listarRepuestos).toHaveBeenCalledTimes(2);
  });
});
