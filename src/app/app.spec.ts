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

  // Comprueba que la pantalla muestre el nombre correcto.
  it('deberia mostrar DigitalFix como titulo', async () => {
    const entorno = TestBed.createComponent(App);

    // Espera a que Angular termine de actualizar la vista.
    await entorno.whenStable();

    const elemento = entorno.nativeElement as HTMLElement;
    const titulo = elemento.querySelector('h1')?.textContent?.trim();

    expect(titulo).toBe('DigitalFix');
  });
});