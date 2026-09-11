# DigitalFix — Frontend

Interfaz web de DigitalFix para la gestión de mantenimiento eléctrico.

## Integrantes

- Ariel Molina.

- Lucas Ferrada.

## Estado actual

Proyecto Angular inicializado y ejecutado localmente.

La integración con MSAL y el inicio y cierre de sesión mediante
Microsoft Entra ID ya se encuentran implementados.

La comunicación con el BFF se implementará en una tarea independiente.

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