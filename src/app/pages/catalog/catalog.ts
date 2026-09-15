import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicioApi, ServicioCatalogo } from '../../services/api.service';
import { mensajeErrorApi } from '../../services/error-api';

@Component({
  selector: 'app-catalog', imports: [RouterLink, CurrencyPipe],
  templateUrl: './catalog.html', styleUrl: './catalog.scss',
})
export class PaginaCatalog implements OnInit {
  private readonly api = inject(ServicioApi);
  protected readonly servicios = signal<ServicioCatalogo[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  ngOnInit(): void { void this.cargar(); }
  protected async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try { this.servicios.set(await firstValueFrom(this.api.listarServicios())); }
    catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.cargando.set(false); }
  }
}
