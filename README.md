# DigitalFix — Frontend

## Docker en EC2

Se incluye Dockerfile con compilación Angular y Nginx, soporte de rutas SPA y
health check. Ver [despliegue en EC2](docs/docker-ec2.md) para los comandos,
configuración HTTPS y registro del origen en Entra ID.

## Integración mínima de catálogo y órdenes

Catálogo y Órdenes consumen el BFF mediante HttpClient y MSAL Interceptor:
GET /api/catalog/services, GET/POST /api/workorders y GET /api/workorders/{id}.
La orden se crea con servicio, descripción y dirección; el backend obtiene el
solicitante del JWT. Los roles técnicos son Admin, Operador y Cliente.
Configurar apiGatewayUrl con la Invoke URL real y volver a desplegar Angular.
Los KPIs del dashboard todavía son ejemplos. Las referencias posteriores a
comunicación pendiente describen el estado previo a esta integración.

Interfaz web de DigitalFix para la gestión de mantenimiento eléctrico.

## Integrantes

- Ariel Molina.

- Lucas Ferrada.

## Estado actual

Proyecto Angular inicializado y ejecutado localmente.

La integración con MSAL y el inicio y cierre de sesión mediante
Microsoft Entra ID ya se encuentran implementados.

La comunicación con el BFF se implementará en una tarea independiente.

## Autorización en el frontend

- Obtención del access token para DigitalFix API mediante MSAL,
  solicitando el scope delegado `access_as_user`.
- Lectura de roles para mostrar las opciones correspondientes al usuario.
- Ruta `/administracion` protegida mediante sesión iniciada,
  rol `Admin` y presencia del scope `access_as_user`.
- Páginas de acceso denegado y error de autenticación.

Los roles definidos en Microsoft Entra ID son `Admin`, `Operador`
y `Cliente`.

Estas comprobaciones controlan la navegación del frontend.
La validación del JWT y la autorización de las solicitudes a la API
se implementarán en el BFF.

## Tecnologías

- Angular 21.

- TypeScript.

- SCSS.

- Node.js y npm.

- Microsoft Authentication Library (MSAL).

- Microsoft Entra ID.

## Requisitos

Versiones utilizadas para preparar el proyecto:

- Node.js 24.14.1.

- npm 11.11.0.

## Instalación

Desde la raíz del repositorio:

```powershell
npm ci
```

Este comando instala las dependencias utilizando las versiones

registradas en package-lock.json.

## Ejecución local

```powershell
npm start
```

Abre http://localhost:4200 en el navegador.

Al guardar cambios en el código, el servidor de desarrollo

actualiza la aplicación. Para detenerlo, presiona Ctrl + C.

## Compilación

```powershell
npm run build
```

Los archivos generados se guardan en dist/.

## Pruebas

```powershell
npm test -- --watch=false
```
### Verificaciones realizadas

- Compilación y pruebas automatizadas completadas correctamente.
- Inicio de sesión con un usuario real con rol `Admin`.
- Visualización del rol Administrador y acceso a `/administracion`.
- Pruebas automatizadas del guard: acceso permitido, rol insuficiente,
  ausencia de scope, sesión rechazada y fallo al consultar permisos.

Queda pendiente verificar con usuarios reales los roles `Operador`
y `Cliente`. Sus casos de rechazo en la ruta de administración
se comprobaron mediante pruebas automatizadas.

## Estructura principal

- src/app/: componentes, plantillas, estilos y configuración de la aplicación.

- public/: recursos estáticos.

- angular.json: configuración de ejecución y compilación.

- package.json: dependencias y comandos.

- package-lock.json: versiones exactas de las dependencias.

## Configuración y seguridad

La autenticación del frontend utiliza Microsoft Entra ID mediante MSAL.

Para desarrollo local, la aplicación registrada en Entra ID utiliza
http://localhost:4200 como URI de redirección de tipo SPA.

No incluir contraseñas ni secretos en el código del navegador.

La comunicación autenticada con el BFF se implementará en una tarea independiente.

## Flujo de trabajo

Cada tarea se desarrolla en una rama y se integra a main mediante

un Pull Request revisado y aprobado por otro integrante.
