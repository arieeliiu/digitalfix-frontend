import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginaWorkOrders } from './workorders';
import { ServicioApi, OrdenTrabajo, ServicioCatalogo } from '../../services/api.service';
import { ServicioAutenticacion } from '../../services/auth.service';

// jsdom no implementa completamente la API nativa de <dialog>.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function () { this.removeAttribute('open'); };
});

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
    // Sin zone.js, whenStable no espera la carga: el botón existe antes, pero el dialog no.
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance['ocupado']()).toBe(false);
      expect(root.querySelector('dialog')).not.toBeNull();
    });
    expect((root.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    (root.querySelector('#abrir-nueva-orden') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((root.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    const select = root.querySelector('select')!;
    select.selectedIndex = 1; select.dispatchEvent(new Event('change'));
    for (const [id, value] of [['descripcion', 'Revisión'], ['direccion', 'Calle 123'], ['email-contacto', 'cliente@example.org']]) {
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
    expect(api.crearOrden).toHaveBeenCalledWith({ servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123', emailContacto: 'cliente@example.org' });
    expect(root.textContent).toContain('Orden #42 creada correctamente.');
    expect((root.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
    expect((root.querySelectorAll('dialog')[1] as HTMLDialogElement).open).toBe(false);
    expect(fixture.componentInstance['seleccionada']()).toBeNull();
    expect(root.querySelector('app-orden-desplegable')?.textContent).toContain('Creada');
    const consultar = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Consultar')!;
    consultar.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(api.consultarOrden).toHaveBeenCalledWith(42);
    expect((root.querySelectorAll('dialog')[1] as HTMLDialogElement).open).toBe(true);
    expect(root.textContent).toContain('Dirección: Calle 123');
  });

  it('conserva el formulario y no inventa una orden cuando el backend rechaza', async () => {
    api.crearOrden.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const { fixture, root } = await prepararFormulario();
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('dialog [role="alert"]')?.textContent).toContain('Revisa el servicio');
    expect((root.querySelector('dialog') as HTMLDialogElement).open).toBe(true);
    expect(root.querySelector('app-orden-desplegable')).toBeNull();
    expect((root.querySelector('#descripcion') as HTMLTextAreaElement).value).toBe('Revisión');
  });

  it('valida y envía el correo obligatorio sin convertirlo en identidad', async () => {
    const { fixture, root } = await prepararFormulario();
    const campo = root.querySelector('#email-contacto') as HTMLInputElement;
    expect(campo.type).toBe('email'); expect(campo.maxLength).toBe(254);
    campo.value = 'invalido'; campo.dispatchEvent(new Event('input'));
    await fixture.whenStable(); fixture.detectChanges();
    await fixture.componentInstance['crear']();
    expect(api.crearOrden).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Ingresa un correo válido');
    campo.value = 'cliente@example.org'; campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await fixture.componentInstance['crear']();
    expect(api.crearOrden).toHaveBeenCalledWith({ servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123', emailContacto: 'cliente@example.org' });
  });
  it.each(['', '   ', 'invalido', 'a'.repeat(255) + '@example.org'])('no crea sin correo válido: %s', async correo => {
    const { fixture, root } = await prepararFormulario();
    const campo = root.querySelector('#email-contacto') as HTMLInputElement;
    expect(campo.required).toBe(true);
    expect(root.querySelector('#email-tecnico')).toBeNull();
    fixture.componentInstance['emailContacto'] = correo;
    await fixture.componentInstance['crear']();
    expect(api.crearOrden).not.toHaveBeenCalled();
  });
});

describe('Repuestos y permisos de órdenes', () => {
  const orden: OrdenTrabajo = {
    id: 42, servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123',
    estado: 'CREADA', fechaCreacion: '2026-09-15T00:00:00Z', solicitanteId: 'cliente', emailContacto: 'cliente@example.org',
  };
  const catalogo = [
    { id: 3, nombre: 'Cable', descripcion: 'Cable eléctrico', stock: 5 },
    { id: 7, nombre: 'Interruptor', descripcion: null, stock: 2 },
    { id: 9, nombre: 'Conector', descripcion: null, stock: 0 },
  ];
  const api = {
    listarServicios: vi.fn(() => of<ServicioCatalogo[]>([])),
    listarOrdenes: vi.fn(() => of([orden])),
    listarRepuestos: vi.fn(() => of(catalogo)),
    consultarOrden: vi.fn(() => of(orden)),
    cambiarEstadoOrden: vi.fn(() => of<OrdenTrabajo>({ ...orden, estado: 'ASIGNADA', repuestos: [{ repuestoId: 3, cantidad: 2 }] })),
    actualizarOrden: vi.fn(() => of<OrdenTrabajo>(orden)), eliminarOrden: vi.fn(() => of(undefined)),
    actualizarRepuestosOrden: vi.fn(() => of<OrdenTrabajo>(orden)),
    actualizarContactos: vi.fn(() => of<OrdenTrabajo>({ ...orden, estado: 'CERRADA', emailContacto: null, emailTecnico: 'nuevo@example.org' })),
  };
  let rol: string;
  let oid: string;
  beforeEach(() => {
    vi.clearAllMocks(); rol = 'Admin'; oid = 'admin';
    api.listarRepuestos.mockReturnValue(of(catalogo));
    api.consultarOrden.mockReturnValue(of(orden));
    api.actualizarOrden.mockReturnValue(of(orden));
    api.actualizarRepuestosOrden.mockReturnValue(of(orden));
    api.eliminarOrden.mockReturnValue(of(undefined));
    api.actualizarContactos.mockReturnValue(of({ ...orden, estado: 'CERRADA', emailContacto: null, emailTecnico: 'nuevo@example.org' }));
    api.cambiarEstadoOrden.mockReturnValue(of({ ...orden, estado: 'ASIGNADA', repuestos: [{ repuestoId: 3, cantidad: 2 }] }));
    TestBed.configureTestingModule({ imports: [PaginaWorkOrders], providers: [
      provideRouter([]), { provide: ServicioApi, useValue: api },
      { provide: ServicioAutenticacion, useValue: {
        tieneRol: (valor: string) => valor === rol,
        obtenerCuentaActiva: () => ({ idTokenClaims: { oid } }),
      } },
    ] });
  });

  it('muestra solo la lista inicialmente y ubica Nueva orden a la derecha de Actualizar', async () => {
    // Sin servicios el botón Nueva orden queda deshabilitado y el modal no abriría.
    api.listarServicios.mockReturnValueOnce(of([{ id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 }]));
    const fixture = TestBed.createComponent(PaginaWorkOrders);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.componentInstance['ocupado']()).toBe(false); });
    const cabecera = Array.from(root.querySelectorAll<HTMLButtonElement>('header button'));
    // Botones solo con icono: su nombre accesible está en aria-label.
    expect(cabecera.map(b => b.getAttribute('aria-label'))).toEqual(['Actualizar', 'Nueva orden']);
    expect(root.querySelector('app-orden-desplegable')?.textContent).toContain('#42');
    const dialogo = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialogo.open).toBe(false);

    cabecera[1].click(); fixture.detectChanges();
    expect(dialogo.open).toBe(true);
    expect(root.querySelector('#titulo-modal-orden')?.textContent).toContain('Nueva orden');

    const cancelar = Array.from(dialogo.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Cancelar')!;
    cancelar.click(); fixture.detectChanges();
    expect(dialogo.open).toBe(false);
    expect(root.querySelector('app-orden-desplegable')?.textContent).toContain('#42');

    cabecera[1].click(); fixture.detectChanges();
    const escape = new Event('cancel', { cancelable: true });
    dialogo.dispatchEvent(escape); fixture.detectChanges();
    expect(escape.defaultPrevented).toBe(true);
    expect(dialogo.open).toBe(false);
  });

  async function preparar() {
    const fixture = TestBed.createComponent(PaginaWorkOrders);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const pagina = fixture.componentInstance;
    await vi.waitFor(() => expect(pagina['ocupado']()).toBe(false));
    await pagina['consultar'](42);
    pagina['nuevoEstado'] = 'ASIGNADA'; pagina['tecnicoId'] = ' tecnico-01 '; pagina['emailTecnico'] = 'tecnico@example.org';
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
      status: 'ASIGNADA', tecnicoId: 'tecnico-01', emailTecnico: 'tecnico@example.org', repuestos: [{ repuestoId: 3, cantidad: 2 }, { repuestoId: 7, cantidad: 1 }],
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
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, { status: 'ASIGNADA', tecnicoId: 'tecnico-01', emailTecnico: 'tecnico@example.org', repuestos: [] });
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

  it.each(['Cliente', 'Operador'])('%s no edita ni elimina órdenes ajenas', async valor => {
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
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, { status: 'ASIGNADA', tecnicoId: 'tecnico-01', emailTecnico: 'tecnico@example.org', repuestos: [] });
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

  it('exige correo del técnico y lo envía cuando se informa', async () => {
    const { pagina, root } = await preparar();
    expect((root.querySelector('#email-tecnico') as HTMLInputElement).required).toBe(true);
    pagina['emailTecnico'] = '';
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
    pagina['emailTecnico'] = 'tecnico@example.org';
    await pagina['cambiarEstado']();
    expect(api.cambiarEstadoOrden).toHaveBeenCalledWith(42, {
      status: 'ASIGNADA', tecnicoId: 'tecnico-01', emailTecnico: 'tecnico@example.org', repuestos: [],
    });
  });

  it('cada orden se resume con servicio, fecha y estado y se despliega al seleccionarla', async () => {
    const { pagina, fixture, root } = await preparar();
    pagina['servicios'].set([{ id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 }]);
    pagina['ordenes'].set([orden]);
    fixture.detectChanges();
    const resumen = root.querySelector('#resumen-orden-42') as HTMLButtonElement;
    const panel = root.querySelector('#detalle-orden-42') as HTMLElement & { inert: boolean };
    expect(resumen.textContent).toContain('Mantención');
    expect(resumen.textContent).toContain('Creada');
    expect(resumen.textContent).toMatch(/\d{2}\/\d{2}\/2026/);
    expect(resumen.getAttribute('aria-expanded')).toBe('false');
    expect(resumen.getAttribute('aria-controls')).toBe('detalle-orden-42');
    expect(panel.inert).toBe(true);

    resumen.click(); fixture.detectChanges();
    expect(resumen.getAttribute('aria-expanded')).toBe('true');
    expect(panel.inert).toBe(false);
    expect(panel.textContent).toContain('Calle 123');

    resumen.click(); fixture.detectChanges();
    expect(resumen.getAttribute('aria-expanded')).toBe('false');
  });

  it('el detalle muestra servicio, dirección, técnico, contacto, repuestos y el resumen por estado', async () => {
    const { pagina, fixture, root } = await preparar();
    pagina['ordenes'].set([
      { ...orden, emailContacto: null },
      { ...orden, id: 43, estado: 'ASIGNADA', emailTecnico: 'tecnico@example.org', repuestos: [{ repuestoId: 3, cantidad: 2 }] },
    ]);
    pagina['servicios'].set([{ id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 }]);
    fixture.detectChanges();
    const [primera, segunda] = Array.from(root.querySelectorAll('app-orden-desplegable'));
    expect(primera.textContent).toContain('Mantención');
    expect(primera.textContent).toContain('Calle 123');
    expect(primera.textContent).toContain('Sin asignar');
    expect(primera.textContent).toContain('No registrado');
    expect(segunda.textContent).toContain('tecnico@example.org');
    expect(segunda.textContent).toContain('2 repuestos');
    const resumen = root.querySelector('[aria-label="Órdenes por estado"]')?.textContent?.replace(/\s+/g, ' ');
    expect(resumen).toContain('2 órdenes');
    expect(resumen).toContain('Creada 1');
    expect(resumen).toContain('Asignada 1');
  });

  it('muestra el técnico en segundo plano y agrupa las cerradas en un submenú plegado', async () => {
    const { pagina, fixture, root } = await preparar();
    pagina['servicios'].set([{ id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 }]);
    pagina['ordenes'].set([
      { ...orden, emailTecnico: 'tecnico@example.org' },
      { ...orden, id: 50, estado: 'CERRADA' },
    ]);
    fixture.detectChanges();
    expect(root.querySelector('#resumen-orden-42 .tecnico')?.textContent).toContain('tecnico@example.org');
    expect(root.querySelector('#resumen-orden-50 .tecnico')?.textContent).toContain('Sin técnico asignado');

    const activas = root.querySelector('.lista-ordenes:not(#lista-cerradas)')!;
    expect(activas.querySelector('#resumen-orden-42')).not.toBeNull();
    expect(activas.querySelector('#resumen-orden-50')).toBeNull();
    expect(root.querySelector('#lista-cerradas #resumen-orden-50')).not.toBeNull();

    const boton = root.querySelector('#boton-cerradas') as HTMLButtonElement;
    const panel = root.querySelector('.grupo-cerradas__panel') as HTMLElement & { inert: boolean };
    expect(boton.textContent).toContain('Órdenes cerradas');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(panel.inert).toBe(true);
    boton.click(); fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(panel.inert).toBe(false);
  });

  it('los filtros por texto, estado y servicio reducen la lista y se pueden limpiar', async () => {
    const { pagina, fixture, root } = await preparar();
    pagina['servicios'].set([
      { id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 },
      { id: 2, nombre: 'Instalación', descripcion: '', tarifa: 40000 },
    ]);
    pagina['ordenes'].set([
      orden,
      { ...orden, id: 43, servicioId: 2, descripcion: 'Luminarias LED', estado: 'ASIGNADA' },
    ]);
    fixture.detectChanges();
    const visibles = () => Array.from(root.querySelectorAll('app-orden-desplegable button.resumen')).map(b => b.id);
    expect(visibles()).toEqual(['resumen-orden-42', 'resumen-orden-43']);

    pagina['filtroTexto'].set('led'); fixture.detectChanges();
    expect(visibles()).toEqual(['resumen-orden-43']);
    expect(root.textContent).toContain('Mostrando 1 de 2');

    pagina['filtroTexto'].set(''); pagina['filtroEstado'].set('CREADA'); fixture.detectChanges();
    expect(visibles()).toEqual(['resumen-orden-42']);

    pagina['filtroEstado'].set(''); pagina['filtroServicio'].set(2); fixture.detectChanges();
    expect(visibles()).toEqual(['resumen-orden-43']);

    pagina['filtroTexto'].set('no existe'); fixture.detectChanges();
    expect(root.textContent).toContain('Ninguna orden coincide con los filtros.');

    const limpiar = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Limpiar filtros')!;
    limpiar.click(); fixture.detectChanges();
    expect(pagina['filtroTexto']()).toBe('');
    expect(pagina['filtroServicio']()).toBeNull();
    expect(visibles()).toHaveLength(2);
  });

  it('muestra las etiquetas legibles de los estados sin modificar sus valores', async () => {
    const { pagina, fixture, root } = await preparar();
    pagina['ordenes'].set([{ ...orden, estado: 'EN_DESPLAZAMIENTO' }]);
    pagina['seleccionada'].set({ ...orden, estado: 'EN_EJECUCION' });
    fixture.detectChanges();
    expect(root.querySelector('app-orden-desplegable')?.textContent).toContain('En desplazamiento');
    expect(root.querySelector('.modal-detalle')?.textContent).toContain('EN EJECUCIÓN');
    expect(pagina['nombreEstado']('EN_DESPLAZAMIENTO')).toBe('EN DESPLAZAMIENTO');
    expect(pagina['nombreEstado']('EN_EJECUCION')).toBe('EN EJECUCIÓN');
  });

  it.each(['ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION'] as const)
  ('conserva el formulario original y permite editar correos y repuestos tras %s', async estado => {
    const actual = { ...orden, estado, tecnicoId: 'tecnico-1', emailContacto: 'cliente@example.org',
      emailTecnico: 'viejo@example.org', repuestos: [{ repuestoId: 3, cantidad: 2 }] };
    api.consultarOrden.mockReturnValue(of(actual));
    api.actualizarContactos.mockReturnValue(of({ ...actual, emailTecnico: 'nuevo@example.org' }));
    api.actualizarRepuestosOrden.mockReturnValue(of({ ...actual, repuestos: [{ repuestoId: 3, cantidad: 3 }] }));
    const { pagina, fixture, root } = await preparar();
    pagina['ordenes'].set([actual]); fixture.detectChanges();
    // ngModel escribe el valor en el input en un microtask posterior.
    await pagina['editar'](42); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(pagina['editandoAsignacion']()).toBe(true);
    expect(root.querySelector('#servicio')).not.toBeNull();
    expect(root.querySelector('#descripcion')).not.toBeNull();
    expect(root.querySelector('#direccion')).not.toBeNull();
    expect(root.querySelector('#email-contacto')).not.toBeNull();
    expect((root.querySelector('#editar-email-tecnico') as HTMLInputElement).value).toBe('viejo@example.org');
    expect(root.querySelector('#editar-repuesto-3')).not.toBeNull();
    expect((root.querySelector('#editar-repuesto-3') as HTMLInputElement).value).toBe('2');
    pagina['emailTecnico'] = 'nuevo@example.org';
    pagina['cantidadesEdicion'] = { 3: 3 };
    await pagina['crear']();
    expect(api.actualizarRepuestosOrden).toHaveBeenCalledWith(42, {
      anteriores: [{ repuestoId: 3, cantidad: 2 }], nuevos: [{ repuestoId: 3, cantidad: 3 }],
    });
    expect(api.actualizarContactos).toHaveBeenCalledWith(42, { emailTecnico: 'nuevo@example.org' });
    // Desde 0fb6ddb una orden activa también guarda servicio, descripción y dirección.
    expect(api.actualizarOrden).toHaveBeenCalledWith(42, { servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123' });
    expect(pagina['editandoId']()).toBeNull();
  });

  it('rechaza correo técnico inválido al editar y no modifica inventario', async () => {
    const actual = { ...orden, estado: 'ASIGNADA' as const, tecnicoId: 'tecnico-1',
      emailContacto: 'cliente@example.org', emailTecnico: 'viejo@example.org' };
    api.consultarOrden.mockReturnValue(of(actual));
    const { pagina } = await preparar();
    pagina['ordenes'].set([actual]);
    await pagina['editar'](42);
    pagina['emailTecnico'] = 'invalido';
    await pagina['crear']();
    expect(api.actualizarContactos).not.toHaveBeenCalled();
    expect(api.actualizarRepuestosOrden).not.toHaveBeenCalled();
  });

  it('Consultar abre un modal y no ofrece editar el correo del cliente allí', async () => {
    const { pagina, fixture, root } = await preparar();
    const dialogo = root.querySelectorAll('dialog')[1] as HTMLDialogElement;
    expect(dialogo.open).toBe(true);
    expect(root.querySelector('#detalle-orden')?.textContent).toContain('#42');
    expect(root.querySelector('#contacto-cliente')).toBeNull();
    expect(root.querySelector('#contacto-tecnico')).toBeNull();
    expect(root.querySelector('#email-contacto')).not.toBeNull(); // Existe solo en el modal de Editar.
    expect(root.querySelector('#email-tecnico')).not.toBeNull(); // Requerido para asignar.
    const cancelar = new Event('cancel', { cancelable: true });
    dialogo.dispatchEvent(cancelar); fixture.detectChanges();
    expect(cancelar.defaultPrevented).toBe(true);
    expect(dialogo.open).toBe(false);
    expect(pagina['seleccionada']()).toBeNull();
    expect(root.querySelector('app-orden-desplegable')?.textContent).toContain('#42');
  });

  it('Admin ve las acciones y edita una orden ajena conservando el propietario', async () => {
    const { pagina, fixture, root } = await preparar();
    const botones = Array.from(root.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(botones).toContain('Editar'); expect(botones).toContain('Eliminar');
    await pagina['editar'](42); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('#email-contacto')).not.toBeNull();
    pagina['descripcion'] = 'Cambio de Admin';
    await pagina['crear']();
    expect(api.actualizarOrden).toHaveBeenCalledWith(42, { servicioId: 1, descripcion: 'Cambio de Admin', direccion: 'Calle 123' });
    expect(api.actualizarContactos).not.toHaveBeenCalled();
  });

  it.each(['CREADA', 'CANCELADA'] as const)('Admin elimina una orden ajena %s', async estado => {
    const { pagina } = await preparar();
    pagina['solicitarEliminacion']({ ...orden, estado });
    await pagina['eliminar']();
    expect(api.eliminarOrden).toHaveBeenCalledWith(42);
  });

  it.each(['Admin', 'Operador', 'Cliente'])('%s conserva restricciones de estado incluso en llamadas directas', async valor => {
    rol = valor; oid = 'cliente';
    const { pagina } = await preparar();
    for (const estado of ['ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION', 'CERRADA', 'CANCELADA'] as const) {
      const actual = { ...orden, estado, tecnicoId: 'tecnico-01' };
      api.consultarOrden.mockReturnValue(of(actual)); pagina['ordenes'].set([actual]);
      const puedeCorregir = (valor === 'Admin' || valor === 'Operador')
        && ['ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION'].includes(estado);
      expect(pagina['puedeEditar'](actual)).toBe(puedeCorregir);
      await pagina['editar'](42);
      expect(pagina['editandoId']()).toBe(puedeCorregir ? 42 : null);
      if (puedeCorregir) pagina['cancelarEdicion']();
      if (estado !== 'CANCELADA') {
        expect(pagina['puedeEliminar'](actual)).toBe(false);
        pagina['pendienteEliminar'].set(actual); await pagina['eliminar']();
      }
    }
    expect(api.actualizarOrden).not.toHaveBeenCalled(); expect(api.eliminarOrden).not.toHaveBeenCalled();
  });

  it.each(['nuevo@example.org', 'cliente@example.org'])('edición carga el correo y guarda el cambio %s solo cuando corresponde', async correo => {
    const actual = { ...orden, emailContacto: 'cliente@example.org' };
    api.consultarOrden.mockReturnValue(of(actual));
    api.actualizarOrden.mockReturnValue(of(actual));
    api.actualizarContactos.mockReturnValue(of({ ...actual, emailContacto: correo || null }));
    const { pagina, fixture, root } = await preparar();
    await pagina['editar'](42); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect((root.querySelector('#email-contacto') as HTMLInputElement).value).toBe('cliente@example.org');
    pagina['emailContacto'] = correo; await pagina['crear']();
    if (correo === 'cliente@example.org') expect(api.actualizarContactos).not.toHaveBeenCalled();
    else expect(api.actualizarContactos).toHaveBeenCalledWith(42, { emailContacto: correo });
    expect(pagina['ordenes']()[0].emailContacto).toBe(correo || null);
    expect(pagina['seleccionada']()).toBeNull();
    expect((root.querySelectorAll('dialog')[1] as HTMLDialogElement).open).toBe(false);
    expect(pagina['mensaje']()).toContain('actualizada correctamente');
    expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
  });

  it('correo sin cambios no sobrescribe un contacto actualizado mientras se editaba', async () => {
    api.consultarOrden.mockReturnValue(of({ ...orden, emailContacto: 'original@example.org' }));
    api.actualizarOrden.mockReturnValue(of({ ...orden, emailContacto: 'reciente@example.org' }));
    const { pagina } = await preparar();
    await pagina['editar'](42); await pagina['crear']();
    expect(api.actualizarContactos).not.toHaveBeenCalled();
    expect(pagina['ordenes']()[0].emailContacto).toBe('reciente@example.org');
  });



  it('fallo de PUT conserva formulario y no ejecuta PATCH', async () => {
    const { pagina } = await preparar();
    await pagina['editar'](42); pagina['emailContacto'] = 'nuevo@example.org';
    api.actualizarOrden.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await pagina['crear']();
    expect(api.actualizarContactos).not.toHaveBeenCalled();
    expect(pagina['editandoId']()).toBe(42); expect(pagina['emailContacto']).toBe('nuevo@example.org');
    expect(pagina['mensaje']()).toBe(''); expect(pagina['error']()).not.toBe('');
  });

  it('fallo de PATCH informa guardado parcial y permite reintentar sin anunciar éxito completo', async () => {
    const { pagina } = await preparar();
    await pagina['editar'](42); pagina['emailContacto'] = 'nuevo@example.org';
    api.actualizarContactos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await pagina['crear']();
    expect(pagina['mensaje']()).toBe(''); expect(pagina['error']()).toContain('Los datos de la orden se guardaron');
    expect(pagina['editandoId']()).toBe(42); expect(pagina['emailContacto']).toBe('nuevo@example.org');
    api.actualizarContactos.mockReturnValue(of({ ...orden, emailContacto: 'nuevo@example.org' }));
    await pagina['crear']();
    expect(pagina['editandoId']()).toBeNull(); expect(pagina['mensaje']()).toContain('actualizada correctamente');
  });

  it('consulta una orden antigua sin correo y permite completarlo en edición', async () => {
    const antigua = { ...orden, emailContacto: null };
    api.consultarOrden.mockReturnValue(of(antigua)); api.actualizarOrden.mockReturnValue(of(antigua));
    api.actualizarContactos.mockReturnValue(of({ ...orden, emailContacto: 'completado@example.org' }));
    const { pagina, root, fixture } = await preparar();
    expect(root.textContent).toContain('No registrado');
    await pagina['editar'](42); fixture.detectChanges(); await fixture.whenStable();
    expect(pagina['emailContacto']).toBe('');
    await pagina['crear'](); expect(api.actualizarOrden).not.toHaveBeenCalled();
    pagina['emailContacto'] = 'completado@example.org'; await pagina['crear']();
    expect(api.actualizarContactos).toHaveBeenCalledWith(42, { emailContacto: 'completado@example.org' });
    expect(api.cambiarEstadoOrden).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'invalido', 'a'.repeat(255) + '@example.org'])('rechaza correo inválido al editar: %s', async correo => {
    const { pagina } = await preparar();
    await pagina['editar'](42); pagina['emailContacto'] = correo;
    await pagina['crear']();
    expect(api.actualizarOrden).not.toHaveBeenCalled(); expect(api.actualizarContactos).not.toHaveBeenCalled();
    expect(pagina['error']()).toContain('correo de contacto válido');
  });
});
