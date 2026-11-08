import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { ExerciseService } from '../../core/exercise.service';
import { PLACE_OPTIONS, labelOf } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import {
  EmptyExerciseCatalogError,
  RoutineService,
  type StoredRoutine,
} from '../../core/routine.service';

@Component({
  selector: 'app-routine',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonThumbnail,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" text="Inicio"></ion-back-button>
        </ion-buttons>
        <ion-title>Mi rutina</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        @if (loading()) {
          <div class="center"><ion-spinner></ion-spinner></div>
        } @else if (loadError()) {
          <ion-note color="danger">{{ loadError() }}</ion-note>
          <ion-button expand="block" (click)="init()">Reintentar</ion-button>
        } @else {
          @if (routine(); as r) {
            <h1>{{ r.name }}</h1>
            <p class="hint">Lugar: {{ placeLabel(r.place) }}</p>

            @if (noteList().length > 0) {
              <ion-card color="warning">
                <ion-card-header><ion-card-title>Importante</ion-card-title></ion-card-header>
                <ion-card-content>
                  @for (n of noteList(); track $index) {
                    <p>• {{ n }}</p>
                  }
                </ion-card-content>
              </ion-card>
            }

            @for (day of r.routine_days; track day.id) {
              <ion-card>
                <ion-card-header>
                  <ion-card-title>{{ day.name }}</ion-card-title>
                </ion-card-header>
                <ion-list lines="full">
                  @for (e of day.routine_exercises; track e.id) {
                    @let ex = catalog.byId().get(e.exercise_id);
                    <ion-item>
                      @if (catalog.imageUrl(ex); as img) {
                        <ion-thumbnail slot="start">
                          <img [src]="img" [alt]="ex?.name" loading="lazy" />
                        </ion-thumbnail>
                      }
                      <ion-label class="ion-text-wrap">
                        <h3>{{ ex?.name ?? e.exercise_id }}</h3>
                        <p>{{ prescription(e.sets, e.reps_min, e.reps_max, e.rest_seconds) }}</p>
                        @if (e.notes) {
                          <p>{{ e.notes }}</p>
                        }
                      </ion-label>
                    </ion-item>
                  }
                </ion-list>
              </ion-card>
            }

            <p class="hint">
              Los nombres de los ejercicios están en inglés por ahora. Descansa lo indicado entre
              series y detente si sientes dolor.
            </p>
          } @else {
            <h1>Aún no tienes una rutina</h1>
            <p class="hint">
              La armamos según tu nivel, objetivo, tiempo, el equipamiento del lugar y tus
              lesiones.
            </p>
          }

          @if (places().length > 1) {
            <ion-select
              label="¿Dónde vas a entrenar?"
              labelPlacement="floating"
              fill="outline"
              interface="popover"
              [value]="place()"
              (ionChange)="place.set($event.detail.value)"
            >
              @for (p of places(); track p.value) {
                <ion-select-option [value]="p.value">{{ p.label }}</ion-select-option>
              }
            </ion-select>
          }

          <ion-button expand="block" [disabled]="generating()" (click)="onGenerate()">
            {{
              generating()
                ? 'Generando...'
                : routine()
                  ? 'Generar una rutina nueva'
                  : 'Generar mi rutina'
            }}
          </ion-button>
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
    ion-card {
      margin-left: 0;
      margin-right: 0;
    }
    ion-card p {
      white-space: normal;
    }
  `,
})
export class RoutinePage implements OnInit {
  readonly catalog = inject(ExerciseService);
  private readonly routines = inject(RoutineService);
  private readonly profiles = inject(ProfileService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly generating = signal(false);
  readonly routine = signal<StoredRoutine | null>(null);
  readonly place = signal('');

  readonly places = computed(() =>
    (this.profiles.health()?.places ?? []).map((p) => ({ value: p, label: labelOf(PLACE_OPTIONS, p) })),
  );
  readonly noteList = computed(() =>
    (this.routine()?.notes ?? '').split('\n').filter((n) => n.trim().length > 0),
  );

  ngOnInit() {
    void this.init();
  }

  async init() {
    this.loading.set(true);
    this.loadError.set('');
    try {
      await this.profiles.load();
      await this.catalog.ensureLoaded();
      this.routine.set(await this.routines.loadActive());
      const first = this.profiles.health()?.places?.[0] ?? '';
      this.place.set(this.routine()?.place ?? first);
    } catch {
      this.loadError.set('No se pudo cargar tu rutina. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  placeLabel(p: string | null): string {
    return p ? labelOf(PLACE_OPTIONS, p) : '';
  }

  prescription(sets: number, min: number, max: number, rest: number): string {
    const reps = min === max ? `${min}` : `${min}-${max}`;
    return `${sets} series × ${reps} · descanso ${rest} s`;
  }

  async onGenerate() {
    if (!this.place() || this.generating()) return;
    if (this.routine()) {
      const alert = await this.alerts.create({
        header: 'Generar una rutina nueva',
        message: 'Reemplazará tu rutina actual. ¿Continuar?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Generar', role: 'confirm' },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'confirm') return;
    }
    await this.generate();
  }

  private async generate() {
    this.generating.set(true);
    try {
      await this.routines.generateAndSave(this.place());
      this.routine.set(await this.routines.loadActive());
    } catch (e) {
      const msg =
        e instanceof EmptyExerciseCatalogError
          ? 'La base de ejercicios está vacía. Falta ejecutar la importación en Supabase.'
          : 'No se pudo generar la rutina. Inténtalo de nuevo.';
      const t = await this.toasts.create({ message: msg, duration: 4500, position: 'top' });
      await t.present();
    } finally {
      this.generating.set(false);
    }
  }
}
