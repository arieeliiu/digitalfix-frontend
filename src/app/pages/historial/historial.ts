import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServicioApi, EventoHistorial } from '../../services/api.service';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, FormsModule],
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaHistorial {
  private readonly api = inject(ServicioApi);
  private readonly destroy = inject(DestroyRef);
  protected ordenId: number | null = null;
  protected readonly eventos = signal<EventoHistorial[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly consultada = signal<number | null>(null);

  constructor() {
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const valor = params.get('orden');
      if (valor !== null) {
        this.ordenId = Number(valor);
        this.consultar();
      }
    });
  }

  protected consultar(): void {
    if (this.cargando()) return;
    this.eventos.set([]);
    this.consultada.set(null);
    this.error.set('');
    const id = this.ordenId;
    if (id === null || !Number.isSafeInteger(id) || id < 1) {
      this.error.set('Ingresa un número de orden válido.');
      return;
    }
    this.cargando.set(true);
    // Audit es eventual: Actualizar vuelve a consultar, sin inventar eventos tras una edición.
    this.api.consultarHistorial(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: eventos => {
        this.eventos.set(eventos);
        this.consultada.set(id);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        this.error.set(status === 403 ? 'Tu cuenta no tiene permiso para consultar el historial.'
          : status === 401 ? 'Tu sesión no pudo validarse. Vuelve a iniciar sesión.'
          : 'No se pudo cargar el historial. Intenta actualizar nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  protected etiqueta(tipo: string): string {
    const nombres: Record<string, string> = {
      ORDEN_CREADA: 'Orden creada', ORDEN_ESTADO_CAMBIADO: 'Cambio de estado',
      ORDEN_ELIMINADA: 'Orden eliminada', ORDEN_DATOS_ACTUALIZADOS: 'Datos actualizados',
      ORDEN_CONTACTOS_ACTUALIZADOS: 'Contactos actualizados', ORDEN_REPUESTOS_ACTUALIZADOS: 'Repuestos actualizados',
    };
    return nombres[tipo] ?? tipo;
  }
}
