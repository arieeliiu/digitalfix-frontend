import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ServicioAutenticacion } from '../../services/auth.service';
import { EstadoOrden, OrdenTrabajo, RepuestoCatalogo, ServicioApi, ServicioCatalogo } from '../../services/api.service';
import { mensajeErrorApi } from '../../services/error-api';
import { mensajeErrorCatalogo } from '../../services/error-catalogo';
import { BotonIcono } from '../../shared/ui/boton-icono/boton-icono';
import { EstadoOrdenBadge } from '../../shared/ui/estado-orden/estado-orden';

const EN_TERRENO: EstadoOrden[] = ['EN_DESPLAZAMIENTO', 'EN_EJECUCION'];
const FINALES: EstadoOrden[] = ['CERRADA', 'CANCELADA'];
// Las listas del dashboard son un resumen: el detalle completo está en Órdenes de trabajo.
const MAXIMO_FILAS = 8;

const porFecha = (a: OrdenTrabajo, b: OrdenTrabajo) => a.fechaCreacion.localeCompare(b.fechaCreacion);

// ── Componente ───────
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, NgTemplateOutlet, RouterLink, BotonIcono, EstadoOrdenBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class PaginaDashboard implements OnInit {
  protected readonly autenticacion = inject(ServicioAutenticacion);
  private readonly api = inject(ServicioApi);
  protected readonly estadoConexion = signal('');
  protected readonly errorConexion = signal('');

  // Los roles solo deciden qué resumen mostrar; el BFF filtra qué órdenes recibe cada uno.
  protected readonly esAdmin = computed(() => this.autenticacion.roles().includes('Admin'));
  protected readonly esOperador = computed(() => this.autenticacion.roles().includes('Operador'));
  protected readonly esCliente = computed(() => this.autenticacion.roles().includes('Cliente'));
  protected readonly veOrdenes = computed(() => this.esAdmin() || this.esOperador() || this.esCliente());
  protected readonly sinRol = computed(() => !this.veOrdenes() && !this.autenticacion.roles().includes('Auditor'));

  protected readonly ordenes = signal<OrdenTrabajo[]>([]);
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly repuestos = signal<RepuestoCatalogo[]>([]);
  protected readonly cargandoOrdenes = signal(false);
  protected readonly errorOrdenes = signal('');
  protected readonly cargandoRepuestos = signal(false);
  protected readonly errorRepuestos = signal('');
  protected readonly cargando = computed(() => this.cargandoOrdenes() || this.cargandoRepuestos());

  protected readonly kpis = computed(() => {
    const ordenes = this.ordenes();
    const contar = (estados: EstadoOrden[]) => ordenes.filter((o) => estados.includes(o.estado)).length;
    return {
      activas: ordenes.filter((o) => !FINALES.includes(o.estado)).length,
      porAsignar: contar(['CREADA']),
      enTerreno: contar(EN_TERRENO),
      cerradas: contar(['CERRADA']),
    };
  });
  protected readonly repuestosSinStock = computed(() => this.repuestos().filter((r) => r.stock <= 0));

  // Por asignar: primero las que llevan más tiempo esperando.
  protected readonly porAsignar = computed(() =>
    this.ordenes().filter((o) => o.estado === 'CREADA').sort(porFecha));
  protected readonly enTerreno = computed(() =>
    this.ordenes().filter((o) => EN_TERRENO.includes(o.estado)).sort(porFecha));
  protected readonly ultimas = computed(() =>
    [...this.ordenes()].sort((a, b) => porFecha(b, a)));
  protected readonly maximoFilas = MAXIMO_FILAS;

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
      return;
    }
    await this.cargar();
  }

  protected async cargar(): Promise<void> {
    if (this.cargando()) return;
    await Promise.all([
      this.veOrdenes() ? this.cargarOrdenes() : Promise.resolve(),
      this.esAdmin() ? this.cargarRepuestos() : Promise.resolve(),
    ]);
  }

  protected async cargarOrdenes(): Promise<void> {
    if (this.cargandoOrdenes()) return;
    this.cargandoOrdenes.set(true); this.errorOrdenes.set('');
    try {
      const [ordenes, servicios] = await Promise.all([
        firstValueFrom(this.api.listarOrdenes()), firstValueFrom(this.api.listarServicios()),
      ]);
      this.ordenes.set(ordenes); this.servicios.set(servicios);
    } catch (error) { this.errorOrdenes.set(mensajeErrorApi(error)); }
    finally { this.cargandoOrdenes.set(false); }
  }

  protected async cargarRepuestos(): Promise<void> {
    if (this.cargandoRepuestos()) return;
    this.cargandoRepuestos.set(true); this.errorRepuestos.set('');
    try { this.repuestos.set(await firstValueFrom(this.api.listarRepuestos())); }
    catch (error) { this.errorRepuestos.set(mensajeErrorCatalogo(error)); }
    finally { this.cargandoRepuestos.set(false); }
  }

  protected nombreServicio(id: number): string {
    return this.servicios().find((s) => s.id === id)?.nombre ?? `Servicio #${id}`;
  }
}
