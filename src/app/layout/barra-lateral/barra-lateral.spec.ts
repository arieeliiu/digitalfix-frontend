import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarraLateral } from './barra-lateral';
import { ServicioAutenticacion } from '../../services/auth.service';

@Component({ template: '<p>Página</p>' })
class PaginaPrueba {}

describe('Barra lateral', () => {
  const roles = signal<string[]>([]);
  const cerrarSesion = vi.fn();

  beforeEach(() => {
    roles.set([]);
    cerrarSesion.mockReset();
    TestBed.configureTestingModule({
      imports: [BarraLateral],
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
    const fixture = TestBed.createComponent(BarraLateral);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  function etiquetasEnlaces(root: HTMLElement): string[] {
    return Array.from(root.querySelectorAll('nav a')).map((a) => a.textContent?.trim() ?? '');
  }

  function botonMenu(root: HTMLElement): HTMLButtonElement {
    return root.querySelector('button[aria-controls="menu-lateral"]') as HTMLButtonElement;
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

  it('cada enlace lleva un icono decorativo oculto a lectores de pantalla', () => {
    roles.set(['Admin']);
    const { root } = crear();

    for (const enlace of Array.from(root.querySelectorAll('nav a'))) {
      expect(enlace.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    }
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

    expect(root.querySelector('.usuario')?.textContent).toContain('Ana Pérez');
    expect(root.querySelector('.usuario')?.textContent).toContain('Operador');

    const boton = Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cerrar sesión',
    );
    boton!.click();
    expect(cerrarSesion).toHaveBeenCalledOnce();
  });

  it('el botón de menú abre y cierra el panel e informa su estado', () => {
    const { fixture, root } = crear();
    const boton = botonMenu(root);
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(boton.getAttribute('aria-label')).toBe('Abrir menú');

    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-label')).toBe('Cerrar menú');
    expect(root.querySelector('#menu-lateral')?.classList).toContain('lateral--abierta');

    boton.click();
    fixture.detectChanges();
    expect(root.querySelector('#menu-lateral')?.classList).not.toContain('lateral--abierta');
  });

  it('el menú abierto se cierra con Escape, con el fondo o al elegir un enlace', () => {
    roles.set(['Admin']);
    const { fixture, root } = crear();
    const abierto = () => botonMenu(root).getAttribute('aria-expanded') === 'true';

    botonMenu(root).click(); fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(abierto()).toBe(false);

    botonMenu(root).click(); fixture.detectChanges();
    (root.querySelector('.fondo') as HTMLElement).click();
    fixture.detectChanges();
    expect(abierto()).toBe(false);

    botonMenu(root).click(); fixture.detectChanges();
    (root.querySelector('nav a') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(abierto()).toBe(false);
  });
});
