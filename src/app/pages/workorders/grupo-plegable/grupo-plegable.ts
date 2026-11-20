import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

// Sección plegable con título y contador (p. ej. "Órdenes cerradas"). Plegada por defecto.
@Component({
  selector: 'app-grupo-plegable',
  templateUrl: './grupo-plegable.html',
  styleUrl: './grupo-plegable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.abierto]': 'abierto()' },
})
export class GrupoPlegable {
  readonly titulo = input.required<string>();
  readonly cantidad = input.required<number>();
  readonly idBoton = input.required<string>();

  protected readonly abierto = signal(false);

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
  }
}
