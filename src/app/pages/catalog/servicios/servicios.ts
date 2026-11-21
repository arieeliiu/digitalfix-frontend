import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ServicioApi, ServicioCatalogo } from '../../../services/api.service';
import { ServicioAutenticacion } from '../../../services/auth.service';
import { mensajeErrorCatalogo } from '../../../services/error-catalogo';
import { BotonIcono } from '../../../shared/ui/boton-icono/boton-icono';

// Catálogo de servicios técnicos. Admin lo edita; Operador solo lo lee.
@Component({
  selector: 'app-servicios',
  imports: [CurrencyPipe, FormsModule, BotonIcono],
  templateUrl: './servicios.html',
  styleUrl: './servicios.scss',
})
export class PaginaServicios implements OnInit {
  private readonly api = inject(ServicioApi);
  private readonly auth = inject(ServicioAutenticacion);
  @ViewChild('modalFormulario') private modalFormulario?: ElementRef<HTMLDialogElement>;
  @ViewChild('modalEliminacion') private modalEliminacion?: ElementRef<HTMLDialogElement>;

  protected readonly esAdmin = computed(() => this.auth.tieneRol('Admin'));
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly ocupado = computed(() => this.cargando() || this.guardando() || this.eliminando());
  protected readonly error = signal('');
  protected readonly errorOperacion = signal('');
  protected readonly mensaje = signal('');
  protected readonly formulario = signal(false);
  protected readonly pendienteEliminar = signal<ServicioCatalogo | null>(null);
  protected datos: { id: number | null; nombre: string; descripcion: string; tarifa: number | null } = {
    id: null, nombre: '', descripcion: '', tarifa: null,
  };

  ngOnInit(): void { void this.cargar(); }

  protected async cargar(): Promise<void> {
    if (this.ocupado()) return;
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    this.cargando.set(true); this.error.set(''); this.servicios.set([]);
    try { this.servicios.set(await firstValueFrom(this.api.listarServicios())); }
    catch (error) { this.error.set(mensajeErrorCatalogo(error)); }
    finally { this.cargando.set(false); }
  }

  protected abrir(actual?: ServicioCatalogo): void {
    if (!this.esAdmin() || this.ocupado()) return;
    this.datos = {
      id: actual?.id ?? null, nombre: actual?.nombre ?? '',
      descripcion: actual?.descripcion ?? '', tarifa: actual?.tarifa ?? null,
    };
    this.errorOperacion.set(''); this.mensaje.set('');
    this.formulario.set(true);
    // El formulario se abre como ventana emergente, igual que el de una orden.
    const dialogo = this.modalFormulario?.nativeElement;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }

  protected cancelar(): void {
    if (this.ocupado()) return;
    this.resetear(); this.errorOperacion.set('');
  }

  // Escape equivale a "Cancelar", salvo mientras se guarda.
  protected alCancelarFormulario(evento: Event): void {
    evento.preventDefault();
    this.cancelar();
  }

  private resetear(): void {
    this.formulario.set(false);
    const dialogo = this.modalFormulario?.nativeElement;
    if (dialogo?.open) dialogo.close();
    this.datos = { id: null, nombre: '', descripcion: '', tarifa: null };
  }

  protected async guardar(): Promise<void> {
    if (!this.esAdmin() || this.ocupado() || !this.formulario()) return;
    const { id, nombre, descripcion, tarifa: valor } = this.datos;
    if (!nombre.trim() || valor === null || !Number.isFinite(valor) || valor < 0) {
      this.errorOperacion.set('Ingresa un nombre y una tarifa numérica mayor o igual a 0.');
      return;
    }
    this.guardando.set(true); this.errorOperacion.set(''); this.mensaje.set('');
    try {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, tarifa: valor };
      await firstValueFrom(id === null ? this.api.crearServicio(datos) : this.api.actualizarServicio(id, datos));
      this.resetear();
      this.mensaje.set('Servicio guardado correctamente.');
      await this.recargar();
    } catch (error) { this.errorOperacion.set(mensajeErrorCatalogo(error)); }
    finally { this.guardando.set(false); }
  }

  // La confirmación es una ventana emergente: queda sobre la tabla en vez de desplazarla.
  protected solicitarEliminacion(actual: ServicioCatalogo): void {
    if (!this.esAdmin() || this.ocupado()) return;
    this.resetear(); this.errorOperacion.set(''); this.mensaje.set('');
    this.pendienteEliminar.set(actual);
    const dialogo = this.modalEliminacion?.nativeElement;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }

  protected cerrarEliminacion(): void {
    if (!this.eliminando()) this.ocultarEliminacion();
  }

  // Escape equivale a "Conservar", salvo mientras se elimina.
  protected alCancelarEliminacion(evento: Event): void {
    evento.preventDefault();
    this.cerrarEliminacion();
  }

  private ocultarEliminacion(): void {
    this.pendienteEliminar.set(null); this.errorOperacion.set('');
    const dialogo = this.modalEliminacion?.nativeElement;
    if (dialogo?.open) dialogo.close();
  }

  protected async eliminar(): Promise<void> {
    const actual = this.pendienteEliminar();
    if (!actual || !this.esAdmin() || this.ocupado()) return;
    this.eliminando.set(true); this.errorOperacion.set(''); this.mensaje.set('');
    try {
      await firstValueFrom(this.api.eliminarServicio(actual.id));
      this.eliminando.set(false);
      this.ocultarEliminacion();
      this.mensaje.set('Servicio eliminado correctamente.');
      await this.recargar();
    } catch (error) { this.errorOperacion.set(mensajeErrorCatalogo(error)); }
    finally { this.eliminando.set(false); }
  }
}
