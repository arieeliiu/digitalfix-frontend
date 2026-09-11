import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acceso-denegado',
  imports: [RouterLink],
  template: `
    <section aria-labelledby="titulo-acceso-denegado">
      <h1 id="titulo-acceso-denegado">Acceso denegado</h1>
      <p>Tu cuenta no tiene permisos para acceder a esta sección.</p>
      <a routerLink="/inicio">Volver al inicio</a>
    </section>
  `,
})
export class PaginaAccesoDenegado {}