import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RespuestaAcceso {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ServicioApi {
  private readonly http = inject(HttpClient);

  estaConfigurada(): boolean {
    return environment.apiGatewayUrl.trim().length > 0;
  }

  consultarPerfil(): Observable<RespuestaAcceso> {
    const baseUrl = environment.apiGatewayUrl.trim().replace(/\/+$/, '');
    if (!baseUrl) {
      return throwError(() => new Error('Falta configurar apiGatewayUrl.'));
    }
    // MsalInterceptor obtiene y adjunta el access token de DigitalFix API.
    return this.http.get<RespuestaAcceso>(`${baseUrl}/api/perfil`);
  }
}
