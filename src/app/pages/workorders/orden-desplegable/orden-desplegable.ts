import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { OrdenTrabajo } from '../../../services/api.service';
import { EstadoOrdenBadge } from '../../../shared/ui/estado-orden/estado-orden';

// Orden de la lista: una fila con servicio, fecha y estado que se despliega con el resto del detalle.
// Las acciones llegan por ng-content porque sus permisos y su lógica viven en la página.
@Component({
  selector: 'app-orden-desplegable',
  imports: [DatePipe, EstadoOrdenBadge],
  templateUrl: './orden-desplegable.html',
  styleUrl: './orden-desplegable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.abierta]': 'abierta()' },
})
export class OrdenDesplegable {
  readonly orden = input.required<OrdenTrabajo>();
  readonly nombreServicio = input.required<string>();
  readonly abierta = input(false);
  readonly alternar = output<void>();

  // El DTO no trae el nombre del técnico: se muestra su correo y, si falta, su identificador.
  protected readonly tecnico = computed(() => this.orden().emailTecnico || this.orden().tecnicoId || '');

  protected readonly unidadesRepuestos = computed(() =>
    (this.orden().repuestos ?? []).reduce((total, repuesto) => total + repuesto.cantidad, 0),
  );
}
