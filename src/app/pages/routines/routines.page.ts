import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { HeaderActionsComponent } from '../../shared/header-actions.component';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonButtons,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  type RefresherCustomEvent,
  type ViewDidEnter,
} from '@ionic/angular';

import { GOAL_OPTIONS, PLACE_OPTIONS, labelOf } from '../../core/models';
import { RoutineService, type RoutineSummary } from '../../core/routine.service';
import { TabBarComponent } from '../../shared/tab-bar.component';

/** Historial: todas las rutinas que la persona ha generado (solo las suyas, por RLS). */
@Component({
  selector: 'app-routines',
  imports: [
    RouterLink,
    IonButtons,
    IonIcon,
    HeaderActionsComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonNote,
    IonButton,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    TabBarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Mis rutinas</ion-title>
        <ion-buttons slot="end"><app-header-actions></app-header-actions></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="page">
        @if (loading()) {
          <div class="center"><ion-spinner></ion-spinner></div>
        } @else if (error()) {
          <ion-note color="danger">{{ error() }}</ion-note>
          <ion-button expand="block" (click)="load()">Reintentar</ion-button>
        } @else if (items().length === 0) {
          <h1>Aún no tienes rutinas</h1>
          <p class="hint">Cuando generes una, quedará guardada aquí.</p>
          <ion-button expand="block" size="large" routerLink="/rutina">Generar mi rutina</ion-button>
          <ion-button expand="block" fill="outline" routerLink="/crear-rutina"
            ><ion-icon slot="start" name="create-outline"></ion-icon>Crear mi rutina a mano</ion-button
          >
        } @else {
          <ion-button expand="block" fill="outline" routerLink="/crear-rutina"
            ><ion-icon slot="start" name="create-outline"></ion-icon>Crear mi rutina a mano</ion-button
          >
          <p class="hint">Todas tus rutinas. Toca una para verla o volver a usarla.</p>
          <ion-list lines="full" class="group">
            @for (r of items(); track r.id) {
              <ion-item button [routerLink]="r.is_active ? '/rutina' : '/rutina/' + r.id">
                <ion-label class="ion-text-wrap">
                  <h3>{{ goal(r.goal) }}</h3>
                  <p>{{ r.days_per_week }} días · {{ place(r.place) }} · {{ date(r.created_at) }}</p>
                </ion-label>
                @if (r.is_active) {
                  <ion-badge slot="end" color="success">En uso</ion-badge>
                }
              </ion-item>
            }
          </ion-list>
        }
      </div>
    </ion-content>

    <app-tab-bar active="rutinas"></app-tab-bar>
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
  `,
})
export class RoutinesPage implements ViewDidEnter {
  private readonly routines = inject(RoutineService);

  constructor() {
    addIcons({ createOutline });
  }

  readonly loading = signal(true);
  readonly error = signal('');
  readonly items = signal<RoutineSummary[]>([]);

  /** Se recarga cada vez que se entra (Ionic mantiene la página viva entre pestañas). */
  ionViewDidEnter() {
    void this.load();
  }

  async load() {
    this.error.set('');
    if (this.items().length === 0) this.loading.set(true);
    try {
      this.items.set(await this.routines.list());
    } catch {
      this.error.set('No se pudieron cargar tus rutinas. Revisa tu internet.');
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(ev: RefresherCustomEvent) {
    await this.load();
    await ev.target.complete();
  }

  goal = (g: string | null) => labelOf(GOAL_OPTIONS, g) || 'Rutina';
  place = (p: string | null) => labelOf(PLACE_OPTIONS, p);
  date = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
