import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { RepuestoCatalogo, ServicioApi } from '../../../services/api.service';
import { ServicioAutenticacion } from '../../../services/auth.service';
import { mensajeErrorCatalogo } from '../../../services/error-catalogo';
import { BotonIcono } from '../../../shared/ui/boton-icono/boton-icono';

// Catálogo de repuestos y su stock. Admin lo edita; Operador solo lo lee.
// El stock al asignar una orden lo descuenta Catalog, no esta página.
@Component({
  selector: 'app-repuestos',
  imports: [FormsModule, BotonIcono],
  templateUrl: './repuestos.html',
  styleUrl: './repuestos.scss',
})
export class PaginaRepuestos implements OnInit {
  private readonly api = inject(ServicioApi);
  private readonly auth = inject(ServicioAutenticacion);
  @ViewChild('modalEliminacion') private modalEliminacion?: ElementRef<HTMLDialogElement>;

  protected readonly esAdmin = computed(() => this.auth.tieneRol('Admin'));
  protected readonly repuestos = signal<RepuestoCatalogo[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly ocupado = computed(() => this.cargando() || this.guardando() || this.eliminando());
  protected readonly error = signal('');
  protected readonly errorOperacion = signal('');
  protected readonly mensaje = signal('');
  protected readonly formulario = signal(false);
  protected readonly pendienteEliminar = signal<RepuestoCatalogo | null>(null);
  protected datos: { id: number | null; nombre: string; descripcion: string; stock: number | null } = {
    id: null, nombre: '', descripcion: '', stock: null,
  };

  ngOnInit(): void { void this.cargar(); }

  protected async cargar(): Promise<void> {
    if (this.ocupado()) return;
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    this.cargando.set(true); this.error.set(''); this.repuestos.set([]);
    try { this.repuestos.set(await firstValueFrom(this.api.listarRepuestos())); }
    catch (error) { this.error.set(mensajeErrorCatalogo(error)); }
    finally { this.cargando.set(false); }
  }

  protected abrir(actual?: RepuestoCatalogo): void {
    if (!this.esAdmin() || this.ocupado()) return;
    this.datos = {
      id: actual?.id ?? null, nombre: actual?.nombre ?? '',
      descripcion: actual?.descripcion ?? '', stock: actual?.stock ?? null,
    };
    this.errorOperacion.set(''); this.mensaje.set('');
    this.formulario.set(true);
  }

  protected cancelar(): void {
    if (this.ocupado()) return;
    this.resetear(); this.errorOperacion.set('');
  }

  private resetear(): void {
    this.formulario.set(false);
    this.datos = { id: null, nombre: '', descripcion: '', stock: null };
  }

  protected async guardar(): Promise<void> {
    if (!this.esAdmin() || this.ocupado() || !this.formulario()) return;
    const { id, nombre, descripcion, stock: valor } = this.datos;
    if (!nombre.trim() || !descripcion.trim() || valor === null || !Number.isInteger(valor) || valor < 0) {
      this.errorOperacion.set('Ingresa nombre, descripción y un stock entero mayor o igual a 0.');
      return;
    }
    this.guardando.set(true); this.errorOperacion.set(''); this.mensaje.set('');
    try {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim(), stock: valor };
      await firstValueFrom(id === null ? this.api.crearRepuesto(datos) : this.api.actualizarRepuesto(id, datos));
      this.resetear();
      this.mensaje.set('Repuesto guardado correctamente.');
      await this.recargar();
    } catch (error) { this.errorOperacion.set(mensajeErrorCatalogo(error)); }
    finally { this.guardando.set(false); }
  }

  // La confirmación es una ventana emergente: queda sobre la tabla en vez de desplazarla.
  protected solicitarEliminacion(actual: RepuestoCatalogo): void {
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
      await firstValueFrom(this.api.eliminarRepuesto(actual.id));
      this.eliminando.set(false);
      this.ocultarEliminacion();
      this.mensaje.set('Repuesto eliminado correctamente.');
      await this.recargar();
    } catch (error) { this.errorOperacion.set(mensajeErrorCatalogo(error)); }
    finally { this.eliminando.set(false); }
  }
}
