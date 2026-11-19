import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { BarraSuperior } from './layout/barra-superior/barra-superior';
import { ServicioAutenticacion } from './services/auth.service';

// En estas rutas no hay sesión útil que navegar: la barra estorbaría.
const RUTAS_SIN_BARRA = ['/', '/error-autenticacion'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BarraSuperior],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly autenticacion = inject(ServicioAutenticacion);

  private readonly rutaActual = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: '/' },
  );

  // Se recalcula con cada navegación; el login usa redirect, así que la cuenta no cambia entre ellas.
  protected readonly mostrarBarra = computed(
    () => !RUTAS_SIN_BARRA.includes(this.rutaActual()) && this.autenticacion.tieneCuentaActiva(),
  );
}
