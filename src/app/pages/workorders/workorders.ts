import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicioApi, OrdenTrabajo, ServicioCatalogo } from '../../services/api.service';
import { mensajeErrorApi } from '../../services/error-api';

@Component({
  selector: 'app-workorders', imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './workorders.html', styleUrl: './workorders.scss',
})
export class PaginaWorkOrders implements OnInit {
  private readonly api = inject(ServicioApi);
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly ordenes = signal<OrdenTrabajo[]>([]);
  protected readonly seleccionada = signal<OrdenTrabajo | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly consultando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected servicioId: number | null = null;
  protected descripcion = '';
  protected direccion = '';

  ngOnInit(): void { void this.cargar(); }

  protected async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set(''); this.seleccionada.set(null);
    try {
      const [servicios, ordenes] = await Promise.all([
        firstValueFrom(this.api.listarServicios()), firstValueFrom(this.api.listarOrdenes()),
      ]);
      this.servicios.set(servicios); this.ordenes.set(ordenes);
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.cargando.set(false); }
  }

  protected async crear(): Promise<void> {
    if (this.guardando() || !this.servicioId || !this.descripcion.trim() || !this.direccion.trim()) return;
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const orden = await firstValueFrom(this.api.crearOrden({
        servicioId: this.servicioId, descripcion: this.descripcion.trim(), direccion: this.direccion.trim(),
      }));
      this.ordenes.update(ordenes => [orden, ...ordenes]);
      this.seleccionada.set(orden);
      this.mensaje.set(`Orden #${orden.id} creada correctamente.`);
      this.descripcion = ''; this.direccion = ''; this.servicioId = null;
    } catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.guardando.set(false); }
  }

  protected async consultar(id: number): Promise<void> {
    this.consultando.set(true); this.error.set(''); this.seleccionada.set(null);
    try { this.seleccionada.set(await firstValueFrom(this.api.consultarOrden(id))); }
    catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.consultando.set(false); }
  }
}
