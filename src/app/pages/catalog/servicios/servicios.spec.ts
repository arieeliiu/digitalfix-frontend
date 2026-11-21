import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PaginaServicios } from './servicios';
import { ServicioAutenticacion } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

// jsdom no implementa completamente la API nativa de <dialog>.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function () { this.removeAttribute('open'); };
});

describe('Catálogo de servicios', () => {
  const originalUrl = environment.apiGatewayUrl;
  const baseUrl = 'https://digitalfix.example.test/dev';
  const url = `${baseUrl}/api/catalog/services`;
  const servicios = [
    { id: 1, nombre: 'Mantención', descripcion: 'Revisión técnica', tarifa: 25000 },
    { id: 2, nombre: 'Instalación', descripcion: null, tarifa: 40000 },
  ];
  let http: HttpTestingController;
  let rol: string;

  beforeEach(() => {
    environment.apiGatewayUrl = baseUrl;
    rol = 'Operador';
    TestBed.configureTestingModule({ imports: [PaginaServicios], providers: [
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
    const fixture = TestBed.createComponent(PaginaServicios);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const consulta = http.expectOne(url);
    expect(consulta.request.method).toBe('GET');
    // Esta página no consulta repuestos.
    http.expectNone(`${baseUrl}/api/catalog/spare-parts`);
    return { fixture, root, consulta };
  }

  async function cargado(datos: object[] = servicios) {
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
    return root.querySelector('dialog[aria-labelledby="eliminar-servicio"]') as HTMLDialogElement;
  }

  it('muestra carga y luego servicios, tarifa en CLP y descripción', async () => {
    const { fixture, root, consulta } = preparar();
    expect(root.textContent).toContain('Cargando servicios');
    expect(boton(root, 'Actualizar').disabled).toBe(true);
    consulta.flush(servicios);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toContain('Servicios técnicos');
    const filas = root.querySelectorAll('tbody tr');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Revisión técnica');
    expect(filas[0].querySelector('.celda-precio')?.textContent).toMatch(/CLP\s*25[.,]000/);
    expect(filas[1].textContent).toContain('Sin descripción');
    expect(boton(root, 'Actualizar').disabled).toBe(false);
  });

  it('muestra la lista vacía sin confundirla con un error', async () => {
    const { root } = await cargado([]);
    expect(root.textContent).toContain('No hay servicios disponibles todavía.');
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('table')).toBeNull();
  });

  it('un error de carga se informa sin botón propio y se reintenta con Actualizar', async () => {
    const { fixture, root, consulta } = preparar();
    consulta.flush({}, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable(); fixture.detectChanges();
    const alerta = root.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('No se pudieron cargar los servicios');
    expect(alerta?.textContent).toContain('No se pudo completar la operación en el catálogo. Inténtalo nuevamente.');
    expect(alerta?.querySelector('button')).toBeNull();
    expect(root.textContent).not.toContain('No hay servicios disponibles');
    boton(root, 'Actualizar').click(); fixture.detectChanges();
    http.expectOne(url).flush(servicios);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it.each(['crear', 'editar'])('Admin puede %s un servicio y refresca desde el backend', async operacion => {
    const { fixture, root } = await prepararAdmin();
    const editando = operacion === 'editar';
    boton(root, editando ? 'Editar servicio Mantención' : 'Nuevo servicio').click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const form = root.querySelector('form[aria-labelledby="form-servicio"]')!;
    expect(form).not.toBeNull();
    if (editando) {
      expect((root.querySelector('#servicio-nombre') as HTMLInputElement).value).toBe('Mantención');
      expect((root.querySelector('#servicio-tarifa') as HTMLInputElement).value).toBe('25000');
    }
    ingresar(root, 'servicio-nombre', ' Nuevo nombre ');
    ingresar(root, 'servicio-descripcion', '   ');
    ingresar(root, 'servicio-tarifa', '12500.75');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(boton(root, 'Guardando...').disabled).toBe(true);
    const req = http.expectOne(r => r.method === (editando ? 'PUT' : 'POST') && r.url === `${url}${editando ? '/1' : ''}`);
    expect(req.request.body).toEqual({ nombre: 'Nuevo nombre', descripcion: null, tarifa: 12500.75 });
    req.flush({ id: 1, ...req.request.body });
    await Promise.resolve();
    http.expectOne(url).flush([{ id: 1, nombre: 'Respuesta del servidor', descripcion: null, tarifa: 17000 }]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('form')).toBeNull();
    expect(root.textContent).toContain('Respuesta del servidor');
    expect(root.textContent).toContain('Servicio guardado correctamente.');
  });

  it('eliminar abre una ventana emergente, Conservar la cierra y Confirmar envía un solo DELETE', async () => {
    const { fixture, root } = await prepararAdmin();
    const ventana = dialogo(root);
    expect(ventana.open).toBe(false);

    boton(root, 'Eliminar servicio Mantención').click(); fixture.detectChanges();
    expect(ventana.open).toBe(true);
    expect(ventana.textContent).toContain('¿Eliminar el servicio Mantención?');
    expect(ventana.textContent).toContain('Esta acción no se puede deshacer.');
    http.expectNone(r => r.method === 'DELETE');

    boton(ventana, 'Conservar servicio').click(); fixture.detectChanges();
    expect(ventana.open).toBe(false);
    http.expectNone(r => r.method === 'DELETE');

    boton(root, 'Eliminar servicio Mantención').click(); fixture.detectChanges();
    const confirmar = boton(ventana, 'Confirmar eliminación');
    confirmar.click(); confirmar.click(); fixture.detectChanges();
    const req = http.expectOne(r => r.method === 'DELETE' && r.url === `${url}/1`);
    expect(confirmar.disabled).toBe(true);
    expect(boton(ventana, 'Conservar servicio').disabled).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();
    http.expectOne(url).flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(ventana.open).toBe(false);
    expect(root.textContent).toContain('Servicio eliminado correctamente.');
    expect(root.textContent).toContain('No hay servicios disponibles todavía.');
  });

  it('Escape cierra la confirmación sin eliminar', async () => {
    const { fixture, root } = await prepararAdmin();
    boton(root, 'Eliminar servicio Mantención').click(); fixture.detectChanges();
    const ventana = dialogo(root);
    const evento = new Event('cancel', { cancelable: true });
    ventana.dispatchEvent(evento); fixture.detectChanges();
    expect(evento.defaultPrevented).toBe(true);
    expect(ventana.open).toBe(false);
    http.expectNone(r => r.method === 'DELETE');
  });

  it('un error al eliminar se muestra dentro de la ventana y conserva la tabla', async () => {
    const { fixture, root } = await prepararAdmin();
    boton(root, 'Eliminar servicio Mantención').click(); fixture.detectChanges();
    const ventana = dialogo(root);
    boton(ventana, 'Confirmar eliminación').click();
    http.expectOne(r => r.method === 'DELETE').flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(ventana.open).toBe(true);
    expect(ventana.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudo completar la operación porque existe un conflicto con el estado actual del catálogo.');
    // El mismo error no se repite fuera de la ventana.
    expect(root.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    http.expectNone(() => true);
  });

  it.each(['crear', 'editar'])('error al %s conserva los datos del formulario y no refresca', async operacion => {
    const { fixture, root } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrir'](operacion === 'editar' ? servicios[0] : undefined);
    pagina['datos'] = { id: operacion === 'editar' ? 1 : null, nombre: 'Conservar datos', descripcion: '', tarifa: 12500.75 };
    void pagina['guardar']();
    http.expectOne(r => r.method !== 'GET').flush({}, { status: operacion === 'editar' ? 404 : 400, statusText: 'Error' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(operacion === 'editar'
      ? 'No se encontró el elemento del catálogo solicitado.' : 'Revisa los datos ingresados en el catálogo.');
    expect(pagina['formulario']()).toBe(true);
    expect(pagina['datos'].nombre).toBe('Conservar datos');
    http.expectNone(() => true);
  });

  it.each([
    { nombre: ' ', tarifa: 1 }, { nombre: 'Servicio', tarifa: -1 },
    { nombre: 'Servicio', tarifa: null }, { nombre: 'Servicio', tarifa: NaN },
    { nombre: 'Servicio', tarifa: Infinity },
  ])('rechaza un servicio inválido: %j', async datos => {
    const { fixture } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrir']();
    pagina['datos'] = { id: null, descripcion: '', ...datos };
    await pagina['guardar']();
    expect(pagina['errorOperacion']()).not.toBe('');
    http.expectNone(() => true);
  });

  it('Operador solo lee: sin acciones de escritura ni solicitudes', async () => {
    const { fixture, root } = await cargado();
    const textos = Array.from(root.querySelectorAll('button')).map(b => b.getAttribute('aria-label') ?? b.textContent?.trim());
    expect(textos.some(texto => /Nuevo|Editar|Eliminar/.test(texto ?? ''))).toBe(false);
    const pagina = fixture.componentInstance;
    pagina['abrir'](); pagina['solicitarEliminacion'](servicios[0]);
    await pagina['guardar'](); await pagina['eliminar']();
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(dialogo(root).open).toBe(false);
    expect(root.querySelector('form')).toBeNull();
  });
});
