import { Injectable, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Injectable({
  providedIn: 'root',
})
export class ServicioAutenticacion {
  private readonly servicioMsal = inject(MsalService);

  // Mensaje que mostraremos si falla una operación.
  readonly mensajeError = signal('');

  // Devuelve la cuenta seleccionada al procesar el inicio de sesión.
  obtenerCuentaActiva() {
    return this.servicioMsal.instance.getActiveAccount();
  }

  // Indica si tenemos una cuenta activa en la aplicación.
  tieneCuentaActiva(): boolean {
    return this.obtenerCuentaActiva() !== null;
  }

  iniciarSesion(): void {
    this.mensajeError.set('');

    this.servicioMsal
      .loginRedirect({
        // Solicita identidad básica, sin acceso al BFF todavía.
        scopes: ['openid', 'profile'],

        // Página a la que volveremos después del inicio de sesión.
        redirectStartPage: `${window.location.origin}/inicio`,
      })
      .subscribe({
        error: () => {
          this.mensajeError.set(
            'No fue posible iniciar sesión. Inténtalo nuevamente.',
          );
        },
      });
  }

  cerrarSesion(): void {
    this.mensajeError.set('');

    this.servicioMsal
      .logoutRedirect({
        // Cierra la sesión correspondiente a la cuenta activa.
        account: this.obtenerCuentaActiva(),
      })
      .subscribe({
        error: () => {
          this.mensajeError.set(
            'No fue posible cerrar sesión. Inténtalo nuevamente.',
          );
        },
      });
  }
}