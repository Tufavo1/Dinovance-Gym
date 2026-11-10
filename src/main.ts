import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
});

/**
 * Accesibilidad: los íconos de Ionicons son decorativos cuando acompañan a un texto, así que se
 * ocultan a los lectores de pantalla (salvo los que ya traen aria-label), y las barras de
 * progreso reciben un nombre.
 */
function fixA11y(root: ParentNode) {
  root
    .querySelectorAll('ion-icon:not([aria-label]):not([aria-hidden])')
    .forEach((el) => el.setAttribute('aria-hidden', 'true'));
  root
    .querySelectorAll('ion-progress-bar:not([aria-label])')
    .forEach((el) => el.setAttribute('aria-label', 'Cargando'));
  root.querySelectorAll('ion-list > ion-radio-group').forEach((el) => el.parentElement?.setAttribute('role', 'group'));
}
let pending = false;
new MutationObserver(() => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    fixA11y(document);
  });
}).observe(document.documentElement, { childList: true, subtree: true });
