# Primera conexión: Angular → HTTP API Gateway → BFF

## Estado

Angular registra HttpClient y MsalInterceptor. El dashboard consulta GET /api/perfil
después de cargar los permisos, cuando apiGatewayUrl está configurada.
El catálogo, órdenes y KPIs todavía usan datos simulados.
Pendientes: URL real de Gateway, integración al BFF y prueba con Entra real.

## 1. Configuración de Angular

En src/environments/environment.ts, completar apiGatewayUrl con la Invoke URL.
Ejemplo ilustrativo: https://<api-id>.execute-api.<region>.amazonaws.com/dev
Para el stage $default, no agregar /$default. No agregar /api al final.
Al cambiar esta configuración hay que reconstruir/desplegar el frontend.

El interceptor solicita environment.entra.scopeApi y adjunta Authorization: Bearer
solo a las rutas /api/* de esa URL. No usar ID tokens ni claves AWS en Angular.
Si la URL está vacía, no se hacen consultas y no se afirma que haya conexión.

## 2. Configuración en AWS

Usar API Gateway HTTP API con un JWT Authorizer:

- Identity source: $request.header.Authorization
- Issuer: https://login.microsoftonline.com/762b016c-dc33-4db0-ad42-44f32afe71f4/v2.0
- Audience: 85329d90-58f8-4317-a820-452599b3b04c
- Ruta inicial: GET /api/perfil
- Authorization scope de la ruta: access_as_user

La audiencia es el Client ID de DigitalFix API, coherente con el BFF y tokens v2.
El scope que solicita MSAL conserva api://<client-id>/access_as_user.

CORS de la HTTP API:

- Allowed origins: http://localhost:4200 y el origen HTTPS real del frontend cuando exista.
- Allowed methods iniciales: GET, OPTIONS.
- Allowed headers: Authorization, Content-Type.
- Allow credentials: desactivado; se usa Bearer, no cookies.

API Gateway maneja el preflight con CORS configurado. Si se utiliza una ruta
$default autorizada, agregar OPTIONS /{proxy+} sin autorizador según la guía AWS.
Agregar métodos de escritura a CORS cuando se conecten las operaciones de negocio.

## 3. Integración hacia el BFF

El BFF ya valida JWT y publica GET /api/perfil. Asociar la ruta a una integración
que alcance ese endpoint y conserve Authorization. No apuntar a localhost:
desde AWS, localhost no representa el equipo del desarrollador.

Para un BFF privado en EC2: HTTP API → VPC Link → listener de balanceador interno
→ BFF:8080. Configurar red, reglas de acceso y health checks acordes al despliegue.
El BFF no tiene un endpoint de salud público; no asumir que GET / devuelve 200.
En integración privada, usar overwrite:path = $request.path para evitar que
el stage termine como /dev/api/perfil en Spring.

Conservar la validación JWT en Spring Security. No hace falta añadir un SDK AWS
al BFF para recibir solicitudes. Catalog y Workorders no son necesarios para
esta primera prueba de perfil.

## 4. Verificación

1. Configurar y desplegar la ruta e integración; comprobar CORS.
2. Iniciar Angular e iniciar sesión con Entra.
3. Abrir /dashboard y revisar Network: GET <Invoke URL>/api/perfil debe incluir Bearer.
4. Esperar HTTP 200 y {"mensaje":"Acceso autenticado a DigitalFix."}.
5. Sin token debe rechazarse con 401; con token válido sin scope debe rechazarse.
6. Antes de integrar administración, comprobar también 403 para usuario sin Admin.

Diagnóstico: 401 → token, issuer o audience; 403 → scope/rol; 404 → ruta/stage;
errores de red/CORS → preflight, origen o conectividad; 5xx → integración/BFF.
No publicar ni registrar tokens al compartir evidencias.

Pruebas locales: npm test -- --watch=false y npm run build.
Las pruebas de HttpClient usan el interceptor real y tokens simulados;
no sustituyen la verificación contra AWS y Entra.

## Referencias

- https://learn.microsoft.com/en-us/entra/msal/javascript/angular/msal-interceptor
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html
