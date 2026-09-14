import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

// ── Tipos mock — se reemplazarán por modelos del BFF ────────────────────────

interface KpiAdmin {
  etiqueta: string;
  valor: string | number;
  unidad?: string;
}

interface OrdenResumida {
  id: string;
  cliente: string;
  descripcion: string;
  estado: 'pendiente' | 'en_terreno' | 'completada' | 'cancelada';
  tecnico?: string;
}

// ── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class PaginaDashboard implements OnInit {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  // TODO: reemplazar con llamada al BFF → GET /api/kpis
  protected readonly kpisAdmin: KpiAdmin[] = [
    { etiqueta: 'Órdenes activas',    valor: 24 },
    { etiqueta: 'Técnicos en terreno', valor: 7 },
    { etiqueta: 'SLA cumplido',        valor: 91, unidad: '%' },
    { etiqueta: 'Tiempo promedio',     valor: '3.2', unidad: 'h' },
  ];

  // TODO: reemplazar con llamada al BFF → GET /api/workorders?estado=pendiente,en_terreno
  protected readonly ordenesSupervisor: OrdenResumida[] = [
    { id: 'OT-001', cliente: 'Empresa A', descripcion: 'Revisión tablero eléctrico', estado: 'pendiente' },
    { id: 'OT-002', cliente: 'Empresa B', descripcion: 'Cambio de fusibles', estado: 'pendiente' },
    { id: 'OT-003', cliente: 'Empresa C', descripcion: 'Instalación panel solar', estado: 'en_terreno', tecnico: 'Juan Pérez' },
    { id: 'OT-004', cliente: 'Empresa D', descripcion: 'Diagnóstico sistema UPS', estado: 'en_terreno', tecnico: 'María González' },
  ];

  // TODO: reemplazar con llamada al BFF → GET /api/mis-ordenes?limit=3
  protected readonly ordenesCliente: OrdenResumida[] = [
    { id: 'OT-008', cliente: 'Mi Empresa', descripcion: 'Mantención preventiva cuadro eléctrico', estado: 'en_terreno', tecnico: 'Carlos Rojas' },
    { id: 'OT-005', cliente: 'Mi Empresa', descripcion: 'Revisión empalme trifásico', estado: 'completada' },
    { id: 'OT-003', cliente: 'Mi Empresa', descripcion: 'Certificación instalación', estado: 'completada' },
  ];

  protected obtenerNombreUsuario(): string {
    const cuenta = this.autenticacion.obtenerCuentaActiva();
    return cuenta?.name ?? cuenta?.username ?? 'Usuario';
  }

  protected etiquetaEstado(estado: OrdenResumida['estado']): string {
    const mapa: Record<OrdenResumida['estado'], string> = {
      pendiente:  'Pendiente',
      en_terreno: 'En terreno',
      completada: 'Completada',
      cancelada:  'Cancelada',
    };
    return mapa[estado];
  }

  ngOnInit(): void {
    this.autenticacion.cargarAutorizacion();
  }
}
