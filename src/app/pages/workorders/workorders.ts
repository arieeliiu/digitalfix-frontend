import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicioApi, OrdenTrabajo, ServicioCatalogo, EstadoOrden, RepuestoCatalogo, RepuestoOrden } from '../../services/api.service';
import { ServicioAutenticacion } from '../../services/auth.service';
import { mensajeErrorApi } from '../../services/error-api';

@Component({
  selector: 'app-workorders', imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './workorders.html', styleUrl: './workorders.scss',
})
export class PaginaWorkOrders implements OnInit {
  private readonly api = inject(ServicioApi);
  private readonly auth = inject(ServicioAutenticacion);
  @ViewChild('modalOrden') private modalOrden?: ElementRef<HTMLDialogElement>;
  @ViewChild('modalDetalle') private modalDetalle?: ElementRef<HTMLDialogElement>;
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly repuestos = signal<RepuestoCatalogo[]>([]);
  protected readonly cargandoRepuestos = signal(false);
  protected readonly errorRepuestos = signal('');
  protected cantidades: Record<number, number | null> = {};
  protected readonly ordenes = signal<OrdenTrabajo[]>([]);
  protected readonly seleccionada = signal<OrdenTrabajo | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly consultando = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly editandoAsignacion = signal(false);
  protected repuestosEdicion(): RepuestoCatalogo[] {
    const disponibles = this.repuestos();
    const antiguos = this.repuestosOriginales;
    return [...disponibles, ...antiguos.filter(x => !disponibles.some(r => r.id === x.repuestoId))
      .map(x => ({ id: x.repuestoId, nombre: `Repuesto #${x.repuestoId}`, descripcion: null, stock: 0 }))];
  }
  protected cantidadesEdicion: Record<number, number | null> = {};
  private repuestosOriginales: RepuestoOrden[] = [];
  protected readonly modalOrdenAbierto = signal(false);
  protected readonly modalDetalleAbierto = signal(false);
  protected readonly pendienteEliminar = signal<OrdenTrabajo | null>(null);
  protected readonly ocupado = computed(() => this.cargando() || this.guardando() || this.consultando() || this.cargandoRepuestos());
  protected readonly puedeGestionarEstado = computed(() => this.auth.tieneRol('Admin') || this.auth.tieneRol('Operador'));
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected servicioId: number | null = null;
  protected descripcion = '';
  protected direccion = '';
  protected emailContacto = '';
  private emailContactoOriginal = '';
  protected emailTecnico = '';
  private emailTecnicoOriginal = '';
  protected nuevoEstado: EstadoOrden | '' = '';
  protected tecnicoId = '';
  protected readonly estadosDisponibles = computed<EstadoOrden[]>(() => {
    const estado = this.seleccionada()?.estado;
    const siguientes: Partial<Record<EstadoOrden, EstadoOrden>> = {
      CREADA: 'ASIGNADA', ASIGNADA: 'EN_DESPLAZAMIENTO',
      EN_DESPLAZAMIENTO: 'EN_EJECUCION', EN_EJECUCION: 'CERRADA',
    };
    return estado && siguientes[estado] ? [siguientes[estado]!, 'CANCELADA'] : [];
  });

  ngOnInit(): void { void this.cargar(); }

  protected async cargar(): Promise<void> {
    if (this.ocupado()) return;
    this.cerrarDetalle();
    this.cargando.set(true); this.error.set('');
    this.cantidades = {};
    this.pendienteEliminar.set(null); this.cancelarEdicion();
    try {
      const [servicios, ordenes] = await Promise.all([
        firstValueFrom(this.api.listarServicios()), firstValueFrom(this.api.listarOrdenes()),
      ]);
      this.servicios.set(servicios); this.ordenes.set(ordenes);
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.cargando.set(false); }
    if (this.puedeGestionarEstado()) await this.cargarRepuestos();
  }

  protected async cargarRepuestos(): Promise<void> {
    if (!this.puedeGestionarEstado() || this.cargandoRepuestos()) return;
    this.cargandoRepuestos.set(true); this.errorRepuestos.set('');
    this.repuestos.set([]); this.cantidades = {};
    try { this.repuestos.set(await firstValueFrom(this.api.listarRepuestos())); }
    catch (error) { this.errorRepuestos.set(mensajeErrorApi(error)); }
    finally { this.cargandoRepuestos.set(false); }
  }

  protected nombreRepuesto(id: number): string {
    return this.repuestos().find(repuesto => repuesto.id === id)?.nombre ?? `Repuesto #${id}`;
  }

  // Convertir los estados a etiquetas legibles, conservando los valores de la API.
  protected nombreEstado(estado: EstadoOrden): string {
    const etiquetas: Record<EstadoOrden, string> = {
      CREADA: 'CREADA', ASIGNADA: 'ASIGNADA',
      EN_DESPLAZAMIENTO: 'EN DESPLAZAMIENTO',
      EN_EJECUCION: 'EN EJECUCIÓN',
      CERRADA: 'CERRADA', CANCELADA: 'CANCELADA',
    };
    return etiquetas[estado];
  }

  private puedeEditarTecnico(orden: OrdenTrabajo): boolean {
    return this.puedeGestionarEstado() && !!orden.tecnicoId
      && ['ASIGNADA', 'EN_DESPLAZAMIENTO', 'EN_EJECUCION'].includes(orden.estado);
  }

  protected esPropia(orden: OrdenTrabajo): boolean {
    const oid = this.auth.obtenerCuentaActiva()?.idTokenClaims?.oid;
    return typeof oid === 'string' && oid === orden.solicitanteId;
  }

  protected puedeEditar(orden: OrdenTrabajo): boolean {
    return (orden.estado === 'CREADA' && (this.auth.tieneRol('Admin') || this.esPropia(orden)))
      || this.puedeEditarTecnico(orden);
  }

  protected puedeEliminar(orden: OrdenTrabajo): boolean {
    return ['CREADA', 'CANCELADA'].includes(orden.estado) && (this.auth.tieneRol('Admin') || this.esPropia(orden));
  }

  protected abrirNuevaOrden(): void {
    if (this.ocupado()) return;
    this.cerrarDetalle();
    this.cancelarEdicion();
    this.error.set('');
    this.mensaje.set('');
    this.abrirModal();
  }

  private abrirModal(): void {
    const dialogo = this.modalOrden?.nativeElement;
    if (!dialogo || dialogo.open) return;
    dialogo.showModal();
    this.modalOrdenAbierto.set(true);
    dialogo.querySelector<HTMLSelectElement>('#servicio')?.focus();
  }

  protected alCancelarModal(evento: Event): void {
    evento.preventDefault();
    if (!this.ocupado()) this.cancelarEdicion();
  }

  // El detalle solo se abre al consultar; guardar nunca lo despliega.
  private abrirDetalle(): void {
    const dialogo = this.modalDetalle?.nativeElement;
    if (!dialogo || dialogo.open) return;
    dialogo.showModal();
    this.modalDetalleAbierto.set(true);
  }

  protected cerrarDetalle(): void {
    if (this.guardando()) return;
    if (this.modalDetalle?.nativeElement.open) this.modalDetalle.nativeElement.close();
    this.modalDetalleAbierto.set(false);
    this.seleccionada.set(null);
    this.nuevoEstado = '';
    this.cantidades = {};
  }

  protected alCancelarDetalle(evento: Event): void {
    evento.preventDefault();
    this.cerrarDetalle();
  }

  protected cantidadOriginal(id: number): number {
    return this.repuestosOriginales.find(r => r.repuestoId === id)?.cantidad ?? 0;
  }

  private async guardarAsignacion(id: number): Promise<void> {
    const actual = this.ordenes().find(o => o.id === id);
    if (!actual || !this.puedeEditarTecnico(actual)) return;
    if (!this.correoValido(this.emailContacto, true) || !this.correoValido(this.emailTecnico, true)) {
      this.error.set('Ingresa los correos válidos del cliente y del técnico.'); return;
    }
    const lista = this.repuestosEdicion().map(r => ({
      repuestoId: r.id, cantidad: this.cantidadesEdicion[r.id] ?? 0,
    }));
    for (const r of lista) {
      const max = (this.repuestos().find(x => x.id === r.repuestoId)?.stock ?? 0) + this.cantidadOriginal(r.repuestoId);
      if (typeof r.cantidad !== 'number' || !Number.isInteger(r.cantidad) || r.cantidad < 0 || r.cantidad > max) {
        this.error.set('Revisa las cantidades de repuestos y su stock disponible.'); return;
      }
    }
    const nuevos = lista.filter(r => r.cantidad > 0) as RepuestoOrden[];
    const cambioRepuestos = JSON.stringify([...nuevos].sort((a,b)=>a.repuestoId-b.repuestoId))
      !== JSON.stringify([...this.repuestosOriginales].sort((a,b)=>a.repuestoId-b.repuestoId));
    const contactos = {
      ...(this.emailContacto.trim() !== this.emailContactoOriginal ? { emailContacto: this.emailContacto.trim() } : {}),
      ...(this.emailTecnico.trim() !== this.emailTecnicoOriginal ? { emailTecnico: this.emailTecnico.trim() } : {}),
    };
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      if (cambioRepuestos) {
        const orden = await firstValueFrom(this.api.actualizarRepuestosOrden(id, {
          anteriores: this.repuestosOriginales, nuevos,
        }));
        this.reemplazarOrden(orden);
        this.repuestosOriginales = orden.repuestos ?? [];
        await this.cargarRepuestosEdicion();
      }
      if (Object.keys(contactos).length) {
        const orden = await firstValueFrom(this.api.actualizarContactos(id, contactos));
        this.reemplazarOrden(orden);
      }
      this.mensaje.set(`Orden #${id} actualizada correctamente.`);
      this.cancelarEdicion();
    } catch (error) {
      this.error.set('No se pudieron guardar todos los cambios. Revisa la orden antes de reintentar. ' + mensajeErrorApi(error));
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargarRepuestosEdicion(): Promise<void> {
    try { this.repuestos.set(await firstValueFrom(this.api.listarRepuestos())); }
    catch (error) { this.errorRepuestos.set(mensajeErrorApi(error)); }
  }

  protected async crear(): Promise<void> {
    if (this.editandoAsignacion() && this.editandoId() !== null) {
      await this.guardarAsignacion(this.editandoId()!);
      return;
    }
    if (this.ocupado() || !this.servicioId || !this.descripcion.trim() || !this.direccion.trim()
        || this.descripcion.length > 1000 || this.direccion.length > 300) return;
    if (!this.correoValido(this.emailContacto, true)) {
      this.error.set('Ingresa un correo de contacto válido de hasta 254 caracteres.'); return;
    }
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const datos = {
        servicioId: this.servicioId, descripcion: this.descripcion.trim(), direccion: this.direccion.trim(),
        ...(this.editandoId() === null && this.emailContacto.trim() ? { emailContacto: this.emailContacto.trim() } : {}),
      };
      const id = this.editandoId();
      if (id !== null && !this.ordenes().some(orden => orden.id === id && this.puedeEditar(orden))) return;
      let orden = await firstValueFrom(id === null ? this.api.crearOrden(datos) : this.api.actualizarOrden(id, datos));
      if (id === null) this.ordenes.update(ordenes => [orden, ...ordenes]);
      else this.reemplazarOrden(orden);
      if (id !== null && this.emailContacto.trim() !== this.emailContactoOriginal) {
        // PUT y PATCH son independientes: conservar la edición si falla el segundo.
        try {
          orden = await firstValueFrom(this.api.actualizarContactos(id, { emailContacto: this.emailContacto.trim() }));
          this.reemplazarOrden(orden);
        } catch (error) {
          this.error.set('Los datos de la orden se guardaron, pero no se pudo actualizar el correo. ' + mensajeErrorApi(error));
          return;
        }
      }
      this.mensaje.set(`Orden #${orden.id} ${id === null ? 'creada' : 'actualizada'} correctamente.`);
      this.cancelarEdicion();
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.guardando.set(false); }
  }

  protected async consultar(id: number): Promise<void> {
    if (this.ocupado()) return;
    this.cerrarDetalle();
    this.consultando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const orden = await firstValueFrom(this.api.consultarOrden(id));
      this.mostrarDetalle(orden); this.reemplazarOrden(orden);
      this.abrirDetalle();
    }
    catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.consultando.set(false); }
  }

  protected async editar(id: number): Promise<void> {
    if (this.ocupado()) return;
    this.cerrarDetalle();
    this.consultando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const orden = await firstValueFrom(this.api.consultarOrden(id));
      this.reemplazarOrden(orden);
      if (!this.puedeEditar(orden)) {
        this.error.set('No tienes permisos para editar esta orden en su estado actual.');
        return;
      }
      this.editandoAsignacion.set(orden.estado !== 'CREADA');
      this.editandoId.set(id);
      this.servicioId = orden.servicioId;
      this.descripcion = orden.descripcion;
      this.direccion = orden.direccion;
      this.emailContacto = orden.emailContacto ?? '';
      this.emailContactoOriginal = this.emailContacto;
      this.tecnicoId = orden.tecnicoId ?? '';
      this.emailTecnico = orden.emailTecnico ?? '';
      this.emailTecnicoOriginal = this.emailTecnico;
      this.repuestosOriginales = [...(orden.repuestos ?? [])];
      this.cantidadesEdicion = Object.fromEntries(this.repuestosOriginales.map(r => [r.repuestoId, r.cantidad]));
      this.pendienteEliminar.set(null);
      this.abrirModal();
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.consultando.set(false); }
  }

  protected cancelarEdicion(): void {
    if (this.modalOrden?.nativeElement.open) this.modalOrden.nativeElement.close();
    this.modalOrdenAbierto.set(false);
    this.editandoId.set(null); this.editandoAsignacion.set(false);
    this.servicioId = null; this.descripcion = ''; this.direccion = '';
    this.emailContacto = ''; this.emailContactoOriginal = '';
    this.emailTecnico = ''; this.emailTecnicoOriginal = '';
    this.repuestosOriginales = []; this.cantidadesEdicion = {};
  }

  protected solicitarEliminacion(orden: OrdenTrabajo): void {
    if (!this.ocupado() && this.puedeEliminar(orden)) this.pendienteEliminar.set(orden);
  }

  protected async eliminar(): Promise<void> {
    const orden = this.pendienteEliminar();
    if (!orden || this.ocupado() || !this.puedeEliminar(orden)) return;
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      await firstValueFrom(this.api.eliminarOrden(orden.id));
      this.ordenes.update(ordenes => ordenes.filter(o => o.id !== orden.id));
      if (this.seleccionada()?.id === orden.id) this.seleccionada.set(null);
      if (this.editandoId() === orden.id) this.cancelarEdicion();
      this.pendienteEliminar.set(null);
      this.mensaje.set(`Orden #${orden.id} eliminada correctamente.`);
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.guardando.set(false); }
  }

  protected async cambiarEstado(): Promise<void> {
    const orden = this.seleccionada();
    if (!orden || this.ocupado() || !this.puedeGestionarEstado() || !this.nuevoEstado
        || !this.estadosDisponibles().includes(this.nuevoEstado)) return;
    if (this.nuevoEstado === 'ASIGNADA' && (!this.tecnicoId.trim() || this.tecnicoId.length > 100)) {
      this.error.set('Ingresa el identificador del técnico para asignar la orden.');
      return;
    }
    const asignando = this.nuevoEstado === 'ASIGNADA';
    if (asignando && !this.correoValido(this.emailTecnico, true)) {
      this.error.set('Ingresa un correo del técnico válido de hasta 254 caracteres.'); return;
    }
    const repuestos: RepuestoOrden[] = [];
    if (asignando) {
      for (const repuesto of this.repuestos()) {
        const cantidad = this.cantidades[repuesto.id] === undefined ? 0 : this.cantidades[repuesto.id];
        if (cantidad === null || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > repuesto.stock) {
          this.error.set(`La cantidad de ${repuesto.nombre} debe ser un entero entre 0 y ${repuesto.stock}.`);
          return;
        }
        if (cantidad > 0) repuestos.push({ repuestoId: repuesto.id, cantidad });
      }
    }
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const actualizada = await firstValueFrom(this.api.cambiarEstadoOrden(orden.id, {
        status: this.nuevoEstado,
        ...(asignando ? { tecnicoId: this.tecnicoId.trim(), repuestos } : {}),
        ...(asignando && this.emailTecnico.trim() ? { emailTecnico: this.emailTecnico.trim() } : {}),
      }));
      this.reemplazarOrden(actualizada); this.mostrarDetalle(actualizada);
      if (this.editandoId() === orden.id) this.cancelarEdicion();
      this.mensaje.set(`Estado de la orden #${orden.id} actualizado.`);
      if (asignando) await this.cargarRepuestos();
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.guardando.set(false); }
  }

  protected correoValido(valor: string, obligatorio = false): boolean {
    return (!obligatorio || valor.trim().length > 0)
      && new FormControl(valor.trim(), [Validators.email, Validators.maxLength(254)]).valid;
  }

  private reemplazarOrden(orden: OrdenTrabajo): void {
    this.ordenes.update(ordenes => ordenes.map(o => o.id === orden.id ? orden : o));
  }

  private mostrarDetalle(orden: OrdenTrabajo): void {
    this.cantidades = {};
    this.seleccionada.set(orden); this.nuevoEstado = ''; this.tecnicoId = orden.tecnicoId ?? '';
    this.emailTecnico = orden.emailTecnico ?? '';
  }
}
