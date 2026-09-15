# DigitalFix — Frontend

Angular 21, TypeScript y MSAL. Integrantes: Ariel Molina y Lucas Ferrada.

## Ejecución local

```powershell
 docker compose up -d --build
```

Abrir http://localhost. Docker construye Angular con Node 24 y sirve la SPA con
Nginx, publicando 80:80. Registrar ese origen como redirect URI SPA en Entra.

## Integración

La API configurada es https://9ijsvq2s6j.execute-api.us-east-1.amazonaws.com.
MSAL Interceptor solicita access_as_user y agrega Bearer a sus rutas /api/*.
Catálogo y órdenes consumen datos reales mediante Gateway → BFF → microservicios.
El POST solo envía servicioId, descripcion y direccion. El BFF obtiene oid del JWT.
Los roles técnicos son Admin, Operador y Cliente; todos consultan sus propias órdenes.
Los KPIs del dashboard siguen siendo ejemplos. /administracion redirige a /dashboard.
Las comprobaciones de interfaz no sustituyen la validación del BFF.

Ver [guía completa](../digitalfix-ms-bff/DEPLOYMENT.md),
[Docker local](docs/docker-ec2.md) y [resultados](../digitalfix-ms-bff/VERIFICATION.md).

## Desarrollo y verificación

Con Node 24 y npm:

```powershell
 npm ci
 npm test -- --watch=false
 npm run build -- --configuration production
```

La configuración pública se encuentra en src/environments/environment.ts.
No incluir secretos ni tokens. Cambiar la URL requiere reconstruir.

## Flujo de trabajo

Integrar cambios mediante Pull Request revisado y aprobado por otro integrante.