import { Component, inject } from '@angular/core';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastController);

  constructor() {
    // PWA: cuando hay una versión nueva descargada, se ofrece recargar (en vez de quedar
    // con la versión vieja hasta cerrar todas las pestañas).
    if (!this.updates.isEnabled) return;
    this.updates.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => void this.offerReload());
    this.updates.unrecoverable.subscribe(() => document.location.reload());
  }

  private async offerReload() {
    const toast = await this.toasts.create({
      message: 'Hay una versión nueva de la app.',
      position: 'bottom',
      buttons: [{ text: 'Actualizar', role: 'confirm' }],
    });
    await toast.present();
    const { role } = await toast.onDidDismiss();
    if (role === 'confirm') document.location.reload();
  }
}
