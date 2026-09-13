import { Component, inject, OnInit} from '@angular/core';
import { ServicioAutenticacion } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  imports: [RouterLink],
})
export class PaginaInicio implements OnInit {
  ngOnInit(): void {
  this.autenticacion.cargarAutorizacion();
}
  protected readonly autenticacion = inject(ServicioAutenticacion);

  protected obtenerNombreUsuario(): string {
    const cuenta = this.autenticacion.obtenerCuentaActiva();

    return cuenta?.name ?? cuenta?.username ?? 'Usuario';
  }
}