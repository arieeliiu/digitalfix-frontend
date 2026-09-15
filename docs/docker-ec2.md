# Frontend local con Docker y Nginx

El nombre histórico de este archivo se conserva para no romper enlaces.
El frontend se ejecuta en el equipo local mediante http://localhost.

```powershell
 docker compose up -d --build
 docker compose exec frontend nginx -t
 curl.exe -i http://localhost/healthz
 curl.exe -I http://localhost/workorders
```

El compose publica 80:80. Registrar http://localhost como redirect URI SPA en
Entra; redirectUri y postLogoutRedirectUri toman window.location.origin.
Nginx sirve los archivos Angular y permite recargar rutas SPA.
El navegador envía las solicitudes API directamente a Gateway con MSAL.

Para detenerlo: `docker compose down`. Para actualizar: `docker compose up -d --build`.
El puerto 80 debe estar libre y Docker Desktop debe estar iniciado con Linux containers.
La URL de Gateway se incorpora al compilar, no se modifica con docker run -e.

Ver [despliegue completo](../../digitalfix-ms-bff/DEPLOYMENT.md).