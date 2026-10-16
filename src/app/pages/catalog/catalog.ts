import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioAutenticacion } from '../../services/auth.service';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicioApi, ServicioCatalogo, RepuestoCatalogo } from '../../services/api.service';
import { mensajeErrorApi } from '../../services/error-api';

@Component({
  selector: 'app-catalog', imports: [RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './catalog.html', styleUrl: './catalog.scss',
})
export class PaginaCatalog implements OnInit {
  private readonly api = inject(ServicioApi);
  private readonly auth = inject(ServicioAutenticacion);
  protected readonly esAdmin = computed(() => this.auth.tieneRol('Admin'));
  protected readonly formularioServicio = signal(false);
  protected readonly guardandoServicios = signal(false);
  protected readonly eliminandoServicios = signal(false);
  protected readonly pendienteServicio = signal<ServicioCatalogo | null>(null);
  protected readonly errorOperacionServicios = signal('');
  protected readonly mensajeServicios = signal('');
  protected readonly ocupadoServicios = computed(() => this.cargandoServicios() || this.guardandoServicios() || this.eliminandoServicios());
  protected datosServicio: { id: number | null; nombre: string; descripcion: string; tarifa: number | null } = {
    id: null, nombre: '', descripcion: '', tarifa: null,
  };
  protected readonly formularioRepuesto = signal(false);
  protected readonly guardandoRepuestos = signal(false);
  protected readonly eliminandoRepuestos = signal(false);
  protected readonly pendienteRepuesto = signal<RepuestoCatalogo | null>(null);
  protected readonly errorOperacionRepuestos = signal('');
  protected readonly mensajeRepuestos = signal('');
  protected readonly ocupadoRepuestos = computed(() => this.cargandoRepuestos() || this.guardandoRepuestos() || this.eliminandoRepuestos());
  protected datosRepuesto: { id: number | null; nombre: string; descripcion: string; stock: number | null } = {
    id: null, nombre: '', descripcion: '', stock: null,
  };
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly repuestos = signal<RepuestoCatalogo[]>([]);
  protected readonly cargandoServicios = signal(false);
  protected readonly cargandoRepuestos = signal(false);
  protected readonly cargando = computed(() => this.cargandoServicios() || this.cargandoRepuestos());
  protected readonly errorServicios = signal('');
  protected readonly errorRepuestos = signal('');
  ngOnInit(): void { void this.cargar(); }
  protected async cargar(): Promise<void> {
    await Promise.all([this.cargarServicios(), this.cargarRepuestos()]);
  }
  protected async cargarServicios(): Promise<void> {
    if (this.ocupadoServicios()) return;
    await this.recargarServicios();
  }
  private async recargarServicios(): Promise<void> {
    this.cargandoServicios.set(true); this.errorServicios.set(''); this.servicios.set([]);
    try { this.servicios.set(await firstValueFrom(this.api.listarServicios())); }
    catch (error) { this.errorServicios.set(mensajeErrorApi(error)); }
    finally { this.cargandoServicios.set(false); }
  }
  protected async cargarRepuestos(): Promise<void> {
    if (this.ocupadoRepuestos()) return;
    await this.recargarRepuestos();
  }
  private async recargarRepuestos(): Promise<void> {
    this.cargandoRepuestos.set(true); this.errorRepuestos.set(''); this.repuestos.set([]);
    try { this.repuestos.set(await firstValueFrom(this.api.listarRepuestos())); }
    catch (error) { this.errorRepuestos.set(mensajeErrorApi(error)); }
    finally { this.cargandoRepuestos.set(false); }
  }

  protected abrirServicio(actual?: ServicioCatalogo): void {
    if (!this.esAdmin() || this.ocupadoServicios()) return;
    this.datosServicio = {
      id: actual?.id ?? null, nombre: actual?.nombre ?? '',
      descripcion: actual?.descripcion ?? '', tarifa: actual?.tarifa ?? null,
    };
    this.pendienteServicio.set(null); this.errorOperacionServicios.set(''); this.mensajeServicios.set('');
    this.formularioServicio.set(true);
  }

  protected cancelarServicio(): void {
    if (this.ocupadoServicios()) return;
    this.resetearServicio(); this.errorOperacionServicios.set('');
  }

  private resetearServicio(): void {
    this.formularioServicio.set(false);
    this.datosServicio = { id: null, nombre: '', descripcion: '', tarifa: null };
  }

  protected async guardarServicio(): Promise<void> {
    if (!this.esAdmin() || this.ocupadoServicios() || !this.formularioServicio()) return;
    const { id, nombre, descripcion, tarifa: valor } = this.datosServicio;
    if (!nombre.trim() || valor === null || !Number.isFinite(valor) || valor < 0) {
      this.errorOperacionServicios.set('Ingresa un nombre y una tarifa numérica mayor o igual a 0.');
      return;
    }
    this.guardandoServicios.set(true); this.errorOperacionServicios.set(''); this.mensajeServicios.set('');
    try {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, tarifa: valor };
      await firstValueFrom(id === null ? this.api.crearServicio(datos) : this.api.actualizarServicio(id, datos));
      this.resetearServicio();
      this.mensajeServicios.set('Servicio guardado correctamente.');
      await this.recargarServicios();
    } catch (error) { this.errorOperacionServicios.set(mensajeErrorApi(error)); }
    finally { this.guardandoServicios.set(false); }
  }

  protected solicitarEliminarServicio(actual: ServicioCatalogo): void {
    if (!this.esAdmin() || this.ocupadoServicios()) return;
    this.resetearServicio(); this.errorOperacionServicios.set(''); this.mensajeServicios.set('');
    this.pendienteServicio.set(actual);
  }

  protected async eliminarServicio(): Promise<void> {
    const actual = this.pendienteServicio();
    if (!actual || !this.esAdmin() || this.ocupadoServicios()) return;
    this.eliminandoServicios.set(true); this.errorOperacionServicios.set(''); this.mensajeServicios.set('');
    try {
      await firstValueFrom(this.api.eliminarServicio(actual.id));
      this.pendienteServicio.set(null);
      this.mensajeServicios.set('Servicio eliminado correctamente.');
      await this.recargarServicios();
    } catch (error) { this.errorOperacionServicios.set(mensajeErrorApi(error)); }
    finally { this.eliminandoServicios.set(false); }
  }

  protected abrirRepuesto(actual?: RepuestoCatalogo): void {
    if (!this.esAdmin() || this.ocupadoRepuestos()) return;
    this.datosRepuesto = {
      id: actual?.id ?? null, nombre: actual?.nombre ?? '',
      descripcion: actual?.descripcion ?? '', stock: actual?.stock ?? null,
    };
    this.pendienteRepuesto.set(null); this.errorOperacionRepuestos.set(''); this.mensajeRepuestos.set('');
    this.formularioRepuesto.set(true);
  }

  protected cancelarRepuesto(): void {
    if (this.ocupadoRepuestos()) return;
    this.resetearRepuesto(); this.errorOperacionRepuestos.set('');
  }

  private resetearRepuesto(): void {
    this.formularioRepuesto.set(false);
    this.datosRepuesto = { id: null, nombre: '', descripcion: '', stock: null };
  }

  protected async guardarRepuesto(): Promise<void> {
    if (!this.esAdmin() || this.ocupadoRepuestos() || !this.formularioRepuesto()) return;
    const { id, nombre, descripcion, stock: valor } = this.datosRepuesto;
    if (!nombre.trim() || !descripcion.trim() || valor === null || !Number.isInteger(valor) || valor < 0) {
      this.errorOperacionRepuestos.set('Ingresa nombre, descripción y un stock entero mayor o igual a 0.');
      return;
    }
    this.guardandoRepuestos.set(true); this.errorOperacionRepuestos.set(''); this.mensajeRepuestos.set('');
    try {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim(), stock: valor };
      await firstValueFrom(id === null ? this.api.crearRepuesto(datos) : this.api.actualizarRepuesto(id, datos));
      this.resetearRepuesto();
      this.mensajeRepuestos.set('Repuesto guardado correctamente.');
      await this.recargarRepuestos();
    } catch (error) { this.errorOperacionRepuestos.set(mensajeErrorApi(error)); }
    finally { this.guardandoRepuestos.set(false); }
  }

  protected solicitarEliminarRepuesto(actual: RepuestoCatalogo): void {
    if (!this.esAdmin() || this.ocupadoRepuestos()) return;
    this.resetearRepuesto(); this.errorOperacionRepuestos.set(''); this.mensajeRepuestos.set('');
    this.pendienteRepuesto.set(actual);
  }

  protected async eliminarRepuesto(): Promise<void> {
    const actual = this.pendienteRepuesto();
    if (!actual || !this.esAdmin() || this.ocupadoRepuestos()) return;
    this.eliminandoRepuestos.set(true); this.errorOperacionRepuestos.set(''); this.mensajeRepuestos.set('');
    try {
      await firstValueFrom(this.api.eliminarRepuesto(actual.id));
      this.pendienteRepuesto.set(null);
      this.mensajeRepuestos.set('Repuesto eliminado correctamente.');
      await this.recargarRepuestos();
    } catch (error) { this.errorOperacionRepuestos.set(mensajeErrorApi(error)); }
    finally { this.eliminandoRepuestos.set(false); }
  }
}
