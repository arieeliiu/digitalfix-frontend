import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PaginaCatalog } from './catalog';
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

  beforeEach(() => {
    environment.apiGatewayUrl = baseUrl;
    TestBed.configureTestingModule({ imports: [PaginaCatalog], providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
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
});
