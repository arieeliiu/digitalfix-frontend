import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-administracion',
  imports: [RouterLink],
  template: `
    <section aria-labelledby="titulo-administracion">
      <h1 id="titulo-administracion">Administración de DigitalFix</h1>
      <p>Bienvenido al área de administración.</p>
      <a routerLink="/inicio">Volver al inicio</a>
    </section>
  `,
})
export class PaginaAdministracion {}