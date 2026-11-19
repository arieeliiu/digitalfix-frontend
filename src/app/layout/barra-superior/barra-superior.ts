import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

interface EnlaceNavegacion {
  ruta: string;
  etiqueta: string;
  // Vacío = cualquier usuario autenticado. Mantener igual a data.roles de app.routes.ts.
  roles: string[];
}

const ENLACES: EnlaceNavegacion[] = [
  { ruta: '/dashboard', etiqueta: 'Dashboard', roles: [] },
  { ruta: '/workorders', etiqueta: 'Órdenes de trabajo', roles: ['Admin', 'Operador', 'Cliente'] },
  { ruta: '/catalog', etiqueta: 'Catálogo', roles: ['Admin', 'Operador'] },
];

@Component({
  selector: 'app-barra-superior',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-superior.html',
  styleUrl: './barra-superior.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraSuperior {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  // Solo adapta la UI: la autorización real la hacen el guard y el BFF.
  protected readonly enlaces = computed(() => {
    const roles = this.autenticacion.roles();
    return ENLACES.filter((enlace) => enlace.roles.length === 0 || enlace.roles.some((rol) => roles.includes(rol)));
  });
}
