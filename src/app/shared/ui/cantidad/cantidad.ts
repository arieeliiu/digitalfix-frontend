import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// Selector de cantidad entera con botones − y + a los lados del número.
// Funciona con ngModel (ControlValueAccessor), así que el formulario y su validación no cambian.
@Component({
  selector: 'df-cantidad',
  templateUrl: './cantidad.html',
  styleUrl: './cantidad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Cantidad), multi: true }],
})
export class Cantidad implements ControlValueAccessor {
  // Id del <input> interno, para que un <label for> externo lo nombre.
  readonly idInput = input.required<string>();
  // Qué se está contando, para los nombres accesibles de − y + ("Quitar una unidad de Cable").
  readonly nombre = input.required<string>();
  readonly min = input(0);
  readonly max = input<number | null>(null);
  readonly describedBy = input<string | null>(null);

  protected readonly valor = signal<number | null>(0);
  protected readonly deshabilitado = signal(false);

  protected readonly puedeRestar = computed(() => {
    const valor = this.valor();
    return !this.deshabilitado() && valor !== null && valor > this.min();
  });
  protected readonly puedeSumar = computed(() => {
    const valor = this.valor() ?? this.min();
    const max = this.max();
    return !this.deshabilitado() && (max === null || valor < max);
  });

  private alCambiar: (valor: number | null) => void = () => {};
  private alTocar: () => void = () => {};

  writeValue(valor: number | null): void {
    this.valor.set(valor);
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  protected ajustar(paso: number): void {
    const max = this.max();
    let siguiente = (this.valor() ?? this.min()) + paso;
    siguiente = Math.max(this.min(), max === null ? siguiente : Math.min(max, siguiente));
    this.emitir(siguiente);
  }

  // Escritura directa: se respeta lo tecleado; la página valida enteros y rango al guardar.
  protected escribir(texto: string): void {
    this.emitir(texto.trim() === '' ? null : Number(texto));
  }

  protected tocar(): void {
    this.alTocar();
  }

  private emitir(valor: number | null): void {
    this.valor.set(valor);
    this.alCambiar(valor);
    this.alTocar();
  }
}
