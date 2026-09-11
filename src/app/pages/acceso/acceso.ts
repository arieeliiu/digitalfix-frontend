import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

@Component({
  selector: 'app-acceso',
  imports: [RouterLink],
  templateUrl: './acceso.html',

  // Reutiliza temporalmente los estilos de la bienvenida original.
  styleUrl: '../../app.scss',
})
export class PaginaAcceso {
  protected readonly autenticacion = inject(ServicioAutenticacion);
}