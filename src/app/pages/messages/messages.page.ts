import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
  type ViewDidLeave,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  batteryHalfOutline,
  mailOpenOutline,
  nutritionOutline,
  refreshOutline,
  ribbonOutline,
  rocketOutline,
  scaleOutline,
  sparklesOutline,
  timeOutline,
  trophyOutline,
  warningOutline,
} from 'ionicons/icons';

import { MessageService } from '../../core/message.service';

@Component({
  selector: 'app-messages',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="Inicio"></ion-back-button></ion-buttons>
        <ion-title>Mensajes</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Marcar todo como leído" (click)="msgs.markAllRead()">
            <ion-icon slot="icon-only" name="mail-open-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        @if (loading()) {
          <div class="center"><ion-spinner></ion-spinner></div>
        } @else {
          <p class="hint">Avisos de tu entrenador virtual según tu progreso, tu recuperación y tu rutina.</p>
          <ion-list lines="full" class="group">
            @for (m of msgs.messages(); track m.id) {
              <ion-item [routerLink]="m.link" [detail]="!!m.link" [button]="!!m.link">
                <ion-icon slot="start" [name]="m.icon" [color]="color(m.tone)" aria-hidden="true"></ion-icon>
                <ion-label class="ion-text-wrap">
                  <h3 [class.unread]="!seen.has(m.id)">{{ m.title }}</h3>
                  <p>{{ m.body }}</p>
                </ion-label>
              </ion-item>
            } @empty {
              <ion-item><ion-label class="hint">No tienes mensajes por ahora.</ion-label></ion-item>
            }
          </ion-list>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
    h3.unread {
      font-weight: 700;
    }
    ion-label p {
      white-space: normal;
    }
  `,
})
export class MessagesPage implements ViewWillEnter, ViewDidLeave {
  readonly msgs = inject(MessageService);
  readonly loading = signal(true);
  /** Mensajes ya leídos al abrir la pantalla (para resaltar los nuevos). */
  seen = new Set<string>();

  constructor() {
    addIcons({
      batteryHalfOutline,
      mailOpenOutline,
      nutritionOutline,
      refreshOutline,
      ribbonOutline,
      rocketOutline,
      scaleOutline,
      sparklesOutline,
      timeOutline,
      trophyOutline,
      warningOutline,
    });
  }

  async ionViewWillEnter() {
    this.loading.set(true);
    await this.msgs.refresh(true);
    this.seen = new Set(
      this.msgs
        .messages()
        .filter((m) => this.msgs.isRead(m.id))
        .map((m) => m.id),
    );
    this.loading.set(false);
  }

  /** Al salir, todo lo que se vio queda como leído. */
  ionViewDidLeave() {
    this.msgs.markAllRead();
  }

  color(tone: string): string {
    return tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'primary';
  }
}
