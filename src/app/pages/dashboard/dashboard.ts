import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';
import { ServicioApi } from '../../services/api.service';


// ── Componente ───────
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})

export class PaginaDashboard implements OnInit {
  protected readonly autenticacion = inject(ServicioAutenticacion);
  private readonly api = inject(ServicioApi);
  protected readonly estadoConexion = signal('');
  protected readonly errorConexion = signal('');

  async ngOnInit(): Promise<void> {
    const autorizado = await this.autenticacion.cargarAutorizacion();
    if (!autorizado || !this.api.estaConfigurada()) return;

    this.estadoConexion.set('Conectando con DigitalFix...');
    try {
      await firstValueFrom(this.api.consultarPerfil());
      this.estadoConexion.set('Conexión con DigitalFix verificada.');
    } catch (error) {
      this.estadoConexion.set('');
      const status = error instanceof HttpErrorResponse ? error.status : undefined;
      this.errorConexion.set(status === 401
        ? 'No se pudo validar tu sesión. Vuelve a iniciar sesión.'
        : status === 403
          ? 'Tu cuenta no tiene permiso para acceder a DigitalFix.'
          : 'No fue posible conectar con DigitalFix. Inténtalo nuevamente más tarde.');
    }
  }
}
