import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { PaginaWorkOrders } from './workorders';
import { ServicioAutenticacion } from '../../services/auth.service';
import { ServicioApi } from '../../services/api.service';
import { environment } from '../../../environments/environment';

const variables = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
describe.skipIf(!variables['FLUJO_REAL_CLIENTE_TOKEN'])('Formulario Angular con servicios reales', () => {
  const anterior = environment.apiGatewayUrl;
  afterEach(() => { environment.apiGatewayUrl = anterior; });
  it('crea desde el formulario, asigna mediante HTTP y consulta el evento persistido', async () => {
    environment.apiGatewayUrl = variables['HISTORIAL_REAL_URL']!;
    const roles = signal(['Cliente']);
    const token = () => variables[roles().includes('Admin') ? 'FLUJO_REAL_ADMIN_TOKEN' : 'FLUJO_REAL_CLIENTE_TOKEN'];
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      provideHttpClient(withFetch(), withInterceptors([(request, next) => next(request.clone({ setHeaders: { Authorization: `Bearer ${token()}` } }))])),
      // Identidad local para adaptar la vista; los servicios validan el JWT firmado.
      { provide: ServicioAutenticacion, useValue: {
        tieneRol: (rol: string) => roles().includes(rol),
        obtenerCuentaActiva: () => ({ idTokenClaims: { oid: 'cliente-real-local' } }),
      } },
    ] });
    HTMLDialogElement.prototype.showModal ??= function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close ??= function () { this.removeAttribute('open'); };
    const fixture = TestBed.createComponent(PaginaWorkOrders);
    const root: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    await expect.poll(() => { fixture.detectChanges(); return (root.querySelector('#abrir-nueva-orden') as HTMLButtonElement | null)?.disabled; }, { timeout: 15000 }).toBe(false);
    (root.querySelector('#abrir-nueva-orden') as HTMLButtonElement).click();
    await fixture.whenStable(); fixture.detectChanges();
    const select = root.querySelector('#servicio') as HTMLSelectElement;
    select.selectedIndex = 1; select.dispatchEvent(new Event('change'));
    const descripcion = `Orden Angular real ${Date.now()}`;
    for (const [id, valor] of [['descripcion', descripcion], ['direccion', 'Local de pruebas'], ['email-contacto', 'angular@example.invalid']]) {
      const input = root.querySelector(`#${id}`) as HTMLInputElement;
      input.value = valor; input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable(); fixture.detectChanges();
    root.querySelector('dialog.modal-formulario form')!.dispatchEvent(new Event('submit'));
    await expect.poll(() => { fixture.detectChanges(); return (root.querySelector('dialog.modal-formulario') as HTMLDialogElement).open; }, { timeout: 15000 }).toBe(false);
    const api = TestBed.inject(ServicioApi);
    const orden = (await firstValueFrom(api.listarOrdenes())).find(o => o.descripcion === descripcion);
    expect(orden?.solicitanteId).toBe('cliente-real-local');
    roles.set(['Admin']);
    await firstValueFrom(api.cambiarEstadoOrden(orden!.id, { status: 'ASIGNADA', tecnicoId: 'tecnico-angular', emailTecnico: 'tecnico@example.invalid', repuestos: [] }));
    await expect.poll(async () => (await firstValueFrom(api.consultarHistorial(orden!.id))).length, { timeout: 15000 }).toBe(2);
    const historial = await firstValueFrom(api.consultarHistorial(orden!.id));
    expect(historial.map(e => e.tipo)).toEqual(['ORDEN_CREADA', 'ORDEN_ESTADO_CAMBIADO']);
    expect(historial.map(e => e.actorId)).toEqual(['cliente-real-local', 'admin-real-local']);
  }, 45000);
});
