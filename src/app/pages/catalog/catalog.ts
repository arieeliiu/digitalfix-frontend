import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ServicioAutenticacion } from '../../services/auth.service';

// ── Tipos mock — se reemplazarán por modelos del BFF ────────────────────────

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
}

export interface Repuesto {
  id: string;
  nombre: string;
  referencia: string;
  stock: number;
  stockMinimo: number;
  precio: number;
}

type TabActiva = 'servicios' | 'repuestos';

// ── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-catalog',
  imports: [RouterLink],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class PaginaCatalog implements OnInit {
  protected readonly autenticacion = inject(ServicioAutenticacion);

  protected tabActiva: TabActiva = 'servicios';

  // TODO: reemplazar con llamada al BFF → GET /api/catalog/servicios
  protected servicios: Servicio[] = [
    { id: 'SVC-001', nombre: 'Mantención preventiva tablero',   descripcion: 'Revisión completa de tablero eléctrico trifásico.',     precio: 85000,  activo: true  },
    { id: 'SVC-002', nombre: 'Certificación instalación SEP',   descripcion: 'Emisión certificado SEC instalación eléctrica.',         precio: 120000, activo: true  },
    { id: 'SVC-003', nombre: 'Diagnóstico sistema UPS',         descripcion: 'Evaluación de baterías y módulos rectificadores.',       precio: 60000,  activo: true  },
    { id: 'SVC-004', nombre: 'Instalación iluminación LED',     descripcion: 'Cambio de luminarias fluorescentes a tecnología LED.',   precio: 45000,  activo: false },
    { id: 'SVC-005', nombre: 'Instalación panel solar',         descripcion: 'Montaje e interconexión de paneles fotovoltaicos.',      precio: 380000, activo: true  },
  ];

  // TODO: reemplazar con llamada al BFF → GET /api/catalog/repuestos
  protected repuestos: Repuesto[] = [
    { id: 'REP-001', nombre: 'Disyuntor 32A bifásico',   referencia: 'DZ-32B', stock: 15, stockMinimo: 5,  precio: 18500 },
    { id: 'REP-002', nombre: 'Fusible NH 160A',          referencia: 'NH-160', stock: 3,  stockMinimo: 10, precio: 9200  },
    { id: 'REP-003', nombre: 'Cable 4mm² THHN',          referencia: 'CA-4TH', stock: 85, stockMinimo: 20, precio: 1400  },
    { id: 'REP-004', nombre: 'Contactor 40A 3P',         referencia: 'CT-40P', stock: 8,  stockMinimo: 4,  precio: 32000 },
    { id: 'REP-005', nombre: 'Relé térmico 25-40A',      referencia: 'RT-40A', stock: 2,  stockMinimo: 5,  precio: 21000 },
    { id: 'REP-006', nombre: 'Bornera riel DIN 4mm²',    referencia: 'BR-4D',  stock: 120, stockMinimo: 30, precio: 850  },
  ];

  protected soloAdmin(): boolean {
    return this.autenticacion.tieneRol('Admin');
  }

  protected stockBajo(repuesto: Repuesto): boolean {
    return repuesto.stock <= repuesto.stockMinimo;
  }

  protected get hayStockBajo(): boolean {
    return this.repuestos.some(r => this.stockBajo(r));
  }

  protected formatearPrecio(valor: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor);
  }

  ngOnInit(): void {
    this.autenticacion.cargarAutorizacion();
  }
}
