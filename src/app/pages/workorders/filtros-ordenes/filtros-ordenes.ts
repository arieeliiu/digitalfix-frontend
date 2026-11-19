import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EstadoOrden, ServicioCatalogo } from '../../../services/api.service';
import { ETIQUETAS_ESTADO } from '../../../shared/ui/estado-orden/estado-orden';

// Filtros de la lista de órdenes. Solo filtran lo ya cargado: no hacen llamadas a la API.
@Component({
  selector: 'app-filtros-ordenes',
  imports: [FormsModule],
  templateUrl: './filtros-ordenes.html',
  styleUrl: './filtros-ordenes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosOrdenes {
  readonly servicios = input.required<ServicioCatalogo[]>();
  readonly total = input.required<number>();
  readonly visibles = input.required<number>();
  readonly texto = model('');
  readonly estado = model<EstadoOrden | ''>('');
  readonly servicioId = model<number | null>(null);

  protected readonly estados = Object.entries(ETIQUETAS_ESTADO) as [EstadoOrden, string][];
  protected readonly activos = computed(
    () => this.texto().trim() !== '' || this.estado() !== '' || this.servicioId() !== null,
  );

  protected limpiar(): void {
    this.texto.set('');
    this.estado.set('');
    this.servicioId.set(null);
  }
}
