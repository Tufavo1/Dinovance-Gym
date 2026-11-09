import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonFooter, IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, createOutline, homeOutline, listOutline } from 'ionicons/icons';

export type TabName = 'home' | 'rutina' | 'crear' | 'rutinas';

/**
 * Barra de navegación inferior (patrón conocido de apps móviles: Ley de Jakob) con botones
 * grandes al alcance del pulgar (Ley de Fitts). Solo 4 destinos (Ley de Hick).
 */
@Component({
  selector: 'app-tab-bar',
  imports: [RouterLink, IonFooter, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-footer>
      <ion-tab-bar [selectedTab]="active()">
        <ion-tab-button tab="home" routerLink="/home" routerDirection="root">
          <ion-icon name="home-outline" aria-hidden="true"></ion-icon>
          <ion-label>Inicio</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="rutina" routerLink="/rutina" routerDirection="root">
          <ion-icon name="barbell-outline" aria-hidden="true"></ion-icon>
          <ion-label>Mi rutina</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="crear" routerLink="/crear-rutina" routerDirection="root">
          <ion-icon name="create-outline" aria-hidden="true"></ion-icon>
          <ion-label>Crear</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="rutinas" routerLink="/rutinas" routerDirection="root">
          <ion-icon name="list-outline" aria-hidden="true"></ion-icon>
          <ion-label>Mis rutinas</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-footer>
  `,
  // Ionic ordena los ion-footer con "order: 1"; la navegación va siempre al fondo, debajo de
  // cualquier barra de acciones de la pantalla.
  styles: `
    :host {
      display: block;
      order: 2;
    }
  `,
})
export class TabBarComponent {
  readonly active = input.required<TabName>();

  constructor() {
    addIcons({ homeOutline, barbellOutline, createOutline, listOutline });
  }
}
