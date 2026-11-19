import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarraSuperior } from './barra-superior';
import { ServicioAutenticacion } from '../../services/auth.service';

@Component({ template: '<p>Página</p>' })
class PaginaPrueba {}

describe('Barra superior', () => {
  const roles = signal<string[]>([]);
  const cerrarSesion = vi.fn();

  beforeEach(() => {
    roles.set([]);
    cerrarSesion.mockReset();
    TestBed.configureTestingModule({
      imports: [BarraSuperior],
      providers: [
        provideRouter([
          { path: 'dashboard', component: PaginaPrueba },
          { path: 'workorders', component: PaginaPrueba },
          { path: 'catalog', component: PaginaPrueba },
        ]),
        {
          provide: ServicioAutenticacion,
          useValue: {
            roles,
            obtenerNombreUsuario: () => 'Ana Pérez',
            etiquetaRol: () => 'Operador',
            cerrarSesion,
          },
        },
      ],
    });
  });

  function crear() {
    const fixture = TestBed.createComponent(BarraSuperior);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  function etiquetasEnlaces(root: HTMLElement): string[] {
    return Array.from(root.querySelectorAll('nav a')).map((a) => a.textContent?.trim() ?? '');
  }

  it.each([
    ['Admin', ['Dashboard', 'Órdenes de trabajo', 'Catálogo']],
    ['Operador', ['Dashboard', 'Órdenes de trabajo', 'Catálogo']],
    ['Cliente', ['Dashboard', 'Órdenes de trabajo']],
    ['Auditor', ['Dashboard']],
  ])('muestra al rol %s solo los módulos a los que puede entrar', (rol, esperados) => {
    roles.set([rol]);
    const { root } = crear();

    expect(etiquetasEnlaces(root)).toEqual(esperados);
  });

  it('actualiza los enlaces cuando se cargan los roles después de crearse', () => {
    const { fixture, root } = crear();
    expect(etiquetasEnlaces(root)).toEqual(['Dashboard']);

    roles.set(['Operador']);
    fixture.detectChanges();

    expect(etiquetasEnlaces(root)).toContain('Catálogo');
  });

  it('marca la página actual con aria-current', async () => {
    roles.set(['Admin']);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/catalog');
    const { fixture, root } = crear();
    await fixture.whenStable();
    fixture.detectChanges();

    const actual = root.querySelector('nav a[aria-current="page"]');
    expect(actual?.textContent?.trim()).toBe('Catálogo');
  });

  it('muestra el usuario y su rol, y permite cerrar sesión', () => {
    const { root } = crear();

    expect(root.textContent).toContain('Ana Pérez');
    expect(root.textContent).toContain('Operador');

    const boton = Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cerrar sesión',
    );
    boton!.click();
    expect(cerrarSesion).toHaveBeenCalledOnce();
  });
});
