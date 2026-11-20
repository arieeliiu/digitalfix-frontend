import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';

import { Cantidad } from './cantidad';

@Component({
  imports: [Cantidad, FormsModule],
  template: `<label for="cable">Cable</label>
    <df-cantidad idInput="cable" nombre="Cable" [max]="max" [(ngModel)]="valor" [disabled]="bloqueado" />`,
})
class Anfitrion {
  valor: number | null = 1;
  max = 2;
  bloqueado = false;
}

describe('Selector de cantidad', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Anfitrion] }));

  async function crear(cambios: Partial<Anfitrion> = {}) {
    const fixture = TestBed.createComponent(Anfitrion);
    Object.assign(fixture.componentInstance, cambios);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const [restar, sumar] = Array.from(root.querySelectorAll('button')) as HTMLButtonElement[];
    const campo = root.querySelector('#cable') as HTMLInputElement;
    return { fixture, root, restar, sumar, campo };
  }

  it('muestra el valor de ngModel y nombra los botones para lectores de pantalla', async () => {
    const { restar, sumar, campo } = await crear();
    expect(campo.value).toBe('1');
    expect(restar.getAttribute('aria-label')).toBe('Quitar una unidad de Cable');
    expect(sumar.getAttribute('aria-label')).toBe('Agregar una unidad de Cable');
  });

  it('− y + cambian el valor sin salirse de 0 y del máximo', async () => {
    const { fixture, restar, sumar, campo } = await crear();
    sumar.click(); fixture.detectChanges();
    expect(fixture.componentInstance.valor).toBe(2);
    expect(campo.value).toBe('2');
    expect(sumar.disabled).toBe(true);

    restar.click(); restar.click(); fixture.detectChanges();
    expect(fixture.componentInstance.valor).toBe(0);
    expect(restar.disabled).toBe(true);
  });

  it('acepta escritura directa y la entrega como número', async () => {
    const { fixture, campo } = await crear();
    campo.value = '2'; campo.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.valor).toBe(2);
    campo.value = ''; campo.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.valor).toBeNull();
  });

  it('se deshabilita completo cuando el control está deshabilitado', async () => {
    const { restar, sumar, campo } = await crear({ bloqueado: true });
    expect(campo.disabled).toBe(true);
    expect(restar.disabled).toBe(true);
    expect(sumar.disabled).toBe(true);
  });
});
