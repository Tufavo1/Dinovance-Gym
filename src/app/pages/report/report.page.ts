import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
  type ViewDidEnter,
} from '@ionic/angular';

import type { WeeklyReport } from '../../core/analysis/weekly-report';
import { ExerciseService } from '../../core/exercise.service';
import { BODY_AREA_OPTIONS, labelOf } from '../../core/models';
import { ProgressionService, type StoredRecommendation } from '../../core/progression.service';
import { formatLoad } from '../../core/progression/load-units';
import { ReportService } from '../../core/report.service';
import { exerciseName } from '../../core/routine/exercise-names';
import { TabBarComponent } from '../../shared/tab-bar.component';

const ACTION_LABEL: Record<string, string> = {
  subir: 'Subir la carga',
  bajar: 'Bajar la carga',
  mantener: 'Mantener la carga',
  progresar_reps: 'Mantener y sumar repeticiones',
  sin_datos: 'Sin datos',
};

const TREND_LABEL: Record<string, string> = {
  mejoro: 'Mejoró',
  igual: 'Igual',
  empeoro: 'Empeoró',
  nuevo: 'Sin comparación',
};

/**
 * Informe semanal: qué se entrenó, cómo evolucionó cada ejercicio y qué se recomienda, siempre con
 * el dato que lo justifica. Las recomendaciones de carga se aceptan o rechazan aquí.
 */
@Component({
  selector: 'app-report',
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
    IonButton,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    TabBarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button defaultHref="/progreso" text="Volver"></ion-back-button
        ></ion-buttons>
        <ion-title>Informe semanal</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        @if (loading()) {
          <div class="center"><ion-spinner></ion-spinner></div>
        } @else if (error()) {
          <ion-note color="danger">{{ error() }}</ion-note>
          <ion-button expand="block" (click)="load()">Reintentar</ion-button>
        } @else {
          <ion-select
            label="Semana"
            labelPlacement="stacked"
            fill="outline"
            interface="action-sheet"
            [value]="selected()"
            (ionChange)="selected.set($event.detail.value)"
          >
            @for (o of options(); track o.value) {
              <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
            }
          </ion-select>

          @if (report(); as r) {
            @if (selected() === 'actual') {
              <p class="hint">
                Semana en curso: es un avance con lo registrado hasta hoy. El informe definitivo se guarda cuando la
                semana termina.
              </p>
            }
            <ion-card>
              <ion-card-header><ion-card-title>Resumen</ion-card-title></ion-card-header>
              <ion-card-content>
                <p>{{ r.summary }}</p>
                @if (r.hasData) {
                  <dl class="facts">
                    <dt>Entrenamientos</dt>
                    <dd>
                      {{ r.sessions.done }}{{ r.sessions.planned ? ' de ' + r.sessions.planned : '' }}
                      {{ r.sessions.adherencePct !== null ? '(' + r.sessions.adherencePct + ' %)' : '' }}
                    </dd>
                    <dt>Tiempo total</dt>
                    <dd>{{ r.sessions.minutes }} min</dd>
                    <dt>Series efectivas (RIR ≤ 3)</dt>
                    <dd>{{ r.sessions.effectiveSets }}</dd>
                    <dt>Sesiones terminadas antes</dt>
                    <dd>{{ r.sessions.endedEarly }}</dd>
                  </dl>
                }
                @if (r.dataNotes.length) {
                  <p class="sub">Lo que no se pudo analizar</p>
                  <ul>
                    @for (n of r.dataNotes; track n) {
                      <li>{{ n }}</li>
                    }
                  </ul>
                }
              </ion-card-content>
            </ion-card>

            <ion-card>
              <ion-card-header><ion-card-title>Recomendaciones para la próxima semana</ion-card-title></ion-card-header>
              <ion-card-content>
                <ul>
                  @for (x of r.recommendations; track x) {
                    <li>{{ x }}</li>
                  }
                </ul>
                @if (r.routineChanges.length) {
                  <p class="sub">Cambios sugeridos en la rutina</p>
                  <ul>
                    @for (c of r.routineChanges; track c.change) {
                      <li>
                        {{ c.change }} <small>Motivo: {{ c.reason }}</small>
                      </li>
                    }
                  </ul>
                  <p class="hint">Son sugerencias: la rutina solo cambia si tú la editas.</p>
                }
              </ion-card-content>
            </ion-card>

            @if (r.hasData) {
              <ion-card>
                <ion-card-header><ion-card-title>Músculos trabajados</ion-card-title></ion-card-header>
                <ion-card-content>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Grupo</th>
                        <th scope="col">Directas</th>
                        <th scope="col">Indirectas</th>
                        <th scope="col">Rango</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of r.muscles; track m.key) {
                        <tr [class]="m.status">
                          <th scope="row">{{ m.name }}</th>
                          <td>{{ m.directSets }}</td>
                          <td>{{ m.indirectSets }}</td>
                          <td>{{ m.range ? m.range[0] + '-' + m.range[1] : 'sin referencia' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <p class="hint">
                    Series de la semana. Las indirectas (músculo secundario) cuentan la mitad al comparar con el rango
                    orientativo. "Sin referencia": no hay un rango respaldado para ese grupo.
                  </p>
                  @for (i of r.imbalances; track i) {
                    <p class="alert">{{ i }}</p>
                  }
                  @for (v of r.volumeSpikes; track v) {
                    <p class="alert">Aumento brusco: {{ v }}</p>
                  }
                </ion-card-content>
              </ion-card>

              <ion-card>
                <ion-card-header><ion-card-title>Rendimiento por ejercicio</ion-card-title></ion-card-header>
                <ion-card-content>
                  @if (r.exercises.length === 0) {
                    <p>No hay ejercicios con carga registrada esta semana.</p>
                  }
                  @for (e of r.exercises; track e.exercise_id) {
                    <div class="ex">
                      <p class="ex-head">
                        <strong>{{ e.name }}</strong>
                        <span class="tag" [class]="e.trend">{{ trend(e.trend) }}</span>
                      </p>
                      <p>{{ loadText(e.load, e.unit) }} · {{ e.reps.join(', ') }} repeticiones</p>
                      <p class="small">{{ e.detail }}</p>
                      @if (e.planned) {
                        <p class="small">{{ e.planned }}</p>
                      }
                      <p class="small">
                        <strong>{{ action(e.advice.action) }}.</strong> {{ e.advice.reason }} {{ e.advice.nextGoal }}
                      </p>
                    </div>
                  }
                </ion-card-content>
              </ion-card>

              <ion-card>
                <ion-card-header><ion-card-title>Recuperación y molestias</ion-card-title></ion-card-header>
                <ion-card-content>
                  <dl class="facts">
                    <dt>Recuperación declarada</dt>
                    <dd>{{ r.recovery.avgReadiness !== null ? r.recovery.avgReadiness + ' / 5' : 'sin declarar' }}</dd>
                    <dt>Fatiga percibida</dt>
                    <dd>{{ r.recovery.avgFatigue !== null ? r.recovery.avgFatigue + ' / 5' : 'sin declarar' }}</dd>
                    <dt>Esfuerzo de las sesiones</dt>
                    <dd>
                      {{ r.recovery.avgSessionRpe !== null ? r.recovery.avgSessionRpe + ' / 10' : 'sin declarar' }}
                    </dd>
                    <dt>RIR promedio</dt>
                    <dd>{{ r.recovery.avgRir !== null ? r.recovery.avgRir : 'sin registrar' }}</dd>
                    <dt>Molestias</dt>
                    <dd>
                      @if (r.recovery.discomfortAreas.length === 0) {
                        ninguna declarada
                      }
                      @for (d of r.recovery.discomfortAreas; track d.area) {
                        {{ area(d.area) }} ({{ d.times }})
                      }
                    </dd>
                  </dl>
                  @for (n of r.recovery.notes; track n) {
                    <p class="small">“{{ n }}”</p>
                  }
                </ion-card-content>
              </ion-card>
            }
          }

          <ion-card>
            <ion-card-header><ion-card-title>Recomendaciones de carga</ion-card-title></ion-card-header>
            <ion-card-content>
              <p class="hint">
                Aceptar o rechazar no cambia nada de lo que ya registraste. Si rechazas un cambio, la app mantiene tu
                carga actual hasta que tus registros indiquen otra cosa.
              </p>
              @if (recs().length === 0) {
                <p>Aún no hay recomendaciones. Se crean al cerrar cada semana con entrenamientos registrados.</p>
              }
              @for (x of recs(); track x.id) {
                <div class="ex">
                  <p class="ex-head">
                    <strong>{{ exercise(x.exercise_id) }}</strong>
                    <span class="tag" [class]="x.status">{{ x.status }}</span>
                  </p>
                  <p>
                    {{ action(x.action) }}
                    @if (x.suggested_value !== null && x.suggested_value !== x.current_value) {
                      : {{ loadText(x.current_value, x.load_unit) }} → {{ loadText(x.suggested_value, x.load_unit) }}
                    }
                  </p>
                  <p class="small">Semana del {{ x.week_start }}. {{ x.reason }}</p>
                  @if (x.status === 'pendiente') {
                    <div class="row">
                      <ion-button size="small" [disabled]="busy()" (click)="decide(x, true)">Aceptar</ion-button>
                      <ion-button size="small" fill="outline" [disabled]="busy()" (click)="decide(x, false)"
                        >Rechazar</ion-button
                      >
                    </div>
                  }
                </div>
              }
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>

    <app-tab-bar active="progreso"></app-tab-bar>
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
    ion-card {
      margin: 12px 0;
    }
    ul {
      padding-left: 18px;
      margin: 6px 0;
    }
    li {
      margin-bottom: 6px;
    }
    li small {
      display: block;
      opacity: 0.85;
    }
    .sub {
      font-weight: 700;
      margin: 12px 0 4px;
    }
    .facts {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      margin: 8px 0 0;
    }
    .facts dt {
      color: var(--ion-color-medium-shade);
    }
    .facts dd {
      margin: 0;
      font-weight: 600;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th,
    td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    tr.bajo td:nth-child(2) {
      color: var(--ion-color-warning-shade);
      font-weight: 700;
    }
    tr.alto td:nth-child(2) {
      color: var(--ion-color-danger);
      font-weight: 700;
    }
    .alert {
      margin: 8px 0 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--ion-color-warning) 18%, transparent);
    }
    .ex {
      padding: 10px 0;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    .ex:last-child {
      border-bottom: 0;
    }
    .ex p {
      margin: 2px 0;
    }
    .ex-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }
    .small {
      font-size: 0.85rem;
    }
    .tag {
      flex: none;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--ion-color-light);
      text-transform: capitalize;
    }
    .tag.mejoro,
    .tag.aceptada {
      background: color-mix(in srgb, var(--ion-color-success) 25%, transparent);
    }
    .tag.empeoro,
    .tag.rechazada {
      background: color-mix(in srgb, var(--ion-color-danger) 20%, transparent);
    }
    .row {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }
  `,
})
export class ReportPage implements ViewDidEnter {
  private readonly reports = inject(ReportService);
  private readonly progression = inject(ProgressionService);
  private readonly catalog = inject(ExerciseService);
  private readonly toasts = inject(ToastController);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly selected = signal('actual');
  readonly recs = signal<StoredRecommendation[]>([]);
  private readonly currentWeek = signal<WeeklyReport | null>(null);
  private readonly stored = signal<{ week_start: string; report: WeeklyReport }[]>([]);

  readonly options = computed(() => [
    { value: 'actual', label: 'Semana en curso' },
    ...this.stored().map((s) => ({ value: s.week_start, label: `${s.report.weekStart} al ${s.report.weekEnd}` })),
  ]);

  readonly report = computed(() =>
    this.selected() === 'actual'
      ? this.currentWeek()
      : (this.stored().find((s) => s.week_start === this.selected())?.report ?? null),
  );

  ionViewDidEnter() {
    void this.load();
  }

  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.catalog.ensureLoaded();
      // Primero se cierran las semanas terminadas que aún no tienen informe.
      await this.reports.ensureReports();
      const [current, stored, recs] = await Promise.all([
        this.reports.current(),
        this.reports.list(),
        this.progression.recommendations(),
      ]);
      this.currentWeek.set(current);
      this.stored.set(stored);
      this.recs.set(recs);
      // Si esta semana aún no hay registros, se muestra el último informe cerrado.
      if (!current.hasData && stored.length > 0 && this.selected() === 'actual')
        this.selected.set(stored[0].week_start);
    } catch {
      this.error.set('No se pudo preparar el informe. Revisa tu internet.');
    } finally {
      this.loading.set(false);
    }
  }

  async decide(rec: StoredRecommendation, accepted: boolean) {
    this.busy.set(true);
    try {
      await this.progression.decide(rec.id, accepted);
      this.recs.update((list) =>
        list.map((r) => (r.id === rec.id ? { ...r, status: accepted ? 'aceptada' : 'rechazada' } : r)),
      );
    } catch {
      const t = await this.toasts.create({
        message: 'No se pudo guardar tu decisión.',
        duration: 2500,
        position: 'top',
      });
      await t.present();
    } finally {
      this.busy.set(false);
    }
  }

  action = (a: string) => ACTION_LABEL[a] ?? a;
  trend = (t: string) => TREND_LABEL[t] ?? t;
  area = (a: string) => labelOf(BODY_AREA_OPTIONS, a);
  loadText = (v: number | null, unit: StoredRecommendation['load_unit']) => formatLoad(v, unit);

  exercise(id: string): string {
    const ex = this.catalog.byId().get(id);
    return ex ? exerciseName(ex) : id;
  }
}
