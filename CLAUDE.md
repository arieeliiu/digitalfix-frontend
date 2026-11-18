# DigitalFix Frontend — contexto para Claude Code

SPA Angular de DigitalFix (caso semestral "Caso 6 – DigitalFix"): órdenes de trabajo de mantención eléctrica.
Equipo: Ariel Molina y Lucas Ferrada. Idioma: **español** en UI, nombres de dominio, comentarios, tests y commits.
El backend vive en la carpeta hermana `../digitalfix-backend` (ver su `CLAUDE.md` para arquitectura, roles y reglas de dominio).

## Estado actual

- **Entorno local verificado** (18/11/2026): `npm start` → proxy `/api` → BFF local :8080 → Catalog :8081 y Workorders :8082 → RDS. Login Entra real, `/api/perfil` 200, catálogo y repuestos funcionando.
- Rama `feature/entorno-local`, **sin commitear**: `proxy.conf.json`, `environment.development.ts`, `fileReplacements` y `proxyConfig` en `angular.json`, `baseUrl()` que acepta HTTP solo en localhost (con tests en `api.service.spec.ts`) y el tipado `querySelectorAll<HTMLButtonElement>` en `workorders.spec.ts`, que arregla un error de compilación que ya estaba en `main`. Commitear esto **antes** de empezar el rediseño, para no mezclarlo.
- Existe la rama `feat/nuevo-diseño` (igual a `main`, sin commits propios) para el rediseño. Crearla de nuevo desde `feature/entorno-local` una vez commiteado, o mergear `main` actualizado, para que tenga el entorno local.
- La API Gateway de `environment.ts` (`9ijsvq2s6j`) era de la cuenta anterior y probablemente ya no existe. No la cambies hasta el despliegue: en local no se usa.
- Desde Linux/WSL `git status` marca casi todo como modificado por CRLF; usa `git diff --ignore-cr-at-eol`.

## Stack

- Angular 21 con standalone components, **zoneless** (no hay `zone.js`), signals y control flow (`@if`, `@for`).
- MSAL Angular 6 / msal-browser 5 contra Microsoft Entra ID.
- Formularios template-driven (`FormsModule` + `ngModel`). Modales con `<dialog>` nativo.
- SCSS por componente. `src/styles.scss` está vacío.
- Tests: Vitest + jsdom con el builder `@angular/build:unit-test`. Prettier (100 col, comillas simples, parser angular en HTML). Indentación de 2 espacios.
- TypeScript `strict` y `strictTemplates`.

## Comandos

```powershell
npm ci
npm start                                 # http://localhost:4200, API vía proxy.conf.json al BFF local :8080
npm test -- --watch=false                 # correr SIEMPRE antes de dar una tarea por terminada
npm run build -- --configuration production
docker compose up -d --build              # Nginx en http://localhost
```

## Estructura

```
src/app/
  app.config.ts        providers: router, HttpClient + MsalInterceptor, MSAL, APP_INITIALIZER (handleRedirect)
  app.routes.ts        rutas y roles exigidos (data.roles)
  config/msal.config.ts  instancia MSAL, interceptor, guard config
  guards/roles.guard.ts  protegerPorRol: MsalGuard + cargarAutorizacion() + rol + scope access_as_user
  services/
    auth.service.ts    ServicioAutenticacion: login/logout, roles y permisos (signals) leídos del access token
    api.service.ts     ServicioApi + interfaces de DTOs (OrdenTrabajo, ServicioCatalogo, RepuestoCatalogo, CambioEstado...)
    error-api.ts / error-catalogo.ts   HttpErrorResponse → mensaje en español
  pages/<pagina>/      un componente por pantalla: <pagina>.ts / .html / .scss / .spec.ts
environments/environment.ts   apiGatewayUrl + datos públicos de Entra (no son secretos)
environments/environment.development.ts   `npm start`: apiGatewayUrl = mismo origen; proxy.conf.json → BFF local
```

Componentes de página con prefijo `Pagina` (`PaginaWorkOrders`, `PaginaCatalog`) y servicios con prefijo `Servicio`.

## Rutas actuales

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | PaginaAcceso | Pública (botón "Iniciar sesión con Microsoft") |
| `/dashboard` | PaginaDashboard | `MsalGuard` (cualquier autenticado) |
| `/workorders` | PaginaWorkOrders | Admin, Operador, Cliente |
| `/catalog` | PaginaCatalog | Admin, Operador (Operador solo lectura) |
| `/error-autenticacion`, `/acceso-denegado` | Páginas de error | Públicas |

`/inicio` y `/administracion` redirigen a `/dashboard`. `**` redirige a `/`.

Pendientes del caso: `/reports` (Admin: KPIs) y `/audit` (Admin y Auditor: timeline con filtros), además del rol **Auditor**.
El dashboard debe diferenciar el contenido por rol: Admin ve KPIs de la red, Operador órdenes por asignar o en terreno, Cliente sus últimas órdenes.

## Autenticación y API (no romper)

- El frontend **solo** llama a `environment.apiGatewayUrl` + `/api/...`. Nunca a microservicios directos.
- En desarrollo (`npm start`) esa URL es `http://localhost:4200` y el proxy de Angular reenvía `/api` al BFF local. `baseUrl()` acepta HTTP **solo** en `localhost`/`127.0.0.1`; fuera de eso exige HTTPS. Backend local: BFF, Catalog y Workorders corriendo en el IDE contra la RDS (ver *Desarrollo local* en `../digitalfix-backend/CLAUDE.md`).
- `MsalInterceptor` adjunta el Bearer únicamente a `${apiGatewayUrl}/api/*` (`strictMatching`). **Nunca** poner un comodín global en `protectedResourceMap`.
- Scope: `api://85329d90-58f8-4317-a820-452599b3b04c/access_as_user`. Cache en `sessionStorage`. Interacción por Redirect.
- Roles (`Admin`, `Operador`, `Cliente`) se leen del access token solo para **adaptar la UI**. La autorización real la hace el BFF: no duplicar reglas de negocio ni confiar en el frontend para seguridad.
- La identidad (`solicitanteId`) la pone el BFF a partir del `oid`. El frontend **nunca** envía ni pide ingresar `solicitanteId`.
- Tras cada login o recarga, el guard llama a `cargarAutorizacion()`. Un fallo de consulta va a `/error-autenticacion` y un rol insuficiente a `/acceso-denegado`.

## Reglas de dominio que afectan la UI

- Estados: `CREADA → ASIGNADA → EN_DESPLAZAMIENTO → EN_EJECUCION → CERRADA`, más `CANCELADA` desde cualquier estado no final. La UI ofrece solo el siguiente estado válido (`estadosDisponibles`) y Workorders vuelve a validar.
- Crear exige `servicioId`, `descripcion` (máx. 1000), `direccion` (máx. 300) y `emailContacto` (máx. 254).
- Pasar a ASIGNADA exige `tecnicoId`, `emailTecnico` y opcionalmente repuestos con cantidades enteras positivas. El stock lo descuenta Catalog, nunca el frontend.
- Solo Admin y Operador cambian estados (`puedeGestionarEstado`). Solo Admin escribe en el catálogo (`esAdmin`).
- Mostrar estados con etiquetas legibles ("En desplazamiento"), no el enum crudo.
- Errores HTTP: usar `mensajeErrorApi` / `error-catalogo` (400, 401, 403, 404, 409 y 5xx con mensaje en español). 409 significa que la orden cambió y hay que actualizar.
- Contratos de la API: ver interfaces en `api.service.ts` y el README del BFF (`../digitalfix-backend/digitalfix-ms-bff/README.md`). Si cambia un DTO en el BFF, actualizar la interfaz aquí.

## Convenciones de código

- Componentes standalone, `inject()` en lugar de constructor, estado con `signal`/`computed`, miembros usados por la plantilla como `protected readonly`.
- Llamadas HTTP en `ServicioApi` (Observables). En páginas se consumen con `firstValueFrom` y `try/catch`.
- Indicadores de carga y error por operación (`cargando`, `guardando`, `error`, `mensaje`). Deshabilitar acciones mientras `ocupado()`.
- Accesibilidad: `label for`, `role="status"` / `role="alert"`, `aria-labelledby` en diálogos. Mantener esto en código nuevo.
- Comentarios breves en español que expliquen el **porqué**.
- Tests en `*.spec.ts` junto al componente. Mockear `ServicioApi` y `ServicioAutenticacion` con `vi.fn()` y usar el polyfill de `HTMLDialogElement` que ya está en los specs. Nunca llamar a Entra ni al Gateway real en tests.

## Diseño y UI

**Estado actual**


- No hay design system ni componentes compartidos (layout, navbar, botón, tabla, modal). Cada página redefine `.btn`, tarjetas, tablas y colores en su propio SCSS: hay duplicación.
- Paleta usada: texto `#172033`, fondo `#f1f5f9`, primario `#2454a6`, borde `#dbe3ec`, peligro `#b91c1c`. Fuente Arial.
- Budget de estilos por componente: 4 kB de aviso y 8 kB de error (`angular.json`). `workorders.scss` y `catalog.scss` son grandes: al agregar estilos, preferir mover lo común a estilos globales o tokens antes que crecer el SCSS de la página.
**Dirección del rediseño**

- Es una **herramienta de operaciones** (órdenes, stock, técnicos en terreno), no una landing: prioriza densidad de información clara, escaneo rápido de tablas y estados visibles. Nada de héroes grandes, gradientes ni animaciones decorativas.
- Orden de trabajo: 1) tokens y estilos globales, 2) componentes compartidos (`shared/ui`), 3) migrar páginas una por una (dashboard, catálogo, órdenes), cada paso en su propio commit y con tests en verde.
- No cambiar comportamiento, textos de dominio, validaciones ni llamadas a la API durante el rediseño. Los specs existentes buscan elementos por `id`, `role`, `label` y texto: conservarlos o actualizar el spec en el mismo commit.
- Sin librerías de UI nuevas (Material, Tailwind, Bootstrap) salvo que el usuario lo pida. Fuente: se puede cambiar Arial por una de Google Fonts si se decide en el paso 1.

## Skills y herramientas

**Del proyecto (`.claude/skills/`), mandan sobre cualquier otra:**

- `digitalfix-design-system`: tokens `--df-*`, estilos globales y componentes `src/app/shared/ui/`. Usar al tocar cualquier `.scss` o maquetar.
- `digitalfix-nueva-pagina`: receta para pantallas y endpoints nuevos (ServicioApi → página → ruta con rol → specs).
- `digitalfix-revision-ui`: checklist antes de cerrar un cambio de UI o revisar un PR.

**Externas recomendadas** (las instala el usuario; no asumir que están):

- Plugin oficial `frontend-design` de Anthropic: `/plugin marketplace add anthropics/claude-code` y `/plugin install frontend-design@claude-code-plugins`. Úsalo para proponer la dirección visual, pero sus preferencias (estéticas audaces, tipografía llamativa) quedan **subordinadas** a `digitalfix-design-system`, a la accesibilidad AA y al carácter de herramienta de operaciones.
- MCP de Angular CLI: `claude mcp add angular-cli -- npx -y @angular/cli mcp` (desde la carpeta del frontend). Da `search_documentation`, `get_best_practices`, `run_target` (build y test) y `devserver_start`. Úsalo para consultar documentación de **Angular 21** en vez de recordarla.
- Buenas prácticas oficiales: <https://v21.angular.dev/ai/develop-with-ai>. Ojo: la versión actual de angular.dev ya habla de Angular 22 (`@Service`, OnPush por defecto, Signal Forms); **este proyecto es Angular 21**, así que no apliques APIs de la 22.

**Choques conocidos con esas guías** (gana lo que ya usa el proyecto, salvo que el usuario pida migrar):

| Guía general | Este proyecto | Qué hacer |
|---|---|---|
| Reactive o Signal Forms | Template-driven con `ngModel` | Mantener template-driven en el rediseño |
| `input()` / `output()` | Páginas sin inputs | Usarlos en los componentes nuevos de `shared/ui` |
| Lazy-load de rutas | Rutas cargadas de forma directa | No cambiar en el rediseño; proponerlo aparte |
| `host: {}` en vez de `@HostListener` | No se usan | Usar `host: {}` en código nuevo |

## Git y despliegue

- Repo `github.com/arieeliiu/digitalfix-frontend`. Ramas `feature/…` o `fix/…`. Commits convencionales en español: `feat(frontend): …`, `fix(frontend): …`, `test(frontend): …`.
- **Los PR y merges los hace el usuario**: nunca hacer push a `main` ni mergear.
- `environment.ts` contiene solo IDs públicos. Nunca agregar secretos, tokens ni contraseñas.
- Producción: Docker multi-stage (Node 24 → Nginx, `nginx.conf` con `/healthz`). Cambiar `environment.ts` requiere reconstruir.
- CORS en API Gateway permite GET, POST, PUT, DELETE y OPTIONS. `ServicioApi` ya usa **PATCH** para contactos (`/workorders/{id}/contactos`): el CORS del Gateway debe incluir PATCH o esa llamada falla. Ver `docs/` y `../digitalfix-backend/digitalfix-ms-bff/DEPLOYMENT.md`.
- No afirmar que algo funciona contra Entra o AWS reales si solo se probó con dobles en Vitest.
