import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, chevronUp, flaskOutline } from 'ionicons/icons';

import { ExerciseService } from '../core/exercise.service';
import { principlesFor, weeklyVolume } from '../core/evidence/explain';
import { REFERENCE_BY_ID, shortCite } from '../core/evidence/references';
import { ProfileService } from '../core/profile.service';
import { ageFrom, type StoredRoutine } from '../core/routine.service';
import { buildAthleteProfile } from '../core/routine/athlete-profile';

/** "Por qué esta rutina": volumen semanal por músculo y las referencias científicas detrás. */
@Component({
  selector: 'app-evidence-card',
  imports: [RouterLink, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
    @if (data(); as d) {
      <ion-card class="ev">
        <ion-card-content>
          <p class="title"><ion-icon name="flask-outline" aria-hidden="true"></ion-icon> Por qué esta rutina</p>
          <p class="sub">Series por semana y músculo</p>

          @for (r of d.rows; track r.muscle) {
            <div class="row">
              <span class="lbl">{{ r.label }}</span>
              <div
                class="bar"
                role="img"
                [attr.aria-label]="r.label + ': ' + r.sets + ' series, rango ' + r.min + ' a ' + r.max"
              >
                <div class="band" [style.left.%]="pct(r.min)" [style.width.%]="pct(r.max) - pct(r.min)"></div>
                <div class="fill" [class]="r.status" [style.width.%]="pct(r.sets)"></div>
              </div>
              <span class="num"
                >{{ r.sets }}<small> · {{ r.frequency }}×</small></span
              >
            </div>
          }
          <p class="legend">Banda verde = rango ideal · 2× = veces por semana</p>

          <ion-button fill="clear" size="small" (click)="open.set(!open())">
            {{ open() ? 'Ocultar la ciencia' : 'Ver la ciencia detrás' }}
            <ion-icon slot="end" [name]="open() ? 'chevron-up' : 'chevron-down'"></ion-icon>
          </ion-button>

          @if (open()) {
            @for (pr of d.principles; track pr.title) {
              <div class="principle">
                <h4>{{ pr.title }}</h4>
                <p>{{ pr.text }}</p>
                <p class="cites">
                  @for (id of pr.refs; track id) {
                    <span class="chip">{{ cite(id) }}</span>
                  }
                </p>
              </div>
            }
            <ion-button fill="outline" size="small" routerLink="/ciencia">Ver estudios</ion-button>
            <p class="legend">No reemplaza a un profesional de la salud.</p>
          }
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    .title {
      font-weight: 600;
      margin: 0 0 2px;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .sub,
    .legend {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      margin: 2px 0 10px;
    }
    .row {
      display: grid;
      grid-template-columns: 96px 1fr 52px;
      gap: 8px;
      align-items: center;
      margin: 6px 0;
      font-size: 0.85rem;
    }
    .bar {
      position: relative;
      height: 10px;
      border-radius: 5px;
      background: var(--ion-color-light);
      overflow: hidden;
    }
    .band {
      position: absolute;
      top: 0;
      bottom: 0;
      background: rgba(var(--ion-color-success-rgb), 0.25);
    }
    .fill {
      position: absolute;
      left: 0;
      top: 3px;
      bottom: 3px;
      border-radius: 3px;
      max-width: 100%;
    }
    .fill.optimo {
      background: var(--ion-color-success);
    }
    .fill.bajo {
      background: var(--ion-color-warning);
    }
    .fill.alto {
      background: var(--ion-color-danger);
    }
    .num {
      text-align: right;
      font-weight: 600;
    }
    .num small {
      font-weight: 400;
      color: var(--ion-color-medium);
    }
    .principle h4 {
      margin: 14px 0 2px;
      font-size: 0.95rem;
    }
    .principle p {
      margin: 2px 0;
      font-size: 0.85rem;
      white-space: normal;
    }
    .cites {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px !important;
    }
    .chip {
      background: var(--ion-color-light);
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 0.72rem;
    }
  `,
})
export class EvidenceCardComponent {
  readonly routine = input.required<StoredRoutine>();
  private readonly catalog = inject(ExerciseService);
  private readonly profiles = inject(ProfileService);
  readonly open = signal(false);

  constructor() {
    addIcons({ flaskOutline, chevronDown, chevronUp });
  }

  readonly data = computed(() => {
    const h = this.profiles.health();
    if (!h) return null;
    const p = buildAthleteProfile(
      h,
      this.profiles.injuries(),
      ageFrom(this.profiles.profile()?.birth_date ?? null),
      this.profiles.profile()?.gender ?? null,
      this.profiles.profile()?.weight_kg ? Number(this.profiles.profile()?.weight_kg) : null,
    );
    const rows = weeklyVolume(this.routine(), this.catalog.byId(), p);
    if (rows.length === 0) return null;
    return { rows, principles: principlesFor(p, rows) };
  });

  /** Escala de las barras: hasta 24 series. */
  pct(n: number): number {
    return Math.min(100, (n / 24) * 100);
  }

  cite(id: string): string {
    const r = REFERENCE_BY_ID.get(id);
    return r ? shortCite(r) : id;
  }
}
