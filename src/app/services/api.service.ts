import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RespuestaAcceso { mensaje: string; }
export interface ServicioCatalogo { id: number; nombre: string; descripcion: string | null; tarifa: number; }
export interface NuevaOrden { servicioId: number; descripcion: string; direccion: string; }
export interface OrdenTrabajo extends NuevaOrden {
  id: number; solicitanteId: string; estado: string; fechaCreacion: string;
}
@Injectable({ providedIn: 'root' })
export class ServicioApi {
  private readonly http = inject(HttpClient);
  estaConfigurada(): boolean {
    try { this.baseUrl(); return true; } catch { return false; }
  }
  consultarPerfil(): Observable<RespuestaAcceso> {
    return defer(() => this.http.get<RespuestaAcceso>(`${this.baseUrl()}/api/perfil`));
  }
  listarServicios(): Observable<ServicioCatalogo[]> {
    return defer(() => this.http.get<ServicioCatalogo[]>(`${this.baseUrl()}/api/catalog/services`));
  }
  listarOrdenes(): Observable<OrdenTrabajo[]> {
    return defer(() => this.http.get<OrdenTrabajo[]>(`${this.baseUrl()}/api/workorders`));
  }
  consultarOrden(id: number): Observable<OrdenTrabajo> {
    return defer(() => this.http.get<OrdenTrabajo>(`${this.baseUrl()}/api/workorders/${id}`));
  }
  crearOrden(orden: NuevaOrden): Observable<OrdenTrabajo> {
    // La identidad se obtiene en el BFF del JWT; no se envía desde el formulario.
    const { servicioId, descripcion, direccion } = orden;
    return defer(() => this.http.post<OrdenTrabajo>(`${this.baseUrl()}/api/workorders`, { servicioId, descripcion, direccion }));
  }
  private baseUrl(): string {
    const baseUrl = environment.apiGatewayUrl.trim().replace(/\/+$/, '');
    if (!baseUrl || baseUrl.includes('<')) throw new Error('Falta configurar apiGatewayUrl.');
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password) {
      throw new Error('apiGatewayUrl debe ser HTTPS sin parámetros ni credenciales.');
    }
    return baseUrl;
  }
}
