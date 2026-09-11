import { TestBed } from '@angular/core/testing';
import { App } from './app';

// Agrupa las pruebas del componente principal.
describe('Componente principal de DigitalFix', () => {

  // Prepara un entorno de Angular antes de cada prueba.
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

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
});