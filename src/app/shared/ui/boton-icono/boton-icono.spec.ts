import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { BotonIcono, IconoBoton } from './boton-icono';

@Component({
  imports: [BotonIcono],
  template: `<df-boton-icono [icono]="icono()" [etiqueta]="etiqueta()" [deshabilitado]="deshabilitado()"
    [cargando]="cargando()" idBoton="mi-boton" (accion)="pulsaciones = pulsaciones + 1" />`,
})
class Anfitrion {
  readonly icono = signal<IconoBoton>('crear');
  readonly etiqueta = signal('Nueva orden');
  readonly deshabilitado = signal(false);
  readonly cargando = signal(false);
  pulsaciones = 0;
}

describe('Botón de icono', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Anfitrion] }));

  function crear() {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    const boton = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, boton };
  }

  it('expone la etiqueta como nombre accesible y tooltip, sin texto visible', () => {
    const { boton } = crear();

    expect(boton.getAttribute('aria-label')).toBe('Nueva orden');
    expect(boton.dataset['etiqueta']).toBe('Nueva orden');
    expect(boton.textContent?.trim()).toBe('');
    expect(boton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('pone el id en el botón interno y no en el host', () => {
    const { fixture, boton } = crear();
    const root = fixture.nativeElement as HTMLElement;

    expect(boton.id).toBe('mi-boton');
    expect(root.querySelectorAll('#mi-boton')).toHaveLength(1);
  });

  it('emite la acción al hacer clic y no lo hace si está deshabilitado', () => {
    const { fixture, boton } = crear();
    boton.click();
    expect(fixture.componentInstance.pulsaciones).toBe(1);

    fixture.componentInstance.deshabilitado.set(true);
    fixture.detectChanges();
    boton.click();
    expect(boton.disabled).toBe(true);
    expect(fixture.componentInstance.pulsaciones).toBe(1);
  });

  it('distingue visualmente crear y actualizar, y marca la carga', () => {
    const { fixture, boton } = crear();
    expect(boton.classList).toContain('boton--crear');

    fixture.componentInstance.icono.set('actualizar');
    fixture.componentInstance.cargando.set(true);
    fixture.detectChanges();

    expect(boton.classList).toContain('boton--actualizar');
    expect(boton.classList).toContain('boton--cargando');
    expect(boton.getAttribute('aria-busy')).toBe('true');
  });

  it('el icono de eliminar usa su propia variante discreta', () => {
    const { fixture, boton } = crear();
    fixture.componentInstance.icono.set('eliminar');
    fixture.detectChanges();
    expect(boton.classList).toContain('boton--eliminar');
    expect(boton.classList).not.toContain('boton--crear');
    expect(boton.querySelector('svg')).not.toBeNull();
  });
});
