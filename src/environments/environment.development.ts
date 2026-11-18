// Configuración para `npm start` (ng serve, configuración development).
// La API se llama en el mismo origen y proxy.conf.json la reenvía al BFF local (localhost:8080),
// así no hace falta API Gateway ni CORS en el BFF. La build de producción usa environment.ts.
export const environment = {
  production: false,

  // Mismo origen que la SPA: http://localhost:4200. El interceptor de MSAL adjunta el token a /api/*.
  apiGatewayUrl: window.location.origin,

  entra: {
    // Registro DigitalFix Frontend. http://localhost:4200 debe estar como redirect URI SPA.
    clientId: '0a57e0f7-1a4f-40f2-9011-eac64a4c49c6',

    // Tenant DigitalFix.
    tenantId: '762b016c-dc33-4db0-ad42-44f32afe71f4',

    authority: 'https://login.microsoftonline.com/762b016c-dc33-4db0-ad42-44f32afe71f4',

    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,

    // Permiso delegado expuesto por DigitalFix API.
    scopeApi: 'api://85329d90-58f8-4317-a820-452599b3b04c/access_as_user',
  },
};
