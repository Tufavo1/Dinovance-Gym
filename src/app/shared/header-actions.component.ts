import { Component, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBadge, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chatbubbleEllipsesOutline } from 'ionicons/icons';

import { MessageService } from '../core/message.service';

/** Botón de mensajes (sobre con contador) para el encabezado de las pantallas principales. */
@Component({
  selector: 'app-header-actions',
  imports: [RouterLink, IonButton, IonIcon, IonBadge],
  template: `
    <ion-button
      routerLink="/mensajes"
      [attr.aria-label]="'Mensajes' + (msgs.unread() ? ', ' + msgs.unread() + ' sin leer' : '')"
    >
      <ion-icon slot="icon-only" name="chatbubble-ellipses-outline"></ion-icon>
      @if (msgs.unread() > 0) {
        <ion-badge color="danger" class="dot">{{ msgs.unread() > 9 ? '9+' : msgs.unread() }}</ion-badge>
      }
    </ion-button>
  `,
  styles: `
    ion-button {
      position: relative;
    }
    .dot {
      position: absolute;
      top: 4px;
      right: 2px;
      min-width: 16px;
      height: 16px;
      font-size: 0.65rem;
      line-height: 16px;
      padding: 0 4px;
      border-radius: 8px;
    }
  `,
})
export class HeaderActionsComponent implements OnInit {
  readonly msgs = inject(MessageService);

  constructor() {
    addIcons({ chatbubbleEllipsesOutline });
  }

  ngOnInit() {
    void this.msgs.refresh();
  }
}
