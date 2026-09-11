import { Injectable, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// Claims que utilizaremos desde el access token.
// El BFF será responsable de validarlos realmente.
interface ClaimsAutorizacion {
  aud?: string;
  scp?: string;
  roles?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ServicioAutenticacion {
  // Servicio de MSAL que administra cuentas, login, logout y tokens.
  private readonly servicioMsal = inject(MsalService);

  // Estado que pueden consultar las páginas de la aplicación.
  readonly mensajeError = signal('');
  readonly cargandoAutorizacion = signal(false);
  readonly audiencia = signal('');
  readonly permisos = signal<string[]>([]);
  readonly roles = signal<string[]>([]);

  // Devuelve la cuenta seleccionada durante el inicio de sesión.
  obtenerCuentaActiva() {
    return this.servicioMsal.instance.getActiveAccount();
  }

  // Indica si existe una cuenta activa en la aplicación.
  tieneCuentaActiva(): boolean {
    return this.obtenerCuentaActiva() !== null;
  }

  // Inicia sesión mediante una redirección a Microsoft Entra ID.
  iniciarSesion(): void {
    this.mensajeError.set('');

    this.servicioMsal
      .loginRedirect({
        // Solicita identidad básica y acceso delegado a DigitalFix API.
        scopes: ['openid', 'profile', environment.entra.scopeApi],

        // Después del login, MSAL regresará a la página protegida.
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

  // Cierra la sesión de la cuenta activa mediante una redirección.
  cerrarSesion(): void {
    this.mensajeError.set('');

    this.servicioMsal
      .logoutRedirect({
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

  // Obtiene los permisos y permite esperar hasta terminar la consulta.
  async cargarAutorizacion(): Promise<boolean> {
    // Elimina los datos anteriores para no reutilizarlos si la consulta falla.
    this.roles.set([]);
    this.permisos.set([]);
    this.audiencia.set('');
    this.mensajeError.set('');

    const cuenta = this.obtenerCuentaActiva();

    if (!cuenta) {
      this.mensajeError.set('No existe una cuenta activa.');
      return false;
    }

    this.cargandoAutorizacion.set(true);

    try {
      const resultado = await firstValueFrom(
        this.servicioMsal.acquireTokenSilent({
          account: cuenta,
          scopes: [environment.entra.scopeApi],
        }),
      );

      // Lee los claims para adaptar la interfaz; el BFF los validará.
      const claims = this.decodificarClaims(resultado.accessToken);

      if (this.mensajeError()) {
        return false;
      }

      // Comprueba la estructura antes de utilizar los datos recibidos.
      if (
        typeof claims.scp !== 'string' ||
        (claims.roles !== undefined &&
          (!Array.isArray(claims.roles) ||
            !claims.roles.every((rol) => typeof rol === 'string')))
      ) {
        this.mensajeError.set('Los permisos recibidos no tienen el formato esperado.');
        return false;
      }

      // Lee los claims para adaptar la interfaz; el BFF los validará.
      this.audiencia.set(claims.aud ?? '');
      this.permisos.set(claims.scp.split(' ').filter(Boolean));
      this.roles.set(claims.roles ?? []);

      return true;
    } catch {
      this.mensajeError.set(
        'No fue posible consultar tus permisos. Vuelve a iniciar sesión.',
      );
      return false;
    } finally {
      // Finaliza el indicador de carga tanto si funciona como si falla.
      this.cargandoAutorizacion.set(false);
    }
  }

  // Permite que las páginas adapten su interfaz según un rol.
  // Esto no reemplaza la autorización que implementará el BFF.
  tieneRol(rol: string): boolean {
    return this.roles().includes(rol);
  }

  // Lee el contenido del access token para mostrar sus claims.
  // Decodificar no significa validar: la validación corresponde al BFF.
  private decodificarClaims(token: string): ClaimsAutorizacion {
    try {
      const cargaUtil = token.split('.')[1];

      if (!cargaUtil) {
        throw new Error('El token no contiene una carga útil.');
      }

      // Los JWT utilizan Base64 URL, por eso reemplazamos estos caracteres.
      const base64 = cargaUtil.replace(/-/g, '+').replace(/_/g, '/');

      // Convierte el contenido codificado a texto UTF-8.
      const contenido = decodeURIComponent(
        atob(base64)
          .split('')
          .map(
            (caracter) =>
              `%${caracter.charCodeAt(0).toString(16).padStart(2, '0')}`,
          )
          .join(''),
      );

      return JSON.parse(contenido) as ClaimsAutorizacion;
    } catch {
      this.mensajeError.set(
        'No fue posible interpretar los permisos recibidos.',
      );

      return {};
    }
  }
}