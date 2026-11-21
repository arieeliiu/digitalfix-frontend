import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PaginaRepuestos } from './repuestos';
import { ServicioAutenticacion } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

// jsdom no implementa completamente la API nativa de <dialog>.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function () { this.removeAttribute('open'); };
});

describe('Catálogo de repuestos', () => {
  const originalUrl = environment.apiGatewayUrl;
  const baseUrl = 'https://digitalfix.example.test/dev';
  const url = `${baseUrl}/api/catalog/spare-parts`;
  const repuestos = [
    { id: 3, nombre: 'Cable', descripcion: 'Cable eléctrico', stock: 10 },
    { id: 7, nombre: 'Interruptor', descripcion: null, stock: 0 },
    { id: 8, nombre: 'Conector', descripcion: ' ', stock: 1 },
  ];
  let http: HttpTestingController;
  let rol: string;

  beforeEach(() => {
    environment.apiGatewayUrl = baseUrl;
    rol = 'Operador';
    TestBed.configureTestingModule({ imports: [PaginaRepuestos], providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ServicioAutenticacion, useValue: { tieneRol: (valor: string) => valor === rol } },
    ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.apiGatewayUrl = originalUrl;
    http.verify();
  });

  function preparar() {
    const fixture = TestBed.createComponent(PaginaRepuestos);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const consulta = http.expectOne(url);
    expect(consulta.request.method).toBe('GET');
    // Esta página no consulta servicios.
    http.expectNone(`${baseUrl}/api/catalog/services`);
    return { fixture, root, consulta };
  }

  async function cargado(datos: object[] = repuestos) {
    const entorno = preparar();
    entorno.consulta.flush(datos);
    await entorno.fixture.whenStable(); entorno.fixture.detectChanges();
    return entorno;
  }

  async function prepararAdmin() {
    rol = 'Admin';
    return cargado();
  }

  function boton(root: HTMLElement, texto: string): HTMLButtonElement {
    const encontrado = Array.from(root.querySelectorAll('button')).find(b =>
      b.getAttribute('aria-label') === texto || b.textContent?.trim() === texto);
    expect(encontrado, texto).toBeDefined();
    return encontrado!;
  }

  function ingresar(root: HTMLElement, id: string, valor: string): void {
    const input = root.querySelector('#' + id) as HTMLInputElement;
    input.value = valor; input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function dialogo(root: HTMLElement): HTMLDialogElement {
    return root.querySelector('dialog[aria-labelledby="eliminar-repuesto"]') as HTMLDialogElement;
  }

  it('muestra carga y luego repuestos con su stock y descripción', async () => {
    const { fixture, root, consulta } = preparar();
    expect(root.textContent).toContain('Cargando repuestos');
    expect(boton(root, 'Actualizar').disabled).toBe(true);
    consulta.flush(repuestos);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toContain('Repuestos');
    const filas = root.querySelectorAll('tbody tr');
    expect(filas[0].textContent).toContain('Cable eléctrico');
    // Solo el número, sin la palabra "unidades".
    expect(filas[0].querySelector('.celda-stock')?.textContent?.trim()).toBe('10');
    expect(root.querySelector('tbody')?.textContent).not.toMatch(/unidad/);
    expect(filas[1].textContent).toContain('Sin stock');
    expect(filas[1].textContent).toContain('Sin descripción');
    expect(filas[2].querySelector('.celda-stock')?.textContent?.trim()).toBe('1');
    expect(filas[2].textContent).toContain('Sin descripción');
    expect(boton(root, 'Actualizar').disabled).toBe(false);
  });

  it('muestra la lista vacía sin confundirla con un error', async () => {
    const { root } = await cargado([]);
    expect(root.textContent).toContain('No hay repuestos disponibles todavía.');
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('table')).toBeNull();
  });

  it('un error de carga se informa sin botón propio y Actualizar trae el stock del servidor', async () => {
    const { fixture, root, consulta } = preparar();
    consulta.flush({}, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable(); fixture.detectChanges();
    const alerta = root.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('No se pudieron cargar los repuestos');
    expect(alerta?.querySelector('button')).toBeNull();
    boton(root, 'Actualizar').click(); fixture.detectChanges();
    http.expectOne(url).flush([{ ...repuestos[0], stock: 0 }]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.textContent).toContain('Sin stock');
    expect(root.querySelector('.celda-stock')?.textContent?.trim()).not.toBe('10');
  });

  it.each(['crear', 'editar'])('Admin puede %s un repuesto y refresca desde el backend', async operacion => {
    const { fixture, root } = await prepararAdmin();
    const editando = operacion === 'editar';
    boton(root, editando ? 'Editar repuesto Cable' : 'Nuevo repuesto').click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const form = root.querySelector('form[aria-labelledby="form-repuesto"]')!;
    expect(form).not.toBeNull();
    if (editando) {
      expect((root.querySelector('#repuesto-nombre') as HTMLInputElement).value).toBe('Cable');
      expect((root.querySelector('#repuesto-stock') as HTMLInputElement).value).toBe('10');
    }
    ingresar(root, 'repuesto-nombre', ' Nuevo nombre ');
    ingresar(root, 'repuesto-descripcion', ' Descripción nueva ');
    ingresar(root, 'repuesto-stock', '0');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(boton(root, 'Guardando...').disabled).toBe(true);
    const req = http.expectOne(r => r.method === (editando ? 'PUT' : 'POST') && r.url === `${url}${editando ? '/3' : ''}`);
    expect(req.request.body).toEqual({ nombre: 'Nuevo nombre', descripcion: 'Descripción nueva', stock: 0 });
    req.flush({ id: 3, ...req.request.body });
    await Promise.resolve();
    http.expectOne(url).flush([{ id: 3, nombre: 'Respuesta del servidor', descripcion: null, stock: 4 }]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('form')).toBeNull();
    expect(root.textContent).toContain('Respuesta del servidor');
    expect(root.querySelector('.celda-stock')?.textContent?.trim()).toBe('4');
  });

  it('el formulario se abre en una ventana emergente y Cerrar o Escape la cierran sin guardar', async () => {
    const { fixture, root } = await prepararAdmin();
    const ventana = root.querySelector('dialog[aria-labelledby="form-repuesto"]') as HTMLDialogElement;
    expect(ventana.open).toBe(false);
    boton(root, 'Nuevo repuesto').click(); fixture.detectChanges();
    expect(ventana.open).toBe(true);
    expect(ventana.querySelector('form')).not.toBeNull();
    expect(ventana.querySelector('label[for="repuesto-nombre"]')?.textContent).toContain('Nombre');
    boton(ventana, 'Cerrar formulario de repuesto').click(); fixture.detectChanges();
    expect(ventana.open).toBe(false);
    expect(root.querySelector('form')).toBeNull();

    boton(root, 'Editar repuesto Cable').click(); fixture.detectChanges();
    const evento = new Event('cancel', { cancelable: true });
    ventana.dispatchEvent(evento); fixture.detectChanges();
    expect(evento.defaultPrevented).toBe(true);
    expect(ventana.open).toBe(false);
    http.expectNone(r => r.method !== 'GET');
  });

  it('eliminar abre una ventana emergente, Conservar la cierra y Confirmar envía un solo DELETE', async () => {
    const { fixture, root } = await prepararAdmin();
    const ventana = dialogo(root);
    boton(root, 'Eliminar repuesto Cable').click(); fixture.detectChanges();
    expect(ventana.open).toBe(true);
    expect(ventana.textContent).toContain('¿Eliminar el repuesto Cable?');
    boton(ventana, 'Conservar repuesto').click(); fixture.detectChanges();
    expect(ventana.open).toBe(false);
    http.expectNone(r => r.method === 'DELETE');

    boton(root, 'Eliminar repuesto Cable').click(); fixture.detectChanges();
    const confirmar = boton(ventana, 'Confirmar eliminación');
    confirmar.click(); confirmar.click(); fixture.detectChanges();
    const req = http.expectOne(r => r.method === 'DELETE' && r.url === `${url}/3`);
    expect(confirmar.disabled).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();
    http.expectOne(url).flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(ventana.open).toBe(false);
    expect(root.textContent).toContain('Repuesto eliminado correctamente.');
    expect(root.textContent).toContain('No hay repuestos disponibles todavía.');
  });

  it('un error al eliminar se muestra dentro de la ventana y conserva la tabla', async () => {
    const { fixture, root } = await prepararAdmin();
    boton(root, 'Eliminar repuesto Cable').click(); fixture.detectChanges();
    const ventana = dialogo(root);
    boton(ventana, 'Confirmar eliminación').click();
    http.expectOne(r => r.method === 'DELETE').flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(ventana.open).toBe(true);
    expect(ventana.querySelector('[role="alert"]')?.textContent).toContain('conflicto');
    expect(root.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    http.expectNone(() => true);
  });

  it('si falla la recarga tras guardar, mantiene el éxito e informa la lectura', async () => {
    const { fixture } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrir']();
    pagina['datos'] = { id: null, nombre: 'Cable', descripcion: 'Cable', stock: 0 };
    const guardado = pagina['guardar']();
    http.expectOne(r => r.method === 'POST').flush({ id: 9, nombre: 'Cable', descripcion: 'Cable', stock: 0 });
    await Promise.resolve();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    await guardado;
    expect(pagina['formulario']()).toBe(false);
    expect(pagina['mensaje']()).toContain('guardado');
    expect(pagina['errorOperacion']()).toBe('');
    expect(pagina['error']()).not.toBe('');
  });

  it.each([
    { nombre: ' ', descripcion: 'Descripción', stock: 1 },
    { nombre: 'Repuesto', descripcion: ' ', stock: 1 },
    { nombre: 'Repuesto', descripcion: 'Descripción', stock: null },
    { nombre: 'Repuesto', descripcion: 'Descripción', stock: -1 },
    { nombre: 'Repuesto', descripcion: 'Descripción', stock: 1.5 },
  ])('rechaza un repuesto inválido: %j', async datos => {
    const { fixture } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrir']();
    pagina['datos'] = { id: null, ...datos };
    await pagina['guardar']();
    expect(pagina['errorOperacion']()).not.toBe('');
    http.expectNone(() => true);
  });

  it('Operador solo lee: sin acciones de escritura ni solicitudes', async () => {
    const { fixture, root } = await cargado();
    const textos = Array.from(root.querySelectorAll('button')).map(b => b.getAttribute('aria-label') ?? b.textContent?.trim());
    expect(textos.some(texto => /Nuevo|Editar|Eliminar/.test(texto ?? ''))).toBe(false);
    const pagina = fixture.componentInstance;
    pagina['abrir'](); pagina['solicitarEliminacion'](repuestos[0]);
    await pagina['guardar'](); await pagina['eliminar']();
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(dialogo(root).open).toBe(false);
    expect(root.querySelector('form')).toBeNull();
  });
});
