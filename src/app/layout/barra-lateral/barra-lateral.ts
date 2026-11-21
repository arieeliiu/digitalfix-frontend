import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

type IconoEnlace = 'dashboard' | 'ordenes' | 'servicios' | 'repuestos';

interface EnlaceNavegacion {
  ruta: string;
  etiqueta: string;
  icono: IconoEnlace;
  // Vacío = cualquier usuario autenticado. Mantener igual a data.roles de app.routes.ts.
  roles: string[];
}

const ENLACES: EnlaceNavegacion[] = [
  { ruta: '/dashboard', etiqueta: 'Dashboard', icono: 'dashboard', roles: [] },
  { ruta: '/workorders', etiqueta: 'Órdenes de trabajo', icono: 'ordenes', roles: ['Admin', 'Operador', 'Cliente'] },
  { ruta: '/catalog/servicios', etiqueta: 'Servicios', icono: 'servicios', roles: ['Admin', 'Operador'] },
  { ruta: '/catalog/repuestos', etiqueta: 'Repuestos', icono: 'repuestos', roles: ['Admin', 'Operador'] },
];

@Component({
  selector: 'app-barra-lateral',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  templateUrl: './barra-lateral.html',
  styleUrl: './barra-lateral.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrarMenu()' },
})
export class BarraLateral {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  // Solo aplica en pantallas angostas, donde la barra se abre como panel sobre el contenido.
  protected readonly menuAbierto = signal(false);

  // Solo adapta la UI: la autorización real la hacen el guard y el BFF.
  protected readonly enlaces = computed(() => {
    const roles = this.autenticacion.roles();
    return ENLACES.filter((enlace) => enlace.roles.length === 0 || enlace.roles.some((rol) => roles.includes(rol)));
  });

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
