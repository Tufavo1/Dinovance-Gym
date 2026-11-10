import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, closeOutline } from 'ionicons/icons';

import { ExerciseService } from '../core/exercise.service';
import type { Exercise } from '../core/models';
import { exerciseName } from '../core/routine/exercise-names';
import { MUSCLE_ES, NOT_FOR_ROUTINE } from '../core/routine/rules';

const FILTERS = [
  'chest',
  'lats',
  'middle back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abdominals',
];

/**
 * Buscador de ejercicios para agregar a la rutina. Muestra todo el catálogo; los que no
 * convienen a la persona (equipo, nivel, lesión) quedan marcados pero se pueden elegir.
 */
@Component({
  selector: 'app-exercise-picker',
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonBadge,
  ],
  template: `
    <ion-modal [isOpen]="open()" (didDismiss)="closed.emit()">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Agregar ejercicio</ion-title>
            <ion-buttons slot="end">
              <ion-button aria-label="Cerrar" (click)="closed.emit()">
                <ion-icon slot="icon-only" name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              placeholder="Buscar (ej: press, curl, sentadilla)"
              (ionInput)="query.set($any($event.detail.value ?? ''))"
            ></ion-searchbar>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="chips">
            <button type="button" class="chip" [class.on]="!muscle()" (click)="muscle.set('')">Todos</button>
            @for (m of filters; track m) {
              <button type="button" class="chip" [class.on]="muscle() === m" (click)="muscle.set(m)">
                {{ label(m) }}
              </button>
            }
          </div>
          <ion-list lines="full">
            @for (e of results(); track e.id) {
              <ion-item button [detail]="false" (click)="picked.emit(e)">
                @if (catalog.imageUrl(e); as img) {
                  <ion-thumbnail slot="start"><img [src]="img" [alt]="name(e)" loading="lazy" /></ion-thumbnail>
                }
                <ion-label class="ion-text-wrap">
                  <h3>{{ name(e) }}</h3>
                  <p>{{ muscles(e) }}</p>
                  @if (!allowed().has(e.id)) {
                    <ion-badge color="warning">No recomendado para ti</ion-badge>
                  }
                </ion-label>
                <ion-icon slot="end" name="add-circle-outline" color="primary"></ion-icon>
              </ion-item>
            } @empty {
              <p class="hint ion-padding">No encontramos ejercicios con ese nombre.</p>
            }
          </ion-list>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    .chips {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 8px 12px;
    }
    .chip {
      flex: none;
      border: 1px solid var(--ion-color-medium);
      background: transparent;
      color: inherit;
      border-radius: 16px;
      padding: 6px 12px;
      font-size: 0.85rem;
    }
    .chip.on {
      background: var(--ion-color-primary);
      border-color: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
    }
  `,
})
export class ExercisePickerComponent {
  readonly open = input.required<boolean>();
  readonly allowed = input<Set<string>>(new Set());
  readonly exclude = input<string[]>([]);
  readonly picked = output<Exercise>();
  readonly closed = output<void>();

  readonly catalog = inject(ExerciseService);
  readonly query = signal('');
  readonly muscle = signal('');
  readonly filters = FILTERS;
  readonly name = (e: Exercise) => exerciseName(e);

  constructor() {
    addIcons({ addCircleOutline, closeOutline });
  }

  label(m: string): string {
    return MUSCLE_ES[m] ?? m;
  }

  muscles(e: Exercise): string {
    return e.primary_muscles.map((m) => MUSCLE_ES[m] ?? m).join(', ');
  }

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const m = this.muscle();
    const skip = new Set(this.exclude());
    const allowed = this.allowed();
    return this.catalog
      .exercises()
      .filter((e) => !skip.has(e.id) && !NOT_FOR_ROUTINE.test(e.name))
      .filter((e) => !m || e.primary_muscles.includes(m))
      .filter((e) => !q || e.name.toLowerCase().includes(q) || exerciseName(e).toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(allowed.has(b.id)) - Number(allowed.has(a.id)) || exerciseName(a).localeCompare(exerciseName(b)),
      )
      .slice(0, 60);
  });
}
