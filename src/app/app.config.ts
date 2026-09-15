import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

import { provideRouter, Router } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalInterceptor,
  MsalBroadcastService,
  MsalGuard,
  MsalService,
} from '@azure/msal-angular';

import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';

import {
  crearInstanciaMsal,
  crearConfiguracionProteccionRutas,
  crearConfiguracionInterceptor,
} from './config/msal.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: crearConfiguracionInterceptor,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },

    // Registra la instancia que se comunicará con Entra.
    {
      provide: MSAL_INSTANCE,
      useFactory: crearInstanciaMsal,
    },

    // Define cómo iniciar sesión desde las rutas protegidas.
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: crearConfiguracionProteccionRutas,
    },

    // Servicios de autenticación, eventos y protección de rutas.
    MsalService,
    MsalBroadcastService,
    MsalGuard,

    // Angular espera a que MSAL procese una posible redirección antes de arrancar.
    provideAppInitializer(async () => {
      const servicioMsal = inject(MsalService);
      const enrutador = inject(Router);

      try {
        // Procesa la respuesta recibida desde Microsoft Entra ID.
        const resultado = await firstValueFrom(servicioMsal.handleRedirectObservable());

        if (resultado?.account) {
          // Conserva como activa la cuenta que acaba de iniciar sesión.
          servicioMsal.instance.setActiveAccount(resultado.account);
        } else if (!servicioMsal.instance.getActiveAccount()) {
          const cuentas = servicioMsal.instance.getAllAccounts();

          // Recupera la cuenta al recargar si solo hay una disponible.
          if (cuentas.length === 1) {
            servicioMsal.instance.setActiveAccount(cuentas[0]);
          }
        }
      } catch (error) {
        // Evita que un fallo de autenticación impida arrancar la aplicación.
        console.error('Error al procesar la respuesta de autenticación:', error);

        await enrutador.navigate(['/error-autenticacion']);
      }
    }),
  ],
};
