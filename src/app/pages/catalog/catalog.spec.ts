import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PaginaCatalog } from './catalog';
import { ServicioAutenticacion } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

describe('Catálogo de lectura', () => {
  const originalUrl = environment.apiGatewayUrl;
  const baseUrl = 'https://digitalfix.example.test/dev';
  const servicios = [{ id: 1, nombre: 'Mantención', descripcion: 'Revisión técnica', tarifa: 25000 }];
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
    TestBed.configureTestingModule({ imports: [PaginaCatalog], providers: [
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
    const fixture = TestBed.createComponent(PaginaCatalog);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const consultaServicios = http.expectOne(`${baseUrl}/api/catalog/services`);
    const consultaRepuestos = http.expectOne(`${baseUrl}/api/catalog/spare-parts`);
    expect(consultaServicios.request.method).toBe('GET');
    expect(consultaRepuestos.request.method).toBe('GET');
    return { fixture, root, consultaServicios, consultaRepuestos };
  }

  it('muestra carga y luego servicios, CLP, descripciones y stock reales de la respuesta', async () => {
    const { fixture, root, consultaServicios, consultaRepuestos } = preparar();
    expect(root.textContent).toContain('Cargando servicios');
    expect(root.textContent).toContain('Cargando repuestos');
    expect(root.querySelector('button')?.disabled).toBe(true);
    consultaServicios.flush(servicios); consultaRepuestos.flush(repuestos);
    await fixture.whenStable(); fixture.detectChanges();
    const seccionServicios = root.querySelector('[aria-labelledby="titulo-servicios"]')!;
    const seccionRepuestos = root.querySelector('[aria-labelledby="titulo-repuestos"]')!;
    expect(seccionServicios.textContent).toContain('Mantención');
    expect(seccionServicios.textContent).toContain('Revisión técnica');
    expect(seccionServicios.querySelector('.celda-precio')?.textContent).toMatch(/CLP\s*25[.,]000/);
    expect(seccionRepuestos.textContent).toContain('Cable eléctrico');
    const filas = seccionRepuestos.querySelectorAll('tbody tr');
    expect(filas[0].textContent).toContain('10 unidades');
    expect(filas[1].textContent).toContain('Sin stock');
    expect(filas[1].textContent).toContain('Sin descripción');
    expect(filas[2].textContent).toContain('1 unidad');
    expect(filas[2].textContent).toContain('Sin descripción');
    expect(root.querySelector('button')?.disabled).toBe(false);
  });

  it('muestra listas vacías sin confundirlas con errores', async () => {
    const { fixture, root, consultaServicios, consultaRepuestos } = preparar();
    consultaServicios.flush([]); consultaRepuestos.flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.textContent).toContain('No hay servicios disponibles todavía.');
    expect(root.textContent).toContain('No hay repuestos disponibles todavía.');
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('table')).toBeNull();
  });

  it.each(['servicios', 'repuestos'])('el error de %s no rompe la otra sección y permite reintentar solo esa consulta', async seccion => {
    const { fixture, root, consultaServicios, consultaRepuestos } = preparar();
    const fallaServicios = seccion === 'servicios';
    const fallida = fallaServicios ? consultaServicios : consultaRepuestos;
    const correcta = fallaServicios ? consultaRepuestos : consultaServicios;
    fallida.flush({}, { status: 503, statusText: 'Service Unavailable' });
    correcta.flush(fallaServicios ? repuestos : servicios);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(`No se pudieron cargar los ${seccion}`);
    expect(root.textContent).toContain(fallaServicios ? 'Cable' : 'Mantención');
    expect(root.textContent).not.toContain(`No hay ${seccion} disponibles`);
    const reintentar = Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === `Reintentar ${seccion}`)!;
    reintentar.click(); fixture.detectChanges();
    const ruta = fallaServicios ? 'services' : 'spare-parts';
    http.expectOne(`${baseUrl}/api/catalog/${ruta}`).flush(fallaServicios ? servicios : repuestos);
    http.expectNone(`${baseUrl}/api/catalog/${fallaServicios ? 'spare-parts' : 'services'}`);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelectorAll('table')).toHaveLength(2);
  });

  it('actualiza ambas consultas y reemplaza el stock con la respuesta del servidor', async () => {
    const { fixture, root, consultaServicios, consultaRepuestos } = preparar();
    consultaServicios.flush(servicios); consultaRepuestos.flush(repuestos);
    await fixture.whenStable(); fixture.detectChanges();
    root.querySelector('button')!.click(); fixture.detectChanges();
    http.expectOne(`${baseUrl}/api/catalog/services`).flush([{ ...servicios[0], descripcion: null }]);
    http.expectOne(`${baseUrl}/api/catalog/spare-parts`).flush([{ ...repuestos[0], stock: 0 }]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[aria-labelledby="titulo-servicios"]')?.textContent).toContain('Sin descripción');
    const seccion = root.querySelector('[aria-labelledby="titulo-repuestos"]')!;
    expect(seccion.textContent).toContain('Sin stock');
    expect(seccion.textContent).not.toContain('10 unidades');
    expect(seccion.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  async function prepararAdmin() {
    rol = 'Admin';
    const entorno = preparar();
    entorno.consultaServicios.flush(servicios); entorno.consultaRepuestos.flush(repuestos);
    await entorno.fixture.whenStable(); entorno.fixture.detectChanges();
    return entorno;
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

  it.each(['crear', 'editar'])('Admin puede %s servicio y refresca desde el backend', async operacion => {
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
    const req = http.expectOne(r => r.method === (editando ? 'PUT' : 'POST') && r.url === `${baseUrl}/api/catalog/services${editando ? '/1' : ''}`);
    expect(req.request.body).toEqual({ nombre: 'Nuevo nombre', descripcion: null, tarifa: 12500.75 });
    req.flush({ id: 1, ...req.request.body });
    await Promise.resolve();
    http.expectOne(`${baseUrl}/api/catalog/services`).flush([
      { id: 1, nombre: 'Respuesta del servidor', descripcion: null, tarifa: 17000 },
    ]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('form[aria-labelledby="form-servicio"]')).toBeNull();
    expect(root.querySelector('[aria-labelledby="titulo-servicios"]')?.textContent).toContain('Respuesta del servidor');
    expect(root.textContent).not.toContain('Nuevo nombre');
  });

  it('eliminar servicio exige confirmación y evita doble DELETE', async () => {
    const { fixture, root } = await prepararAdmin();
    boton(root, 'Eliminar servicio Mantención').click(); fixture.detectChanges();
    http.expectNone(r => r.method === 'DELETE');
    boton(root, 'Conservar servicio').click(); fixture.detectChanges();
    http.expectNone(r => r.method === 'DELETE');
    boton(root, 'Eliminar servicio Mantención').click(); fixture.detectChanges();
    const confirmar = root.querySelector('[aria-labelledby="eliminar-servicio"] button') as HTMLButtonElement;
    confirmar.click(); confirmar.click(); fixture.detectChanges();
    const req = http.expectOne(r => r.method === 'DELETE' && r.url === `${baseUrl}/api/catalog/services/1`);
    expect(confirmar.disabled).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();
    http.expectOne(`${baseUrl}/api/catalog/services`).flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[aria-labelledby="eliminar-servicio"]')).toBeNull();
    expect(root.textContent).toContain('No hay servicios disponibles todavía.');
  });

  it.each(['crear', 'editar', 'eliminar'])('error al %s servicio conserva datos y no refresca como si hubiera funcionado', async operacion => {
    const { fixture, root } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    if (operacion === 'eliminar') {
      pagina['solicitarEliminarServicio'](servicios[0]);
      void pagina['eliminarServicio']();
    } else {
      pagina['abrirServicio'](operacion === 'editar' ? servicios[0] : undefined);
      pagina['datosServicio'] = { id: operacion === 'editar' ? 1 : null, nombre: 'Conservar datos', descripcion: 'Descripción', tarifa: 12500.75 };
      void pagina['guardarServicio']();
    }
    const req = http.expectOne(r => r.method !== 'GET');
    req.flush({}, { status: operacion === 'eliminar' ? 409 : operacion === 'editar' ? 404 : 400, statusText: 'Error' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(pagina['errorOperacionServicios']()).not.toBe('');
    expect(root.querySelector('[aria-labelledby="titulo-servicios"] [role="alert"]')).not.toBeNull();
    expect(pagina['servicios']()).toHaveLength(1);
    if (operacion !== 'eliminar') {
      expect(pagina['formularioServicio']()).toBe(true);
      expect(pagina['datosServicio'].nombre).toBe('Conservar datos');
      expect(pagina['datosServicio'].tarifa).toBe(12500.75);
    } else {
      expect(pagina['pendienteServicio']()?.id).toBe(1);
    }
    http.expectNone(() => true);
    expect(root.querySelector('[aria-labelledby="titulo-repuestos"] table')).not.toBeNull();
  });

  it.each(['crear', 'editar'])('Admin puede %s repuesto y refresca desde el backend', async operacion => {
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
    const req = http.expectOne(r => r.method === (editando ? 'PUT' : 'POST') && r.url === `${baseUrl}/api/catalog/spare-parts${editando ? '/3' : ''}`);
    expect(req.request.body).toEqual({ nombre: 'Nuevo nombre', descripcion: 'Descripción nueva', stock: 0 });
    req.flush({ id: 3, ...req.request.body });
    await Promise.resolve();
    http.expectOne(`${baseUrl}/api/catalog/spare-parts`).flush([
      { id: 3, nombre: 'Respuesta del servidor', descripcion: null, stock: 4 },
    ]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('form[aria-labelledby="form-repuesto"]')).toBeNull();
    expect(root.querySelector('[aria-labelledby="titulo-repuestos"]')?.textContent).toContain('Respuesta del servidor');
    expect(root.textContent).not.toContain('Nuevo nombre');
    expect(root.querySelector('[aria-labelledby="titulo-repuestos"]')?.textContent).toContain('4 unidades');
  });

  it('eliminar repuesto exige confirmación y evita doble DELETE', async () => {
    const { fixture, root } = await prepararAdmin();
    boton(root, 'Eliminar repuesto Cable').click(); fixture.detectChanges();
    http.expectNone(r => r.method === 'DELETE');
    boton(root, 'Conservar repuesto').click(); fixture.detectChanges();
    http.expectNone(r => r.method === 'DELETE');
    boton(root, 'Eliminar repuesto Cable').click(); fixture.detectChanges();
    const confirmar = root.querySelector('[aria-labelledby="eliminar-repuesto"] button') as HTMLButtonElement;
    confirmar.click(); confirmar.click(); fixture.detectChanges();
    const req = http.expectOne(r => r.method === 'DELETE' && r.url === `${baseUrl}/api/catalog/spare-parts/3`);
    expect(confirmar.disabled).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();
    http.expectOne(`${baseUrl}/api/catalog/spare-parts`).flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[aria-labelledby="eliminar-repuesto"]')).toBeNull();
    expect(root.textContent).toContain('No hay repuestos disponibles todavía.');
  });

  it.each(['crear', 'editar', 'eliminar'])('error al %s repuesto conserva datos y no refresca como si hubiera funcionado', async operacion => {
    const { fixture, root } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    if (operacion === 'eliminar') {
      pagina['solicitarEliminarRepuesto'](repuestos[0]);
      void pagina['eliminarRepuesto']();
    } else {
      pagina['abrirRepuesto'](operacion === 'editar' ? repuestos[0] : undefined);
      pagina['datosRepuesto'] = { id: operacion === 'editar' ? 3 : null, nombre: 'Conservar datos', descripcion: 'Descripción', stock: 0 };
      void pagina['guardarRepuesto']();
    }
    const req = http.expectOne(r => r.method !== 'GET');
    req.flush({}, { status: operacion === 'eliminar' ? 409 : operacion === 'editar' ? 404 : 400, statusText: 'Error' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(pagina['errorOperacionRepuestos']()).not.toBe('');
    expect(root.querySelector('[aria-labelledby="titulo-repuestos"] [role="alert"]')).not.toBeNull();
    expect(pagina['repuestos']()).toHaveLength(3);
    if (operacion !== 'eliminar') {
      expect(pagina['formularioRepuesto']()).toBe(true);
      expect(pagina['datosRepuesto'].nombre).toBe('Conservar datos');
      expect(pagina['datosRepuesto'].stock).toBe(0);
    } else {
      expect(pagina['pendienteRepuesto']()?.id).toBe(3);
    }
    http.expectNone(() => true);
    expect(root.querySelector('[aria-labelledby="titulo-servicios"] table')).not.toBeNull();
  });

  it.each([
    { nombre: ' ', tarifa: 1 }, { nombre: 'Servicio', tarifa: -1 },
    { nombre: 'Servicio', tarifa: null }, { nombre: 'Servicio', tarifa: NaN },
    { nombre: 'Servicio', tarifa: Infinity },
  ])('rechaza servicio inválido: %j', async datos => {
    const { fixture } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrirServicio']();
    pagina['datosServicio'] = { id: null, descripcion: '', ...datos };
    await pagina['guardarServicio']();
    expect(pagina['errorOperacionServicios']()).not.toBe('');
    http.expectNone(() => true);
  });

  it.each([
    { nombre: ' ', descripcion: 'Descripción', stock: 1 },
    { nombre: 'Repuesto', descripcion: ' ', stock: 1 },
    { nombre: 'Repuesto', descripcion: 'Descripción', stock: null },
    { nombre: 'Repuesto', descripcion: 'Descripción', stock: -1 },
    { nombre: 'Repuesto', descripcion: 'Descripción', stock: 1.5 },
  ])('rechaza repuesto inválido: %j', async datos => {
    const { fixture } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrirRepuesto']();
    pagina['datosRepuesto'] = { id: null, ...datos };
    await pagina['guardarRepuesto']();
    expect(pagina['errorOperacionRepuestos']()).not.toBe('');
    http.expectNone(() => true);
  });

  it('Operador lee ambas secciones sin acciones ni solicitudes de escritura', async () => {
    const { fixture, root, consultaServicios, consultaRepuestos } = preparar();
    consultaServicios.flush(servicios); consultaRepuestos.flush(repuestos);
    await fixture.whenStable(); fixture.detectChanges();
    const textos = Array.from(root.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(textos.some(texto => /Nuevo|Editar|Eliminar/.test(texto ?? ''))).toBe(false);
    const pagina = fixture.componentInstance;
    pagina['abrirServicio'](); pagina['abrirRepuesto']();
    pagina['solicitarEliminarServicio'](servicios[0]); pagina['solicitarEliminarRepuesto'](repuestos[0]);
    await pagina['guardarServicio'](); await pagina['guardarRepuesto']();
    await pagina['eliminarServicio'](); await pagina['eliminarRepuesto']();
    http.expectNone(() => true);
    expect(root.querySelectorAll('table')).toHaveLength(2);
    expect(root.querySelector('form')).toBeNull();
  });

  it('una escritura de servicios permite operar repuestos y refrescar solo la sección disponible', async () => {
    const { fixture, root } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrirServicio']();
    pagina['datosServicio'] = { id: null, nombre: 'Servicio', descripcion: '', tarifa: 0 };
    const guardado = pagina['guardarServicio']();
    const escritura = http.expectOne(r => r.method === 'POST');
    fixture.detectChanges();
    expect(boton(root, 'Nuevo repuesto').disabled).toBe(false);
    expect(boton(root, 'Actualizar').disabled).toBe(false);
    boton(root, 'Actualizar').click();
    http.expectNone(`${baseUrl}/api/catalog/services`);
    http.expectOne(`${baseUrl}/api/catalog/spare-parts`).flush(repuestos);
    escritura.flush({ id: 2, nombre: 'Servicio', descripcion: null, tarifa: 0 });
    await Promise.resolve();
    http.expectOne(`${baseUrl}/api/catalog/services`).flush(servicios);
    await guardado;
    await fixture.whenStable(); fixture.detectChanges();
    expect(pagina['errorOperacionServicios']()).toBe('');
  });

  it('si falla la recarga tras guardar, mantiene el éxito y permite reintentar la lectura', async () => {
    const { fixture } = await prepararAdmin();
    const pagina = fixture.componentInstance;
    pagina['abrirRepuesto']();
    pagina['datosRepuesto'] = { id: null, nombre: 'Cable', descripcion: 'Cable', stock: 0 };
    const guardado = pagina['guardarRepuesto']();
    http.expectOne(r => r.method === 'POST').flush({ id: 8, nombre: 'Cable', descripcion: 'Cable', stock: 0 });
    await Promise.resolve();
    http.expectOne(`${baseUrl}/api/catalog/spare-parts`).flush({}, { status: 500, statusText: 'Error' });
    await guardado;
    expect(pagina['formularioRepuesto']()).toBe(false);
    expect(pagina['mensajeRepuestos']()).toContain('guardado');
    expect(pagina['errorOperacionRepuestos']()).toBe('');
    expect(pagina['errorRepuestos']()).not.toBe('');
  });

});
