import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicioApi, OrdenTrabajo, ServicioCatalogo, EstadoOrden } from '../../services/api.service';
import { ServicioAutenticacion } from '../../services/auth.service';
import { mensajeErrorApi } from '../../services/error-api';

@Component({
  selector: 'app-workorders', imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './workorders.html', styleUrl: './workorders.scss',
})
export class PaginaWorkOrders implements OnInit {
  private readonly api = inject(ServicioApi);
  private readonly auth = inject(ServicioAutenticacion);
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly ordenes = signal<OrdenTrabajo[]>([]);
  protected readonly seleccionada = signal<OrdenTrabajo | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly consultando = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly pendienteEliminar = signal<OrdenTrabajo | null>(null);
  protected readonly ocupado = computed(() => this.cargando() || this.guardando() || this.consultando());
  protected readonly puedeGestionarEstado = computed(() => this.auth.tieneRol('Admin') || this.auth.tieneRol('Operador'));
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected servicioId: number | null = null;
  protected descripcion = '';
  protected direccion = '';
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
    this.cargando.set(true); this.error.set(''); this.seleccionada.set(null);
    this.pendienteEliminar.set(null); this.cancelarEdicion();
    try {
      const [servicios, ordenes] = await Promise.all([
        firstValueFrom(this.api.listarServicios()), firstValueFrom(this.api.listarOrdenes()),
      ]);
      this.servicios.set(servicios); this.ordenes.set(ordenes);
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.cargando.set(false); }
  }

  protected async crear(): Promise<void> {
    if (this.ocupado() || !this.servicioId || !this.descripcion.trim() || !this.direccion.trim()
        || this.descripcion.length > 1000 || this.direccion.length > 300) return;
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const datos = {
        servicioId: this.servicioId, descripcion: this.descripcion.trim(), direccion: this.direccion.trim(),
      };
      const id = this.editandoId();
      const orden = await firstValueFrom(id === null ? this.api.crearOrden(datos) : this.api.actualizarOrden(id, datos));
      if (id === null) this.ordenes.update(ordenes => [orden, ...ordenes]);
      else this.reemplazarOrden(orden);
      this.mostrarDetalle(orden);
      this.mensaje.set(`Orden #${orden.id} ${id === null ? 'creada' : 'actualizada'} correctamente.`);
      this.cancelarEdicion();
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.guardando.set(false); }
  }

  protected async consultar(id: number): Promise<void> {
    if (this.ocupado()) return;
    this.consultando.set(true); this.error.set(''); this.seleccionada.set(null);
    try {
      const orden = await firstValueFrom(this.api.consultarOrden(id));
      this.mostrarDetalle(orden); this.reemplazarOrden(orden);
    }
    catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.consultando.set(false); }
  }

  protected async editar(id: number): Promise<void> {
    if (this.ocupado()) return;
    this.consultando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const orden = await firstValueFrom(this.api.consultarOrden(id));
      this.mostrarDetalle(orden);
      this.reemplazarOrden(orden);
      if (orden.estado !== 'CREADA') {
        this.error.set('Solo se pueden editar órdenes creadas.');
        return;
      }
      this.editandoId.set(id);
      this.servicioId = orden.servicioId;
      this.descripcion = orden.descripcion;
      this.direccion = orden.direccion;
      this.pendienteEliminar.set(null);
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.consultando.set(false); }
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null); this.servicioId = null; this.descripcion = ''; this.direccion = '';
  }

  protected solicitarEliminacion(orden: OrdenTrabajo): void {
    if (!this.ocupado()) this.pendienteEliminar.set(orden);
  }

  protected async eliminar(): Promise<void> {
    const orden = this.pendienteEliminar();
    if (!orden || this.ocupado()) return;
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
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const actualizada = await firstValueFrom(this.api.cambiarEstadoOrden(orden.id, {
        status: this.nuevoEstado,
        ...(this.nuevoEstado === 'ASIGNADA' ? { tecnicoId: this.tecnicoId.trim() } : {}),
      }));
      this.reemplazarOrden(actualizada); this.mostrarDetalle(actualizada);
      if (this.editandoId() === orden.id) this.cancelarEdicion();
      this.mensaje.set(`Estado de la orden #${orden.id} actualizado.`);
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.guardando.set(false); }
  }

  private reemplazarOrden(orden: OrdenTrabajo): void {
    this.ordenes.update(ordenes => ordenes.map(o => o.id === orden.id ? orden : o));
  }

  private mostrarDetalle(orden: OrdenTrabajo): void {
    this.seleccionada.set(orden); this.nuevoEstado = ''; this.tecnicoId = orden.tecnicoId ?? '';
  }
}
