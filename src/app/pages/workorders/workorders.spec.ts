import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaginaWorkOrders } from './workorders';
import { ServicioApi } from '../../services/api.service';
import { ServicioAutenticacion } from '../../services/auth.service';

describe('Formulario de órdenes reales', () => {
  const orden = { id: 42, servicioId: 1, descripcion: 'Revisión', direccion: 'Calle 123', estado: 'CREADA', fechaCreacion: '2026-09-15T00:00:00Z', solicitanteId: 'cliente' };
  const api = {
    listarServicios: vi.fn(() => of([{ id: 1, nombre: 'Mantención', descripcion: '', tarifa: 25000 }])),
    listarOrdenes: vi.fn(() => of([])),
    crearOrden: vi.fn(() => of(orden)),
    consultarOrden: vi.fn(() => of(orden)),
  };
  const auth = { tieneRol: vi.fn(() => false) };
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
