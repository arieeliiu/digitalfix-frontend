---
name: digitalfix-revision-ui
description: Checklist de revisión de UI para DigitalFix antes de dar por terminado un cambio de frontend o al revisar un PR. Cubre accesibilidad, estados de carga, error y vacío, permisos por rol, responsive, consistencia con el design system, budgets y tests. Úsala cuando el usuario pida revisar, auditar o pulir una pantalla, o al terminar cualquier cambio visible en la UI.
---

# Revisión de UI DigitalFix

Revisa solo los archivos del cambio (`git diff --name-only main...HEAD` o lo indicado por el usuario).
Reporta los hallazgos ordenados por severidad, cada uno con archivo:línea, el problema y la corrección propuesta.
**No corrijas sin que el usuario lo pida.** Si lo pide, corrige y vuelve a correr los tests.

Severidades: **Bloqueante** (rompe seguridad, datos o la build), **Importante** (accesibilidad, un estado faltante, regresión visual) y **Menor** (consistencia o estilo).

## 1. Seguridad y datos (bloqueante)

- [ ] Ninguna llamada fuera de `environment.apiGatewayUrl + /api/...`. `protectedResourceMap` sin comodines.
- [ ] No se envía `solicitanteId` ni identidad desde el frontend. No hay tokens, `console.log` de claims ni secretos.
- [ ] Rutas nuevas con `protegerPorRol` y `data.roles`. Ocultar un botón no se trata como control de acceso.
- [ ] No se modifica stock ni estado de forma local "optimista" sin la respuesta del backend.

## 2. Estados de la pantalla

- [ ] Cargando: mensaje con `role="status"` y acciones deshabilitadas (`ocupado()`).
- [ ] Error: mensaje en español con `role="alert"`, vía `mensajeErrorApi` o `error-<dominio>`, más una forma de reintentar.
- [ ] Vacío: texto explicativo y no una tabla vacía.
- [ ] 409: invita a actualizar. 401: invita a reiniciar sesión.
- [ ] Doble clic o doble envío no generan dos requests (se usa guard `if (ocupado()) return`).
- [ ] Ante un error al guardar, el formulario conserva lo escrito.

## 3. Accesibilidad (WCAG 2.1 AA)

- [ ] Cada control tiene `<label for>` o `aria-label`. Los botones tienen `type="button"` salvo el submit.
- [ ] Los `<dialog>` tienen `aria-labelledby`, se cierran con Esc, el foco entra al abrir y vuelve al disparador al cerrar.
- [ ] Hay `:focus-visible` visible en botones, enlaces e inputs.
- [ ] Contraste ≥ 4.5:1. El estado no se comunica solo por color.
- [ ] Hay un solo `<h1>` por página, una jerarquía de headings correcta y tablas con `<th scope>`.
- [ ] Se puede navegar con teclado de inicio a fin sin trampas de foco.

## 4. Consistencia visual (ver `digitalfix-design-system`)

- [ ] No hay colores hex nuevos en SCSS de página. Se usan los tokens `--df-*` si existen o la paleta documentada en `CLAUDE.md` si aún no.
- [ ] No se redefinen `.btn`, `.pagina`, `.encabezado-pagina` ni `.mensaje-error` si ya son globales.
- [ ] Los estados de orden aparecen con etiqueta legible y el color del badge definido.
- [ ] Los montos van en CLP sin decimales y las fechas con `DatePipe`.
- [ ] Los textos están en español, con tildes, y son consistentes ("Orden", no "Ticket"; "Repuesto", no "Pieza").

## 5. Responsive

- [ ] El diseño funciona entre 360 px y 1440 px. No hay scroll horizontal de la página: las tablas van dentro de `.tabla-contenedor`.
- [ ] Los formularios y la grilla de repuestos pasan a una columna bajo 420 px.
- [ ] Los textos largos (correos, direcciones) usan `overflow-wrap: anywhere`.

## 6. Código Angular

- [ ] Standalone, `inject()`, signals/`computed`, `@if`/`@for` con `track`.
- [ ] No hay `any`. Los tipos del DTO están en `api.service.ts`.
- [ ] No quedan subscripciones manuales sin cerrar: se usa `firstValueFrom` o `takeUntilDestroyed`.
- [ ] La lógica de negocio que pertenece al backend (transiciones, stock) no se duplica más allá de lo necesario para la UI.

## 7. Verificación

Ejecuta y reporta el resultado real:

```powershell
npm test -- --watch=false
npm run build -- --configuration production
```

- [ ] Los tests quedan en verde y hay tests nuevos para los estados y roles agregados.
- [ ] La build queda sin errores y **sin warnings de budget** (4 kB de aviso y 8 kB de error por componente, 500 kB inicial).

Cierra con un veredicto (**Listo**, **Listo con observaciones** o **Requiere cambios**) y deja claro qué no pudiste
verificar, por ejemplo el login real con Entra, CORS en el Gateway o la vista en un navegador real.
