import { Component, inject } from '@angular/core';
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
}