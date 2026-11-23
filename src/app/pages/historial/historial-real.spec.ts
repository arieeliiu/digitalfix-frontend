import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { PaginaHistorial } from './historial';
import { environment } from '../../../environments/environment';

// Optativa: renderiza Angular y consulta BFF → Audit reales con identidad local de prueba.
const variables = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
describe.skipIf(!variables['HISTORIAL_REAL_URL'])('Historial contra backend local real', () => {
  const anterior = environment.apiGatewayUrl;
  afterEach(() => { environment.apiGatewayUrl = anterior; });
  it('representa eventos persistidos y vuelve a consultar el BFF', async () => {
    environment.apiGatewayUrl = variables['HISTORIAL_REAL_URL']!;
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withFetch(), withInterceptors([(request, next) => next(request.clone({
        setHeaders: { Authorization: `Bearer ${variables['HISTORIAL_REAL_TOKEN']}` },
      }))])),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ orden: variables['HISTORIAL_REAL_ORDEN'] ?? '1' })) } },
    ] });
    const fixture = TestBed.createComponent(PaginaHistorial);
    fixture.detectChanges();
    await expect.poll(() => { fixture.detectChanges(); return fixture.nativeElement.querySelectorAll('.timeline li').length; }, { timeout: 15000 }).toBeGreaterThanOrEqual(2);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Cambio de estado');
    expect(root.textContent).toContain('Datos actualizados');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await expect.poll(() => { fixture.detectChanges(); return root.querySelector('input')!.disabled; }).toBe(false);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
