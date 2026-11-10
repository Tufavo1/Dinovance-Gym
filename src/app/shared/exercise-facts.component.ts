import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, fitnessOutline } from 'ionicons/icons';

import type { Exercise } from '../core/models';
import { factsFor } from '../core/training/exercise-facts';

/** Tres líneas: para qué sirve, lo bueno y lo que hay que cuidar. */
@Component({
  selector: 'app-exercise-facts',
  imports: [IonIcon],
  template: `
    @if (f(); as x) {
      <ul class="facts">
        <li class="para">
          <ion-icon name="fitness-outline" aria-hidden="true"></ion-icon>
          <span><b>Sirve para:</b> {{ x.para }}</span>
        </li>
        <li class="pro">
          <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
          <span>{{ x.pros.join(' · ') }}</span>
        </li>
        <li class="con">
          <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
          <span>{{ x.contras.join(' · ') }}</span>
        </li>
      </ul>
    }
  `,
  styles: `
    .facts {
      list-style: none;
      margin: 8px 0 4px;
      padding: 0;
      display: grid;
      gap: 6px;
      font-size: 0.85rem;
      line-height: 1.3;
    }
    li {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    ion-icon {
      flex: none;
      font-size: 1.15rem;
      margin-top: 1px;
    }
    .para ion-icon {
      color: var(--ion-color-primary);
    }
    .pro ion-icon {
      color: var(--ion-color-success);
    }
    .con ion-icon {
      color: var(--ion-color-warning-shade, #b45309);
    }
  `,
})
export class ExerciseFactsComponent {
  readonly exercise = input<Exercise | null | undefined>(null);
  readonly f = computed(() => {
    const e = this.exercise();
    return e ? factsFor(e) : null;
  });

  constructor() {
    addIcons({ alertCircleOutline, checkmarkCircleOutline, fitnessOutline });
  }
}
