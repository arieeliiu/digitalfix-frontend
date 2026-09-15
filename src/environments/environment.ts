// Configuración de DigitalFix para desarrollo local.
// Los identificadores son públicos; no son contraseñas ni secretos.
export const environment = {
  production: false,

  // Invoke URL de HTTP API, con stage si corresponde, sin /api al final.
  apiGatewayUrl: 'https://9ijsvq2s6j.execute-api.us-east-1.amazonaws.com',

  entra: {
    // Registro DigitalFix Frontend.
    clientId: '0a57e0f7-1a4f-40f2-9011-eac64a4c49c6',

    // Tenant DigitalFix.
    tenantId: '762b016c-dc33-4db0-ad42-44f32afe71f4',

    // Directorio que realizará la autenticación.
    authority: 'https://login.microsoftonline.com/762b016c-dc33-4db0-ad42-44f32afe71f4',

    // Registra este origen como redirect URI de tipo SPA en Entra.
    // Funciona tanto en localhost como detrás del HTTPS del despliegue.
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,

    // Permiso delegado expuesto por DigitalFix API.
    scopeApi: 'api://85329d90-58f8-4317-a820-452599b3b04c/access_as_user',
  },
};
