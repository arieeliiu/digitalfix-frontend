import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type IconoBoton = 'actualizar' | 'crear';

// Botón solo con icono para acciones recurrentes: recargar datos (↻) y crear algo nuevo (+).
// La etiqueta va en aria-label y en un tooltip visible al pasar el mouse o enfocar con teclado.
@Component({
  selector: 'df-boton-icono',
  templateUrl: './boton-icono.html',
  styleUrl: './boton-icono.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonIcono {
  readonly icono = input.required<IconoBoton>();
  readonly etiqueta = input.required<string>();
  readonly deshabilitado = input(false);
  // Gira el icono de actualizar mientras se cargan los datos.
  readonly cargando = input(false);
  // Id del <button> interno; no se llama "id" para no duplicarlo en el host.
  readonly idBoton = input<string | null>(null);
  readonly accion = output<void>();
}
