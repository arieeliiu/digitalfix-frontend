import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { EstadoOrden } from '../../../services/api.service';
import { ETIQUETAS_ESTADO } from '../../../shared/ui/estado-orden/estado-orden';

// Qué implica cada estado, para que quien gestiona sepa qué está eligiendo.
const DESCRIPCIONES: Record<EstadoOrden, string> = {
  CREADA: 'La orden espera asignación.',
  ASIGNADA: 'Asigna un técnico y los repuestos necesarios.',
  EN_DESPLAZAMIENTO: 'El técnico va en camino a la dirección.',
  EN_EJECUCION: 'El técnico está realizando el trabajo.',
  CERRADA: 'El trabajo terminó y la orden se cierra.',
  CANCELADA: 'Detiene la orden sin completarla.',
};

// Opciones de estado como tarjetas de radio: la elegida queda siempre a la vista,
// a diferencia de un <select>, que la esconde al volver a abrirlo.
@Component({
  selector: 'app-selector-estado',
  templateUrl: './selector-estado.html',
  styleUrl: './selector-estado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorEstado {
  readonly estados = input.required<EstadoOrden[]>();
  readonly deshabilitado = input(false);
  readonly valor = model<EstadoOrden | ''>('');

  protected readonly etiquetas = ETIQUETAS_ESTADO;
  protected readonly descripciones = DESCRIPCIONES;

  protected elegir(estado: EstadoOrden): void {
    this.valor.set(estado);
  }
}
