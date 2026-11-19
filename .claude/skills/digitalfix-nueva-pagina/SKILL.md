---
name: digitalfix-nueva-pagina
description: Receta para crear o ampliar una pantalla de DigitalFix (por ejemplo /reports, /audit, dashboard por rol) siguiendo el patrón real del proyecto. Incluye ruta con guard por rol, llamadas en ServicioApi, estado con signals, manejo de errores en español y spec con Vitest. Úsala cuando agregues una página, una sección con datos del backend o un nuevo endpoint consumido desde el frontend.
---

# Nueva página DigitalFix

Sigue los pasos en orden. Antes de empezar, lee `CLAUDE.md`. Si la página tiene UI nueva, aplica también
la skill `digitalfix-design-system`.

## 1. Confirmar el contrato con el backend

- Busca el endpoint en el BFF (`../digitalfix-backend/digitalfix-ms-bff/src/main/java/cl/digitalfix/bff/controller/`) y su DTO de respuesta.
- Si el endpoint **no existe** en el BFF (por ejemplo `/api/report/kpis` o `/api/audit/*`), detente y avisa al usuario.
  No inventes respuestas. Si te pide avanzar igual, define la interfaz TypeScript según el caso (`docs` del backend)
  y márcala con `// TODO: confirmar contrato con BFF`.
- Toda llamada pasa por `${apiGatewayUrl}/api/...`. Nunca agregues otra URL base.

## 2. ServicioApi (`src/app/services/api.service.ts`)

- Agrega la interfaz del DTO junto a las existentes, en español y con tipos estrictos (`string | null` si puede venir null).
- Agrega el método con el mismo patrón: `defer()` + `this.http.<verbo><T>(\`${this.baseUrl()}/api/...\`)`.
- Envía solo los campos que el backend espera (desestructura como `crearOrden`). Nunca envíes `solicitanteId` ni identidad.
- Parámetros de consulta con `HttpParams` (`?range=last24h`, `?status=...&from=...&to=...`).
- Si usas un verbo nuevo (por ejemplo PATCH), recuerda que el CORS del API Gateway debe permitirlo. Avísalo en el resumen final.

## 3. Componente (`src/app/pages/<nombre>/<nombre>.ts|html|scss|spec.ts`)

Esqueleto de referencia:

```ts
@Component({
  selector: 'app-reports',
  imports: [RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class PaginaReports implements OnInit {
  private readonly api = inject(ServicioApi);
  private readonly auth = inject(ServicioAutenticacion);

  protected readonly kpis = signal<KpisRed | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly esAdmin = computed(() => this.auth.tieneRol('Admin'));

  ngOnInit(): void { void this.cargar(); }

  protected async cargar(): Promise<void> {
    if (this.cargando()) return;               // evita dobles envíos
    this.cargando.set(true); this.error.set('');
    try { this.kpis.set(await firstValueFrom(this.api.consultarKpis('last24h'))); }
    catch (error) { this.error.set(mensajeErrorApi(error)); }
    finally { this.cargando.set(false); }
  }
}
```

Reglas:
- Clase `Pagina<Nombre>`, selector `app-<nombre>`, standalone, `inject()`, miembros de plantilla `protected readonly`.
- Un signal de carga y uno de error **por operación** independiente (ver `catalog.ts`: servicios y repuestos por separado), más un `computed` `ocupado` que deshabilite las acciones.
- No mutes un signal con arrays mutables: usa `set`/`update` con copias.
- Mensajes de error: reutiliza `mensajeErrorApi`. Si el dominio necesita textos distintos, crea `services/error-<dominio>.ts` como `error-catalogo.ts`, nunca strings sueltos en la página.
- Roles en la UI solo para mostrar u ocultar. No asumas que ocultar un botón protege algo.
- Formularios: template-driven con `ngModel`, `required`/`maxlength`/`type="email"` iguales a las validaciones del backend, y validación en `crear()` antes de llamar a la API.
- Modales: `<dialog>` nativo con `@ViewChild`, `showModal()` y `close()`, `aria-labelledby`, y el manejo de `(cancel)`.

## 4. Plantilla

- Estructura: `<main class="pagina">` → encabezado con `← Dashboard` y acciones → mensajes → contenido.
- Estados obligatorios: cargando (`role="status"`), error (`role="alert"` con botón **Reintentar**), vacío (texto explicativo) y con datos.
- Control flow `@if` / `@for (...; track x.id)`. Nada de `*ngIf` ni `*ngFor`.
- Fechas con `DatePipe` y montos con `CurrencyPipe` en CLP (`'CLP':'symbol-narrow':'1.0-0'`). Estados de orden con etiqueta legible.

## 5. Ruta (`src/app/app.routes.ts`)

```ts
{
  path: 'reports',
  component: PaginaReports,
  canActivate: [protegerPorRol],
  data: { roles: ['Admin'] },
},
```

- Siempre `protegerPorRol` con `data.roles` explícito. Agrégala **antes** del comodín `**`.
- Roles del caso: `/reports` → Admin; `/audit` → Admin y Auditor. Si usas `Auditor`, agrégalo también en `etiquetaRol()` de `auth.service.ts` y en la navegación del dashboard.
- Agrega el enlace en `dashboard.html`, visible solo para los roles permitidos.

## 6. Tests (obligatorios)

En `<nombre>.spec.ts`, con Vitest:
- Mock de `ServicioApi` y `ServicioAutenticacion` con `vi.fn()` en `useValue`, y `provideRouter([])`.
- Si hay `<dialog>`, copia el polyfill de `showModal`/`close` de `workorders.spec.ts`.
- Casos mínimos: carga correcta muestra datos, error HTTP muestra el mensaje y conserva el formulario o los datos, lista vacía, y acciones ocultas para un rol sin permiso.
- En `app.routes.spec.ts`: un `it.each` con los roles permitidos que entran y otro con un rol rechazado que termina en `/acceso-denegado` **sin llamar a la API** (ver la prueba existente de `/catalog`).
- Nunca llames a Entra, al Gateway ni a URLs reales.

## 7. Cierre

1. `npm test -- --watch=false` en verde.
2. `npm run build -- --configuration production` sin errores ni warnings de budget.
3. Resumen al usuario: archivos tocados, endpoints que usa, qué quedó pendiente del backend o del Gateway (CORS, rutas) y qué **no** se probó contra el entorno real.
4. Commit sugerido: `feat(frontend): <descripción>` en una rama `feature/...`. No hagas push a `main`.
