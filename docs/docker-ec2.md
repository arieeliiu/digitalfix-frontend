# Frontend en EC2 con Docker

El Dockerfile compila Angular con Node 24 y npm ci; la imagen final sirve el
contenido de dist/digitalfix-frontend/browser mediante Nginx en el puerto 80.
La URL de Gateway se incorpora desde src/environments/environment.ts al compilar.
Cambiarla requiere reconstruir la imagen; docker run -e no modifica el JavaScript.

## Construir y ejecutar

En la EC2 del frontend, desde la raíz del repositorio actualizado:

```bash
sudo docker build -t digitalfix-frontend:local .
sudo docker run -d --name digitalfix-frontend --restart unless-stopped -p 80:80 digitalfix-frontend:local
```

El puerto 80 del host debe estar libre. No hace falta publicar 4200.
Para reconstruir una versión posterior, primero compilar y luego reemplazar
solo el contenedor de este frontend:

```bash
sudo docker build -t digitalfix-frontend:local .
sudo docker stop digitalfix-frontend
sudo docker rm digitalfix-frontend
sudo docker run -d --name digitalfix-frontend --restart unless-stopped -p 80:80 digitalfix-frontend:local
```

## Comprobación de Nginx

```bash
sudo docker exec digitalfix-frontend nginx -t
sudo docker ps
curl -i http://localhost/healthz
curl -I http://localhost/dashboard
sudo docker logs --tail 50 digitalfix-frontend
```

healthz responde 200 con ok y /dashboard devuelve index.html con 200. Estas
comprobaciones demuestran que el servidor entrega archivos, no el login ni el BFF.

## HTTPS, Entra y Gateway

Este contenedor escucha HTTP en 80. Abrir 443 en el Security Group no configura
TLS ni instala un certificado. Para usar MSAL desde una dirección pública se
necesita HTTPS válido, por ejemplo un balanceador/proxy con certificado que
termine TLS y reenvíe al puerto 80 del contenedor.

El frontend toma redirectUri y postLogoutRedirectUri de window.location.origin.
Registrar el origen HTTPS real (ejemplo: https://app.tudominio.cl) en Entra ID:
DigitalFix Frontend → Authentication → Single-page application → Redirect URIs.
El registro debe coincidir con el origen donde se abre Angular. HTTP localhost
es una excepción de desarrollo; HTTP en una IP pública no sustituye HTTPS.

En Gateway, añadir ese origen HTTPS a CORS y permitir GET, POST, OPTIONS y los
headers Authorization y Content-Type. El preflight OPTIONS debe responder 2xx
sin JWT; en la última comprobación devolvía 401 y queda pendiente corregirlo.

El navegador llama directamente a:
https://9ijsvq2s6j.execute-api.us-east-1.amazonaws.com
Nginx sirve Angular; no funciona como proxy del BFF.

## Referencias

- https://docs.docker.com/build/building/multi-stage/
- https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
