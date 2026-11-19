import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginaAcceso } from './acceso';
import { ServicioAutenticacion } from '../../services/auth.service';

describe('Página de acceso', () => {
  const mensajeError = signal('');
  let cuentaActiva: boolean;
  const auth = {
    mensajeError,
    tieneCuentaActiva: () => cuentaActiva,
    iniciarSesion: vi.fn(() => mensajeError.set('')),
    cerrarSesion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mensajeError.set('');
    cuentaActiva = false;
    TestBed.configureTestingModule({ imports: [PaginaAcceso], providers: [
      provideRouter([]), { provide: ServicioAutenticacion, useValue: auth },
    ] });
  });

  function crear() {
    const fixture = TestBed.createComponent(PaginaAcceso);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  function botonPorTexto(root: HTMLElement, texto: string): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll('button')).find(b => b.textContent?.trim() === texto);
  }

  it('sin sesión ofrece una sola acción: iniciar sesión con Microsoft', () => {
    const { root } = crear();

    expect(root.querySelector('h1')?.textContent).toContain('DigitalFix');
    expect(root.querySelector('#titulo-acceso')?.textContent).toContain('Inicia sesión');
    expect(root.querySelectorAll('button')).toHaveLength(1);
    expect(botonPorTexto(root, 'Iniciar sesión con Microsoft')).toBeDefined();
    expect(root.querySelector('a[href="/dashboard"]')).toBeNull();
  });

  it('al pulsar inicia el login y bloquea un segundo clic mientras redirige', () => {
    const { fixture, root } = crear();
    const boton = botonPorTexto(root, 'Iniciar sesión con Microsoft')!;

    boton.click();
    fixture.detectChanges();
    boton.click();

    expect(auth.iniciarSesion).toHaveBeenCalledOnce();
    expect(boton.disabled).toBe(true);
    expect(boton.textContent).toContain('Redirigiendo a Microsoft...');
  });

  it('si el login falla muestra el error y permite reintentar', () => {
    const { fixture, root } = crear();
    const boton = botonPorTexto(root, 'Iniciar sesión con Microsoft')!;
    boton.click();

    mensajeError.set('No fue posible iniciar sesión. Inténtalo nuevamente.');
    fixture.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No fue posible iniciar sesión');
    expect(boton.disabled).toBe(false);
    expect(boton.textContent?.trim()).toBe('Iniciar sesión con Microsoft');
  });

  it('con sesión activa ofrece ir al dashboard o cerrar sesión', () => {
    cuentaActiva = true;
    const { root } = crear();

    expect(root.querySelector('#titulo-acceso')?.textContent).toContain('Ya tienes una sesión activa');
    expect(root.querySelector('a[href="/dashboard"]')?.textContent?.trim()).toBe('Ir al dashboard');
    botonPorTexto(root, 'Cerrar sesión')!.click();
    expect(auth.cerrarSesion).toHaveBeenCalledOnce();
    expect(botonPorTexto(root, 'Iniciar sesión con Microsoft')).toBeUndefined();
  });
});
