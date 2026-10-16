import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicioApi, ServicioCatalogo, RepuestoCatalogo } from '../../services/api.service';
import { mensajeErrorApi } from '../../services/error-api';

@Component({
  selector: 'app-catalog', imports: [RouterLink, CurrencyPipe],
  templateUrl: './catalog.html', styleUrl: './catalog.scss',
})
export class PaginaCatalog implements OnInit {
  private readonly api = inject(ServicioApi);
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly repuestos = signal<RepuestoCatalogo[]>([]);
  protected readonly cargandoServicios = signal(false);
  protected readonly cargandoRepuestos = signal(false);
  protected readonly cargando = computed(() => this.cargandoServicios() || this.cargandoRepuestos());
  protected readonly errorServicios = signal('');
  protected readonly errorRepuestos = signal('');
  ngOnInit(): void { void this.cargar(); }
  protected async cargar(): Promise<void> {
    if (this.cargando()) return;
    await Promise.all([this.cargarServicios(), this.cargarRepuestos()]);
  }
  protected async cargarServicios(): Promise<void> {
    if (this.cargandoServicios()) return;
    this.cargandoServicios.set(true); this.errorServicios.set(''); this.servicios.set([]);
    try { this.servicios.set(await firstValueFrom(this.api.listarServicios())); }
    catch (error) { this.errorServicios.set(mensajeErrorApi(error)); }
    finally { this.cargandoServicios.set(false); }
  }
  protected async cargarRepuestos(): Promise<void> {
    if (this.cargandoRepuestos()) return;
    this.cargandoRepuestos.set(true); this.errorRepuestos.set(''); this.repuestos.set([]);
    try { this.repuestos.set(await firstValueFrom(this.api.listarRepuestos())); }
    catch (error) { this.errorRepuestos.set(mensajeErrorApi(error)); }
    finally { this.cargandoRepuestos.set(false); }
  }
}
