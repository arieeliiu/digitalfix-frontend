import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EstadoOrdenBadge } from './estado-orden';
import { EstadoOrden } from '../../../services/api.service';

describe('Badge de estado de orden', () => {
  it.each<[EstadoOrden, string, string]>([
    ['CREADA', 'Creada', 'estado--creada'],
    ['ASIGNADA', 'Asignada', 'estado--asignada'],
    ['EN_DESPLAZAMIENTO', 'En desplazamiento', 'estado--en-desplazamiento'],
    ['EN_EJECUCION', 'En ejecución', 'estado--en-ejecucion'],
    ['CERRADA', 'Cerrada', 'estado--cerrada'],
    ['CANCELADA', 'Cancelada', 'estado--cancelada'],
  ])('muestra %s con etiqueta legible y su color', (estado, etiqueta, clase) => {
    const fixture = TestBed.createComponent(EstadoOrdenBadge);
    fixture.componentRef.setInput('estado', estado);
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('span')!;

    expect(badge.textContent?.trim()).toBe(etiqueta);
    expect(badge.classList).toContain(clase);
  });
});
