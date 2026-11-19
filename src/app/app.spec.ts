import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { ServicioAutenticacion } from './services/auth.service';

@Component({ template: '<p>Página</p>' })
class PaginaPrueba {}

// Agrupa las pruebas del componente principal.
describe('Componente principal de DigitalFix', () => {
  let cuentaActiva: boolean;

  // Prepara un entorno de Angular antes de cada prueba.
  beforeEach(async () => {
    cuentaActiva = true;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: PaginaPrueba },
          { path: 'dashboard', component: PaginaPrueba },
          { path: 'error-autenticacion', component: PaginaPrueba },
        ]),
        {
          provide: ServicioAutenticacion,
          useValue: {
            roles: signal(['Admin']),
            tieneCuentaActiva: () => cuentaActiva,
            obtenerNombreUsuario: () => 'Ana Pérez',
            etiquetaRol: () => 'Administrador',
            cerrarSesion: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  // Crea App antes de navegar para que escuche el NavigationEnd, como en la app real.
  async function navegarA(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  // Comprueba que Angular pueda crear el componente.
  it('deberia crear la aplicacion', () => {
    const entorno = TestBed.createComponent(App);
    const aplicacion = entorno.componentInstance;

    expect(aplicacion).toBeTruthy();
  });

  it('deberia incluir el contenedor de rutas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const elemento = fixture.nativeElement as HTMLElement;

    // El componente principal actúa como contenedor de las páginas enrutadas.
    expect(elemento.querySelector('router-outlet')).not.toBeNull();
  });

  it('muestra la barra de navegación en páginas privadas con sesión activa', async () => {
    const elemento = await navegarA('/dashboard');

    expect(elemento.querySelector('nav[aria-label="Navegación principal"]')).not.toBeNull();
  });

  it('oculta la barra en la página pública de acceso', async () => {
    const elemento = await navegarA('/');

    expect(elemento.querySelector('app-barra-superior')).toBeNull();
  });

  it('oculta la barra en el error de autenticación', async () => {
    const elemento = await navegarA('/error-autenticacion');

    expect(elemento.querySelector('app-barra-superior')).toBeNull();
  });

  it('oculta la barra si no hay cuenta activa', async () => {
    cuentaActiva = false;
    const elemento = await navegarA('/dashboard');

    expect(elemento.querySelector('app-barra-superior')).toBeNull();
  });
});
