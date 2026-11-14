import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, fitnessOutline } from 'ionicons/icons';

import { muscleName, patternName } from '../core/anatomy/muscles';
import type { Exercise } from '../core/models';
import { factsFor } from '../core/training/exercise-facts';

/**
 * Tres líneas (para qué sirve, lo bueno y lo que hay que cuidar) y, debajo, la ficha del catálogo:
 * patrón, músculos, errores frecuentes, precauciones y variantes. Lo que no está revisado se
 * muestra como "pendiente de revisión", nunca como un dato confirmado.
 */
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
    @if (sheet(); as d) {
      <details class="sheet">
        <summary>Ficha técnica {{ d.verified ? '(verificada)' : '(pendiente de revisión)' }}</summary>
        <dl>
          <dt>Patrón de movimiento</dt>
          <dd>{{ d.pattern }}</dd>
          <dt>Tipo</dt>
          <dd>{{ d.type }}</dd>
          <dt>Músculos principales</dt>
          <dd>{{ d.main }}</dd>
          <dt>Músculos secundarios</dt>
          <dd>{{ d.secondary }}</dd>
          @if (d.fn) {
            <dt>Función</dt>
            <dd>{{ d.fn }}</dd>
          }
          @if (d.reps) {
            <dt>Repeticiones orientativas</dt>
            <dd>{{ d.reps }}</dd>
          }
          @if (d.errors.length) {
            <dt>Errores frecuentes</dt>
            <dd>{{ d.errors.join(' · ') }}</dd>
          }
          @if (d.precautions.length) {
            <dt>Precauciones</dt>
            <dd>{{ d.precautions.join(' · ') }}</dd>
          }
          @if (d.safety.length) {
            <dt>Seguridad</dt>
            <dd>{{ d.safety.join(' · ') }}</dd>
          }
          @if (d.variants.length) {
            <dt>Variantes</dt>
            <dd>{{ d.variants.join(' · ') }}</dd>
          }
        </dl>
        @if (!d.verified) {
          <p class="pending">
            Esta ficha aún no fue revisada: los músculos vienen del dataset original y el patrón, si aparece, se dedujo
            del nombre. Errores, precauciones y variantes: sin información.
          </p>
        }
      </details>
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
    .sheet {
      font-size: 0.85rem;
      line-height: 1.35;
    }
    .sheet summary {
      min-height: 44px;
      display: flex;
      align-items: center;
      color: var(--ion-color-primary);
      cursor: pointer;
    }
    dl {
      margin: 0 0 8px;
    }
    dt {
      font-weight: 600;
      margin-top: 6px;
    }
    dd {
      margin: 0;
    }
    .pending {
      margin: 0 0 8px;
      font-style: italic;
    }
  `,
})
export class ExerciseFactsComponent {
  readonly exercise = input<Exercise | null | undefined>(null);
  readonly f = computed(() => {
    const e = this.exercise();
    return e ? factsFor(e) : null;
  });

  readonly sheet = computed(() => {
    const e = this.exercise();
    if (!e || e.category === 'stretching' || e.category === 'cardio' || e.review_status === undefined) return null;
    const names = (role: 'principal' | 'secundario') =>
      (e.muscles ?? [])
        .filter((m) => m.role === role)
        .map((m) => muscleName(m.code))
        .join(', ') || (role === 'principal' ? 'Sin información' : 'Ninguno registrado');
    return {
      verified: e.review_status === 'verificado',
      pattern: patternName(e.movement_pattern),
      type: e.mechanic === 'compound' ? 'Compuesto' : e.mechanic === 'isolation' ? 'Aislamiento' : 'Sin información',
      main: names('principal'),
      secondary: names('secundario'),
      fn: e.muscle_function ?? null,
      reps:
        e.rep_range_min && e.rep_range_max && e.rep_range_max > 1 ? `${e.rep_range_min} a ${e.rep_range_max}` : null,
      errors: e.common_errors ?? [],
      precautions: e.precautions ?? [],
      safety: e.safety_notes ?? [],
      variants: e.variants ?? [],
    };
  });

  constructor() {
    addIcons({ alertCircleOutline, checkmarkCircleOutline, fitnessOutline });
  }
}
