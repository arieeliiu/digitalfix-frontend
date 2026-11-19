import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

@Component({
  selector: 'app-acceso',
  imports: [RouterLink],
  templateUrl: './acceso.html',
  styleUrl: './acceso.scss',
})
export class PaginaAcceso {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  private readonly pulsado = signal(false);
  // Evita dobles clics mientras MSAL redirige; si el login falla, el botón vuelve a habilitarse.
  protected readonly redirigiendo = computed(() => this.pulsado() && !this.autenticacion.mensajeError());

  protected iniciarSesion(): void {
    if (this.redirigiendo()) return;
    this.pulsado.set(true);
    this.autenticacion.iniciarSesion();
  }
}
