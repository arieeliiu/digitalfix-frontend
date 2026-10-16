import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginaWorkOrders } from './workorders';
import { ServicioApi, OrdenTrabajo } from '../../services/api.service';
import { ServicioAutenticacion } from '../../services/auth.service';

describe('Formulario de órdenes reales', () => {
  const orden = { id: 42, servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123', estado: 'CREADA', fechaCreacion: '2026-09-15T00:00:00Z', solicitanteId: 'cliente' };
  const api = {
    listarServicios: vi.fn(() => of([{ id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 }])),
    listarOrdenes: vi.fn(() => of([])),
    crearOrden: vi.fn(() => of(orden)),
    consultarOrden: vi.fn(() => of(orden)),
  };
  const auth = {
    tieneRol: vi.fn(() => false),
    obtenerCuentaActiva: () => ({ idTokenClaims: { oid: 'cliente' } }),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.crearOrden.mockReturnValue(of(orden));
    auth.tieneRol.mockReturnValue(false);
    TestBed.configureTestingModule({ imports: [PaginaWorkOrders], providers: [
      provideRouter([]), { provide: ServicioApi, useValue: api },
      { provide: ServicioAutenticacion, useValue: auth },
    ] });
  });

  async function prepararFormulario() {
    const fixture = TestBed.createComponent(PaginaWorkOrders);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.querySelector('select')).not.toBeNull();
    });
    const select = root.querySelector('select')!;
    select.selectedIndex = 1; select.dispatchEvent(new Event('change'));
    for (const [id, value] of [['descripcion', 'Revisión'], ['direccion', 'Calle 123']]) {
      const input = root.querySelector(`#${id}`) as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable(); fixture.detectChanges();
    return { fixture, root };
  }

  it('elige un servicio, crea y consulta el detalle devuelto por la API', async () => {
    const { fixture, root } = await prepararFormulario();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable(); fixture.detectChanges();
    expect(api.crearOrden).toHaveBeenCalledWith({ servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123' });
    expect(root.textContent).toContain('Orden #42 creada correctamente.');
    expect(root.textContent).toContain('CREADA');
    const consultar = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Consultar')!;
    consultar.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(api.consultarOrden).toHaveBeenCalledWith(42);
    expect(root.textContent).toContain('Dirección: Calle 123');
  });

  it('conserva el formulario y no inventa una orden cuando el backend rechaza', async () => {
    api.crearOrden.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const { fixture, root } = await prepararFormulario();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Revisa el servicio');
    expect(root.querySelector('tbody tr')).toBeNull();
    expect((root.querySelector('#descripcion') as HTMLTextAreaElement).value).toBe('Revisión');
  });
});

describe('Repuestos y permisos de órdenes', () => {
  const orden: OrdenTrabajo = {
    id: 42, servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123',
    estado: 'CREADA', fechaCreacion: '2026-09-15T00:00:00Z', solicitanteId: 'cliente',
  };
  const catalogo = [
    { id: 3, nombre: 'Cable', descripcion: 'Cable eléctrico', stock: 5 },
    { id: 7, nombre: 'Interruptor', descripcion: null, stock: 2 },
    { id: 9, nombre: 'Conector', descripcion: null, stock: 0 },
  ];
  const api = {
    listarServicios: vi.fn(() => of([])),
    listarOrdenes: vi.fn(() => of([orden])),
    listarRepuestos: vi.fn(() => of(catalogo)),
    consultarOrden: vi.fn(() => of(orden)),
    cambiarEstadoOrden: vi.fn(() => of<OrdenTrabajo>({ ...orden, estado: 'ASIGNADA', repuestos: [{ repuestoId: 3, cantidad: 2 }] })),
    actualizarOrden: vi.fn(), eliminarOrden: vi.fn(),
  };
  let rol: string;
  let oid: string;
  beforeEach(() => {
    vi.clearAllMocks(); rol = 'Admin'; oid = 'admin';
    api.listarRepuestos.mockReturnValue(of(catalogo));
    api.consultarOrden.mockReturnValue(of(orden));
    api.cambiarEstadoOrden.mockReturnValue(of({ ...orden, estado: 'ASIGNADA', repuestos: [{ repuestoId: 3, cantidad: 2 }] }));
    TestBed.configureTestingModule({ imports: [PaginaWorkOrders], providers: [
      provideRouter([]), { provide: ServicioApi, useValue: api },
      { provide: ServicioAutenticacion, useValue: {
        tieneRol: (valor: string) => valor === rol,
        obtenerCuentaActiva: () => ({ idTokenClaims: { oid } }),
      } },
    ] });
  });

  async function preparar() {
    const fixture = TestBed.createComponent(PaginaWorkOrders);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const pagina = fixture.componentInstance;
    await vi.waitFor(() => expect(pagina['ocupado']()).toBe(false));
    await pagina['consultar'](42);
    pagina['nuevoEstado'] = 'ASIGNADA'; pagina['tecnicoId'] = ' tecnico-01 ';
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    return { fixture, pagina, root: fixture.nativeElement as HTMLElement };
  }

  it.each(['Admin', 'Operador'])('%s asigna con cantidades positivas y actualiza detalle y stock real', async (valor) => {
    rol = valor;
    const { pagina, fixture, root } = await preparar();
    expect(root.querySelector('#repuesto-3')).not.toBeNull();
    expect((root.querySelector('#repuesto-9') as HTMLInputElement).disabled).toBe(true);
    pagina['cantidades'] = { 3: 2, 7: 1, 9: 0 };
    api.listarRepuestos.mockReturnValue(of(catalogo.map(r => ({ ...r, stock: r.id === 3 ? 3 : r.stock }))));
    await pagina['cambiarEstado'](); fixture.detectChanges();
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, {
      status: 'ASIGNADA', tecnicoId: 'tecnico-01', repuestos: [{ repuestoId: 3, cantidad: 2 }, { repuestoId: 7, cantidad: 1 }],
    });
    expect(pagina['ordenes']()[0].estado).toBe('ASIGNADA');
    expect(pagina['seleccionada']()?.estado).toBe('ASIGNADA');
    expect(pagina['cantidades']).toEqual({});
    expect(api.listarRepuestos).toHaveBeenCalledTimes(2);
    expect(pagina['repuestos']()[0].stock).toBe(3);
    expect(root.textContent).toContain('Cable — 2 unidades');
  });

  it('permite asignar sin repuestos y omite las cantidades cero', async () => {
    const { pagina } = await preparar();
    pagina['cantidades'] = { 3: 0, 7: 0 };
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, { status: 'ASIGNADA', tecnicoId: 'tecnico-01', repuestos: [] });
  });

  it.each([6, -1, 1.5, null, NaN])('rechaza cantidad inválida %s antes del request', async cantidad => {
    const { pagina } = await preparar();
    pagina['cantidades'] = { 3: cantidad };
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
    expect(pagina['error']()).toContain('entero entre 0 y 5');
  });

  it('rechaza cantidad positiva sin stock y exige técnico', async () => {
    const { pagina } = await preparar();
    pagina['cantidades'] = { 9: 1 };
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
    pagina['cantidades'] = {}; pagina['tecnicoId'] = ' ';
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
  });

  it.each([
    ['CREADA', 'CANCELADA'], ['ASIGNADA', 'EN_DESPLAZAMIENTO'],
    ['EN_DESPLAZAMIENTO', 'EN_EJECUCION'], ['EN_EJECUCION', 'CERRADA'],
  ] as const)('cambia %s a %s sin enviar repuestos ni técnico', async (estado, siguiente) => {
    const { pagina } = await preparar();
    pagina['seleccionada'].set({ ...orden, estado }); pagina['nuevoEstado'] = siguiente;
    pagina['cantidades'] = { 3: 2 };
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, { status: siguiente });
    expect(api.listarRepuestos).toHaveBeenCalledTimes(1);
  });

  it.each(['Admin', 'Operador'])('%s no edita ni elimina órdenes ajenas', async valor => {
    rol = valor;
    const { pagina, root } = await preparar();
    const botones = Array.from(root.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(botones).not.toContain('Editar'); expect(botones).not.toContain('Eliminar');
    expect(root.querySelector('h1')?.textContent).toBe('Órdenes de trabajo');
    await pagina['editar'](42);
    expect(pagina['editandoId']()).toBeNull();
    pagina['solicitarEliminacion'](orden);
    expect(pagina['pendienteEliminar']()).toBeNull();
    expect(api.actualizarOrden).not.toHaveBeenCalled(); expect(api.eliminarOrden).not.toHaveBeenCalled();
  });

  it('Cliente conserva acciones propias, no gestiona estados ni carga catálogo', async () => {
    rol = 'Cliente'; oid = 'cliente';
    const { pagina, fixture, root } = await preparar();
    expect(api.listarRepuestos).not.toHaveBeenCalled();
    expect(root.querySelector('#estado')).toBeNull();
    const botones = Array.from(root.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(botones).toContain('Editar'); expect(botones).toContain('Eliminar');
    await pagina['cambiarEstado'](); expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
    pagina['seleccionada'].set({ ...orden, repuestos: [{ repuestoId: 3, cantidad: 1 }] });
    fixture.detectChanges(); expect(root.textContent).toContain('Repuesto #3 — 1 unidad');
    await pagina['editar'](42); expect(pagina['editandoId']()).toBe(42);
  });

  it('el fallo de catálogo informa el error sin perder las órdenes y permite reintentar', async () => {
    api.listarRepuestos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const { pagina, root } = await preparar();
    expect(pagina['ordenes']()).toEqual([orden]);
    expect(root.textContent).toContain('No se pudieron cargar los repuestos');
    expect(pagina['repuestos']()).toEqual([]);
    api.listarRepuestos.mockReturnValue(of(catalogo));
    await pagina['cargarRepuestos']();
    expect(pagina['errorRepuestos']()).toBe(''); expect(pagina['repuestos']()).toEqual(catalogo);
  });

  it.each([{ repuestos: [] }, { repuestos: catalogo.map(r => ({ ...r, stock: 0 })) }])('permite asignar sin repuestos con catálogo vacío o agotado', async ({ repuestos }) => {
    api.listarRepuestos.mockReturnValue(of(repuestos));
    const { pagina } = await preparar();
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, { status: 'ASIGNADA', tecnicoId: 'tecnico-01', repuestos: [] });
  });

  it('conserva asignación exitosa aunque falle la recarga de stock', async () => {
    const { pagina } = await preparar();
    api.listarRepuestos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await pagina['cambiarEstado']();
    expect(pagina['seleccionada']()?.estado).toBe('ASIGNADA');
    expect(pagina['mensaje']()).toContain('actualizado');
    expect(pagina['errorRepuestos']()).not.toBe('');
    expect(pagina['repuestos']()).toEqual([]);
  });

  it('conserva cantidades y orden cuando el backend rechaza la asignación', async () => {
    const { pagina } = await preparar();
    pagina['cantidades'] = { 3: 2 };
    api.cambiarEstadoOrden.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await pagina['cambiarEstado']();
    expect(pagina['seleccionada']()?.estado).toBe('CREADA');
    expect(pagina['cantidades']).toEqual({ 3: 2 });
    expect(pagina['error']()).not.toBe('');
    expect(api.listarRepuestos).toHaveBeenCalledTimes(1);
  });
});
