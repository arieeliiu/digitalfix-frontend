# DigitalFix — Frontend

Frontend web de DigitalFix desarrollado con Angular 21, TypeScript y Microsoft Authentication Library (MSAL).

## Integrantes

- Ariel Molina
- Lucas Ferrada

## Tecnologías

- Angular 21
- TypeScript
- MSAL Angular
- Microsoft Entra ID
- HTML y CSS
- Nginx
- Docker

## Arquitectura

El frontend se comunica únicamente con AWS API Gateway.

El flujo actual de la aplicación es:

```text
Angular
   ↓
Microsoft Entra ID
   ↓
Access Token JWT
   ↓
AWS API Gateway
   ↓
BFF
   ├──→ Catalog
   └──→ Workorders
            ↓
          Catalog
   ↓
Oracle RDS
```

El frontend no accede directamente a los microservicios Catalog o Workorders.

## Autenticación

La autenticación se realiza mediante Microsoft Entra ID utilizando MSAL.

La aplicación solicita el scope:

```text
api://85329d90-58f8-4317-a820-452599b3b04c/access_as_user
```

El `MsalInterceptor` agrega automáticamente el access token como:

```http
Authorization: Bearer <token>
```

a las solicitudes dirigidas hacia la API de DigitalFix.

La configuración pública de Entra ID y API Gateway se encuentra en:

```text
src/environments/environment.ts
```

Los identificadores de aplicación y tenant no son secretos.

No deben almacenarse contraseñas, tokens ni credenciales privadas en el repositorio.

## Roles

Actualmente DigitalFix utiliza los siguientes roles:

```text
Admin
Operador
Cliente
```

### Admin

El administrador tiene acceso a todas las funcionalidades implementadas en esta etapa.

Puede:

- consultar órdenes de trabajo;
- crear órdenes;
- actualizar órdenes;
- cambiar su estado;
- eliminar órdenes cuando corresponde;
- consultar servicios;
- crear servicios;
- editar servicios;
- eliminar servicios;
- consultar repuestos;
- crear repuestos;
- editar repuestos;
- eliminar repuestos.

### Operador

El operador puede acceder al módulo de órdenes y consultar el catálogo.

Las operaciones disponibles están limitadas por las reglas de autorización implementadas en el BFF.

En el catálogo dispone de acceso de lectura, sin las acciones administrativas de creación, edición o eliminación.

### Cliente

El cliente puede acceder al módulo de órdenes de trabajo y operar sobre sus propias órdenes según las reglas definidas por el backend.

No tiene acceso al módulo administrativo de catálogo.

## Rutas del frontend

| Ruta | Acceso |
|---|---|
| `/` | Pública |
| `/dashboard` | Usuario autenticado |
| `/workorders` | Admin, Operador y Cliente |
| `/catalog` | Admin y Operador |
| `/error-autenticacion` | Manejo de errores de autenticación |
| `/acceso-denegado` | Acceso sin permisos |

Las rutas antiguas:

```text
/inicio
/administracion
```

redirigen actualmente a:

```text
/dashboard
```

## Dashboard

Después de iniciar sesión, el usuario accede al dashboard principal.

Desde este módulo se muestran las opciones disponibles según el rol autenticado.

Los controles visuales del frontend facilitan la navegación, pero la autorización definitiva se realiza en el BFF.

## Órdenes de trabajo

El módulo de órdenes consume datos reales desde:

```text
Angular
→ API Gateway
→ BFF
→ Workorders
→ Oracle RDS
```

Actualmente permite, según el rol:

- listar órdenes;
- crear órdenes;
- consultar información de una orden;
- actualizar órdenes;
- cambiar estados;
- eliminar órdenes cuando las reglas de negocio lo permiten;
- asignar técnico;
- asociar repuestos durante la asignación.

Para crear una orden, el frontend envía principalmente:

```text
servicioId
descripcion
direccion
```

El identificador del solicitante no se ingresa manualmente en el frontend.

El BFF obtiene el `oid` del usuario autenticado desde el JWT y lo utiliza como identidad del solicitante.

## Estados de las órdenes

El flujo implementado por el backend es:

```text
CREADA
→ ASIGNADA
→ EN_DESPLAZAMIENTO
→ EN_EJECUCION
→ CERRADA
```

También existe el estado:

```text
CANCELADA
```

Las transiciones válidas son controladas por Workorders.

## Catálogo

El módulo de catálogo consume:

```text
Angular
→ API Gateway
→ BFF
→ Catalog
→ Oracle RDS
```

El catálogo contiene dos recursos principales:

```text
Servicios
Repuestos
```

### Servicios

El administrador puede:

- listar;
- crear;
- editar;
- eliminar.

Cada servicio contiene información como:

```text
nombre
descripcion
tarifa
```

### Repuestos

El administrador puede:

- listar;
- crear;
- editar;
- eliminar.

Cada repuesto contiene información como:

```text
nombre
descripcion
stock
```

El operador puede consultar el catálogo, pero no dispone de las acciones CRUD administrativas.

## Integración con stock

Al asignar una orden se pueden seleccionar repuestos y cantidades.

El frontend envía esta información al BFF y el flujo continúa mediante:

```text
Frontend
   ↓
BFF
   ↓
Workorders
   ↓
Catalog
   ↓
Oracle RDS
```

Catalog valida la disponibilidad y realiza el descuento de stock.

El frontend no modifica directamente el stock almacenado en la base de datos.

## API Gateway

La API configurada actualmente es:

```text
https://9ijsvq2s6j.execute-api.us-east-1.amazonaws.com
```

Todas las solicitudes de negocio del frontend utilizan esta URL como punto de entrada al backend.

La configuración CORS permite actualmente las operaciones utilizadas por la aplicación:

```text
GET
POST
PUT
DELETE
OPTIONS
```

## Ejecución local con Angular

Instalar las dependencias:

```powershell
npm ci
```

Iniciar el servidor de desarrollo:

```powershell
npm start
```

Abrir:

```text
http://localhost:4200
```

Este origen debe estar registrado como Redirect URI de tipo SPA en Microsoft Entra ID.

## Ejecución con Docker

Construir y levantar el frontend:

```powershell
docker compose up -d --build
```

Abrir:

```text
http://localhost
```

Docker construye Angular utilizando Node y sirve la SPA mediante Nginx en el puerto 80.

Si se utiliza este origen para autenticación, también debe estar registrado como Redirect URI SPA en Entra ID.

## Pruebas

Con Node y npm instalados:

```powershell
npm ci
npm test -- --watch=false
```

## Build de producción

Ejecutar:

```powershell
npm run build -- --configuration production
```

La configuración utilizada para API Gateway y Microsoft Entra ID se encuentra en:

```text
src/environments/environment.ts
```

Cambiar estos valores requiere reconstruir la aplicación.

## Manejo de errores

El frontend presenta mensajes específicos para los principales errores de comunicación y autorización.

Entre ellos:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
5xx Server Error
```

También se manejan errores de conexión cuando la API o algún servicio requerido no está disponible.

## Estado actual

En la implementación actual se encuentra funcionando el flujo:

```text
Inicio de sesión con Entra ID
→ Angular obtiene JWT
→ solicitud a API Gateway
→ BFF valida identidad y permisos
→ comunicación con Catalog o Workorders
→ persistencia en Oracle RDS
→ respuesta al frontend
```

Se encuentran operativos:

- autenticación mediante MSAL;
- control de acceso por roles;
- dashboard;
- CRUD de órdenes de trabajo;
- cambios de estado;
- asignación de técnico;
- asociación de repuestos;
- CRUD de servicios;
- CRUD de repuestos;
- consulta y actualización real de datos almacenados en Oracle RDS.

## Flujo de trabajo

## Evaluación 2: contactos

La creación admite correo del cliente y la asignación correo del técnico, ambos
opcionales y validados hasta 254 caracteres. Sin correo del técnico se advierte
que no se enviará el ticket de despacho. Los correos no sustituyen al `oid` de Entra.

El detalle permite corregir contactos incluso en órdenes cerradas: propietario,
su correo; Admin/Operador, ambos. Los campos no modificados se omiten del PATCH;
vaciar un campo lo elimina. La autorización definitiva sigue en BFF/Workorders.
Esta operación no cambia estado/stock ni reenvía mensajes anteriores.

Validación del Paso 6: `npm test -- --watch=false` (109 aprobadas) y `npm run build`
correcto. Se mantienen MSAL, interceptor y guards; sus pruebas usan dobles locales,
no una sesión real Entra/AWS. Build con advertencias: inicial 643,66 kB frente a
500 kB y estilos de órdenes 4,11 kB frente a 4 kB. No se relajaron los presupuestos.
Antes de desplegar, API Gateway debe admitir PATCH y su preflight CORS; consultar
la guía del Paso 6 en `digitalfix-infra`.

Los cambios del proyecto se desarrollan en ramas independientes y se integran a `main` mediante Pull Request.

La rama `main` representa la versión estable utilizada para la entrega.
