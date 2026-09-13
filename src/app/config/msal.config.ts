import {
  BrowserCacheLocation,
  InteractionType,
  PublicClientApplication,
} from '@azure/msal-browser';

import type { MsalGuardConfiguration } from '@azure/msal-angular';

import { environment } from '../../environments/environment';

// Crea la instancia que gestionará la autenticación con Entra.
export function crearInstanciaMsal(): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.entra.clientId,
      authority: environment.entra.authority,
      redirectUri: environment.entra.redirectUri,
      postLogoutRedirectUri: environment.entra.postLogoutRedirectUri,
    },

    cache: {
      // Conserva la información de sesión durante el uso de esta pestaña.
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  });
}

// Configura el inicio de sesión para las rutas protegidas.
export function crearConfiguracionProteccionRutas(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,

    authRequest: {
      // Solicita autenticación y datos básicos de identidad.
      scopes: ['openid', 'profile', environment.entra.scopeApi],
    },

    // Crearemos esta ruta para mostrar errores de autenticación.
    loginFailedRoute: '/error-autenticacion',
  };
}