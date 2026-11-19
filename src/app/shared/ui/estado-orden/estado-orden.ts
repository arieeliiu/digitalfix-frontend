import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EstadoOrden } from '../../../services/api.service';

const ETIQUETAS: Record<EstadoOrden, string> = {
  CREADA: 'Creada',
  ASIGNADA: 'Asignada',
  EN_DESPLAZAMIENTO: 'En desplazamiento',
  EN_EJECUCION: 'En ejecución',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

// Badge de estado: siempre con texto, el color solo refuerza.
@Component({
  selector: 'df-estado-orden',
  template: `<span [class]="'estado estado--' + clase()">{{ etiqueta() }}</span>`,
  styleUrl: './estado-orden.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoOrdenBadge {
  readonly estado = input.required<EstadoOrden>();
  protected readonly etiqueta = computed(() => ETIQUETAS[this.estado()]);
  protected readonly clase = computed(() => this.estado().toLowerCase().replaceAll('_', '-'));
}
