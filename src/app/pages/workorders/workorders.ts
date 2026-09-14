import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

// ── Tipos mock — se reemplazarán por modelos del BFF ────────────────────────

export type EstadoOrden = 'pendiente' | 'en_terreno' | 'completada' | 'cancelada';

export interface OrdenTrabajo {
  id: string;
  cliente: string;
  descripcion: string;
  estado: EstadoOrden;
  tecnico?: string;
  fecha: string;
}

// Estados a los que puede mover el Supervisor / Admin
const TRANSICIONES: Record<EstadoOrden, EstadoOrden | null> = {
  pendiente:  'en_terreno',
  en_terreno: 'completada',
  completada: null,
  cancelada:  null,
};

// ── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-workorders',
  imports: [RouterLink],
  templateUrl: './workorders.html',
  styleUrl: './workorders.scss',
})
export class PaginaWorkOrders implements OnInit {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  // TODO: reemplazar con llamada al BFF → GET /api/workorders  (Admin/Supervisor)
  //                                       GET /api/mis-ordenes  (Cliente)
  protected ordenes: OrdenTrabajo[] = [
    { id: 'OT-001', cliente: 'Empresa A',  descripcion: 'Revisión tablero eléctrico',     estado: 'pendiente',  fecha: '2026-09-10' },
    { id: 'OT-002', cliente: 'Empresa B',  descripcion: 'Cambio de fusibles',              estado: 'pendiente',  fecha: '2026-09-11' },
    { id: 'OT-003', cliente: 'Empresa C',  descripcion: 'Instalación panel solar',         estado: 'en_terreno', tecnico: 'Juan Pérez',      fecha: '2026-09-12' },
    { id: 'OT-004', cliente: 'Empresa D',  descripcion: 'Diagnóstico sistema UPS',         estado: 'en_terreno', tecnico: 'María González',  fecha: '2026-09-12' },
    { id: 'OT-005', cliente: 'Mi Empresa', descripcion: 'Revisión empalme trifásico',      estado: 'completada', tecnico: 'Carlos Rojas',    fecha: '2026-09-08' },
    { id: 'OT-006', cliente: 'Empresa E',  descripcion: 'Mantención generador',            estado: 'completada', tecnico: 'Ana Torres',      fecha: '2026-09-07' },
    { id: 'OT-007', cliente: 'Empresa F',  descripcion: 'Instalación iluminación LED',     estado: 'cancelada',  fecha: '2026-09-05' },
    { id: 'OT-008', cliente: 'Mi Empresa', descripcion: 'Mantención preventiva cuadro',    estado: 'en_terreno', tecnico: 'Carlos Rojas',    fecha: '2026-09-13' },
  ];

  // Formulario de nueva orden (simple)
  protected mostrarFormulario = false;
  protected nuevaDescripcion = '';
  protected mensajeFormulario = '';

  protected get ordenesFiltradas(): OrdenTrabajo[] {
    // El cliente solo ve sus propias órdenes (mock: "Mi Empresa")
    if (this.autenticacion.tieneRol('Cliente') && !this.autenticacion.tieneRol('Admin') && !this.autenticacion.tieneRol('Supervisor')) {
      return this.ordenes.filter(o => o.cliente === 'Mi Empresa');
    }
    return this.ordenes;
  }

  protected puedeCrear(): boolean {
    return (
      this.autenticacion.tieneRol('Admin') ||
      this.autenticacion.tieneRol('Supervisor') ||
      this.autenticacion.tieneRol('Cliente')
    );
  }

  protected puedeCambiarEstado(): boolean {
    return (
      this.autenticacion.tieneRol('Admin') ||
      this.autenticacion.tieneRol('Supervisor')
    );
  }

  protected siguienteEstado(estado: EstadoOrden): EstadoOrden | null {
    return TRANSICIONES[estado];
  }

  protected etiquetaSiguienteEstado(estado: EstadoOrden): string {
    const mapa: Partial<Record<EstadoOrden, string>> = {
      pendiente:  'Iniciar',
      en_terreno: 'Completar',
    };
    return mapa[estado] ?? '';
  }

  protected etiquetaEstado(estado: EstadoOrden): string {
    const mapa: Record<EstadoOrden, string> = {
      pendiente:  'Pendiente',
      en_terreno: 'En terreno',
      completada: 'Completada',
      cancelada:  'Cancelada',
    };
    return mapa[estado];
  }

  // TODO: reemplazar con PATCH /api/workorders/:id/estado
  protected avanzarEstado(orden: OrdenTrabajo): void {
    const siguiente = TRANSICIONES[orden.estado];
    if (siguiente) {
      orden.estado = siguiente;
    }
  }

  // TODO: reemplazar con POST /api/workorders  (Admin/Supervisor)
  //                        POST /api/mis-ordenes  (Cliente)
  protected crearOrden(): void {
    if (!this.nuevaDescripcion.trim()) {
      this.mensajeFormulario = 'Ingresa una descripción para la orden.';
      return;
    }

    const cuenta = this.autenticacion.obtenerCuentaActiva();
    const nuevaOrden: OrdenTrabajo = {
      id:          `OT-${String(this.ordenes.length + 1).padStart(3, '0')}`,
      cliente:     cuenta?.name ?? 'Mi Empresa',
      descripcion: this.nuevaDescripcion.trim(),
      estado:      'pendiente',
      fecha:       new Date().toISOString().split('T')[0],
    };

    this.ordenes = [nuevaOrden, ...this.ordenes];
    this.nuevaDescripcion = '';
    this.mostrarFormulario = false;
    this.mensajeFormulario = '';
  }

  protected cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.nuevaDescripcion = '';
    this.mensajeFormulario = '';
  }

  ngOnInit(): void {
    this.autenticacion.cargarAutorizacion();
  }
}
