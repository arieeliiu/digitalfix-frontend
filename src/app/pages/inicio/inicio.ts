import { Component, inject } from '@angular/core';
import { ServicioAutenticacion } from '../../services/auth.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
})
export class PaginaInicio {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  protected obtenerNombreUsuario(): string {
    const cuenta = this.autenticacion.obtenerCuentaActiva();

    return cuenta?.name ?? cuenta?.username ?? 'Usuario';
  }
}