---
name: digitalfix-design-system
description: Tokens SCSS, estilos globales y componentes UI compartidos de DigitalFix. Úsala siempre que vayas a escribir o modificar estilos (.scss), maquetar una pantalla, crear un componente visual (botón, tabla, tarjeta, modal, badge de estado, encabezado) o eliminar estilos duplicados entre páginas.
---

# Design system DigitalFix

Objetivo: que todas las pantallas se vean como una sola aplicación y que el SCSS de cada página
contenga solo lo propio de esa página. Hoy cada página redefine `.btn`, `.pagina`, `.encabezado-pagina`,
tablas y colores. Esta skill define **hacia dónde migrar** y **cómo usar** lo que ya exista.

## Precedencia

Si está instalado el plugin `frontend-design` u otra skill de diseño general, esta skill manda: úsalas para ideas de dirección visual, pero tokens, componentes, contraste AA y el carácter de herramienta de operaciones salen de aquí. Cualquier cambio de paleta o tipografía se hace editando los tokens de la sección 1, nunca con valores sueltos en una página.

## 0. Antes de tocar estilos

1. Revisa si ya existe `src/styles/_tokens.scss` y `src/app/shared/ui/`.
   - Si existen, **úsalos**: no declares colores hex ni redefinas clases globales en una página.
   - Si no existen y la tarea es de estilos, propón crearlos primero (paso 1 y 2) como tarea separada,
     en su propio commit `refactor(frontend): ...`, antes de la funcionalidad.
2. Nunca cambies la apariencia de una pantalla existente "de pasada" en una tarea funcional.

## 1. Tokens (`src/styles/_tokens.scss`)

Variables CSS en `:root`, derivadas de la paleta real del proyecto. No inventes colores nuevos sin justificarlo.

```scss
:root {
  // Texto
  --df-texto: #172033;
  --df-texto-secundario: #475569;
  --df-texto-tenue: #64748b;
  // Superficies
  --df-fondo: #f1f5f9;
  --df-superficie: #ffffff;
  --df-superficie-alt: #f8fafc;
  --df-borde: #dbe3ed;          // unificar #dbe3ec → #dbe3ed
  --df-borde-control: #94a3b8;
  // Marca
  --df-primario: #2454a6;
  --df-primario-hover: #1c3f82;
  --df-primario-suave: #dbeafe;
  // Estados semánticos
  --df-exito: #166534;      --df-exito-suave: #dcfce7;
  --df-advertencia: #92400e; --df-advertencia-suave: #fef3c7;
  --df-peligro: #b91c1c;    --df-peligro-texto: #991b1b; --df-peligro-suave: #fee2e2;
  // Forma y espacio (escala de 4px)
  --df-radio-sm: 6px; --df-radio-md: 8px; --df-radio-lg: 12px; --df-radio-xl: 16px;
  --df-esp-1: 4px; --df-esp-2: 8px; --df-esp-3: 12px; --df-esp-4: 16px;
  --df-esp-5: 24px; --df-esp-6: 32px;
  --df-ancho-pagina: 1100px;
  --df-fuente: Arial, sans-serif;
}
```

## 2. Estilos globales (`src/styles.scss`)

`styles.scss` importa los tokens y define **una sola vez** lo que hoy está duplicado:

- `body`: fuente, color de texto y fondo.
- `.pagina` (contenedor de 1100 px), `.encabezado-pagina`, `.acciones-header`, `.volver`.
- Botones: `.btn`, `.btn-primario`, `.btn-secundario`, `.btn-peligro`, `:disabled` y `:focus-visible`.
- Mensajes: `.mensaje-error`, `.mensaje-exito`, `.advertencia`, `.estado-carga`.
- Formularios: `fieldset` en grid, `input/select/textarea` con `--df-borde-control` y foco visible.
- Tablas: `.tabla-contenedor` (overflow-x) y `.tabla`.
- Tarjetas: `.tarjeta`.

Al migrar una página: borra de su `.scss` las reglas que quedaron en global, verifica visualmente que
no cambió nada y corre `npm test -- --watch=false` y `npm run build`. El budget por componente es de
4 kB de aviso y 8 kB de error: el build de producción debe quedar **sin warnings de budget**.

## 3. Componentes compartidos (`src/app/shared/ui/`)

Standalone, sin lógica de negocio ni llamadas HTTP, con entradas por `input()` y salidas por `output()`.
Prefijo de selector `df-`. Créalos solo cuando haya al menos dos usos reales.

| Componente | Selector | Uso |
|---|---|---|
| Encabezado de página | `df-encabezado-pagina` | título, enlace "← Dashboard", slot de acciones (`ng-content`) |
| Badge de estado | `df-estado-orden` | `input estado: EstadoOrden` → etiqueta legible + color semántico |
| Diálogo | `df-dialogo` | envuelve `<dialog>` nativo: `aria-labelledby`, cierre con Esc, foco inicial |
| Estado vacío | `df-estado-vacio` | mensaje + acción opcional cuando la lista está vacía |
| Tarjeta KPI | `df-tarjeta-kpi` | valor, etiqueta y variación (para `/reports` y el dashboard de Admin) |

Colores del badge de estado (mantener consistencia en toda la app):

| Estado | Etiqueta | Fondo / texto |
|---|---|---|
| CREADA | Creada | `--df-superficie-alt` / `--df-texto-secundario` |
| ASIGNADA | Asignada | `--df-primario-suave` / `--df-primario` |
| EN_DESPLAZAMIENTO | En desplazamiento | `--df-advertencia-suave` / `--df-advertencia` |
| EN_EJECUCION | En ejecución | `--df-advertencia-suave` / `--df-advertencia` |
| CERRADA | Cerrada | `--df-exito-suave` / `--df-exito` |
| CANCELADA | Cancelada | `--df-peligro-suave` / `--df-peligro-texto` |

## 4. Reglas

- En páginas: solo `var(--df-*)`, nada de hex sueltos.
- Clases en español y en kebab-case, como las actuales (`.tabla-contenedor`, `.acciones-orden`).
- El color nunca es la única señal: el badge siempre lleva texto.
- Contraste AA mínimo (4.5:1 para texto normal). La paleta de arriba lo cumple sobre blanco; no la aclares.
- Responsive: debe funcionar desde 360 px. Tablas con `.tabla-contenedor` y formularios en una columna bajo 420 px.
- No agregues librerías de UI (Angular Material, Bootstrap, Tailwind) sin preguntar al usuario: cambia el peso del bundle (budget de 500 kB inicial) y el estilo de todo el proyecto.
- Iconos: si se necesitan, SVG inline con `aria-hidden="true"` y texto accesible al lado.
