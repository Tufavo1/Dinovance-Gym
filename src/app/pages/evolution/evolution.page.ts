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
  IonInput,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
  type ViewDidEnter,
} from '@ionic/angular';

import { exerciseSeries, sparkPoints, unitsOf } from '../../core/analysis/exercise-series';
import type { WeeklyReport } from '../../core/analysis/weekly-report';
import { ExerciseService } from '../../core/exercise.service';
import { ProgressionService } from '../../core/progression.service';
import { formatLoad, parseLoad, type LoadUnit } from '../../core/progression/load-units';
import type { ExerciseSession } from '../../core/progression/progression';
import { ReportService } from '../../core/report.service';
import { exerciseName } from '../../core/routine/exercise-names';
import { StatsService } from '../../core/stats.service';
import {
  MEASURE_OPTIONS,
  TrackingService,
  goalProgress,
  type Goal,
  type GoalKind,
  type MeasureKind,
  type Measurement,
} from '../../core/tracking.service';
import { TabBarComponent } from '../../shared/tab-bar.component';

const DAY = 86_400_000;
const today = () => new Date().toLocaleDateString('en-CA');

const GOAL_KINDS: { value: GoalKind; label: string }[] = [
  { value: 'peso_corporal', label: 'Peso corporal' },
  { value: 'carga_ejercicio', label: 'Carga en un ejercicio' },
  { value: 'repeticiones_ejercicio', label: 'Repeticiones en un ejercicio' },
  { value: 'entrenos_semana', label: 'Entrenamientos por semana' },
  { value: 'medida', label: 'Medida corporal' },
];

/**
 * Evolución de la persona con sesión: progresión por ejercicio con filtro de fechas, comparación
 * entre semanas, mediciones corporales y metas. Todo sale de sus propios registros.
 */
@Component({
  selector: 'app-evolution',
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
    IonInput,
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
        <ion-title>Mi evolución</ion-title>
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
          <ion-card>
            <ion-card-header><ion-card-title>Progresión por ejercicio</ion-card-title></ion-card-header>
            <ion-card-content>
              @if (exerciseOptions().length === 0) {
                <p>Aún no hay ejercicios con carga registrada. Aparecerán aquí después de tu primer entrenamiento.</p>
              } @else {
                <ion-select
                  label="Ejercicio"
                  labelPlacement="stacked"
                  fill="outline"
                  interface="action-sheet"
                  [value]="exerciseId()"
                  (ionChange)="pickExercise($event.detail.value)"
                >
                  @for (o of exerciseOptions(); track o.value) {
                    <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
                  }
                </ion-select>
                <div class="pair">
                  <ion-input
                    label="Desde"
                    labelPlacement="stacked"
                    fill="outline"
                    type="date"
                    [value]="from()"
                    (ionChange)="from.set(text($event.detail.value))"
                  ></ion-input>
                  <ion-input
                    label="Hasta"
                    labelPlacement="stacked"
                    fill="outline"
                    type="date"
                    [value]="to()"
                    (ionChange)="to.set(text($event.detail.value))"
                  ></ion-input>
                </div>
                <div class="chips">
                  <button type="button" (click)="range(28)">4 semanas</button>
                  <button type="button" (click)="range(84)">12 semanas</button>
                  <button type="button" (click)="range(null)">Todo</button>
                </div>
                @if (units().length > 1) {
                  <ion-select
                    label="Unidad registrada"
                    labelPlacement="stacked"
                    fill="outline"
                    interface="action-sheet"
                    [value]="unit()"
                    (ionChange)="unit.set($event.detail.value)"
                  >
                    @for (u of units(); track u) {
                      <ion-select-option [value]="u">{{ u }}</ion-select-option>
                    }
                  </ion-select>
                  <p class="hint">Este ejercicio tiene registros en más de una unidad: se muestran por separado.</p>
                }

                @if (points().length === 0) {
                  <p>No hay sesiones con carga registrada en ese rango de fechas.</p>
                } @else {
                  <div class="kpis">
                    <div>
                      <strong>{{ show(points()[0].load) }} → {{ show(last().load) }}</strong
                      ><span>carga</span>
                    </div>
                    <div>
                      <strong>{{ points()[0].totalReps }} → {{ last().totalReps }}</strong
                      ><span>repeticiones por sesión</span>
                    </div>
                    @if (last().e1rmKg !== null && points()[0].e1rmKg !== null) {
                      <div>
                        <strong>{{ points()[0].e1rmKg }} → {{ last().e1rmKg }} kg</strong
                        ><span>fuerza estimada (1RM)</span>
                      </div>
                    }
                  </div>
                  @if (points().length > 1) {
                    <p class="sub">Carga por sesión</p>
                    <svg
                      class="spark"
                      viewBox="0 0 100 28"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Carga por sesión"
                    >
                      <polyline
                        [attr.points]="loadLine()"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        vector-effect="non-scaling-stroke"
                      />
                    </svg>
                    <p class="sub">Repeticiones totales por sesión</p>
                    <svg
                      class="spark alt"
                      viewBox="0 0 100 28"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Repeticiones por sesión"
                    >
                      <polyline
                        [attr.points]="repsLine()"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        vector-effect="non-scaling-stroke"
                      />
                    </svg>
                  } @else {
                    <p class="hint">Con una sola sesión en el rango no hay tendencia que mostrar.</p>
                  }
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Carga</th>
                        <th scope="col">Repeticiones</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of reversed(); track p.date) {
                        <tr>
                          <td>{{ date(p.date) }}</td>
                          <td>{{ show(p.load) }}</td>
                          <td>{{ p.reps.join(', ') }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  @if (unit() === 'nivel' || unit() === 'placas' || unit() === 'otro') {
                    <p class="hint">Sin fuerza estimada: los niveles y placas no tienen equivalencia en kilos.</p>
                  }
                }
              }
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Comparar dos semanas</ion-card-title></ion-card-header>
            <ion-card-content>
              @if (weeks().length < 2) {
                <p>Se necesitan al menos dos semanas cerradas con entrenamientos para comparar.</p>
              } @else {
                <div class="pair">
                  <ion-select
                    label="Semana A"
                    labelPlacement="stacked"
                    fill="outline"
                    interface="action-sheet"
                    [value]="weekA()"
                    (ionChange)="weekA.set($event.detail.value)"
                  >
                    @for (w of weeks(); track w.weekStart) {
                      <ion-select-option [value]="w.weekStart">{{ w.weekStart }}</ion-select-option>
                    }
                  </ion-select>
                  <ion-select
                    label="Semana B"
                    labelPlacement="stacked"
                    fill="outline"
                    interface="action-sheet"
                    [value]="weekB()"
                    (ionChange)="weekB.set($event.detail.value)"
                  >
                    @for (w of weeks(); track w.weekStart) {
                      <ion-select-option [value]="w.weekStart">{{ w.weekStart }}</ion-select-option>
                    }
                  </ion-select>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Dato</th>
                      <th scope="col">A</th>
                      <th scope="col">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of comparison(); track row.label) {
                      <tr>
                        <th scope="row">{{ row.label }}</th>
                        <td>{{ row.a }}</td>
                        <td>{{ row.b }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Mediciones corporales</ion-card-title></ion-card-header>
            <ion-card-content>
              @if (latestMeasures().length === 0) {
                <p>Aún no registras mediciones.</p>
              }
              @for (m of latestMeasures(); track m.kind) {
                <p class="measure">
                  <span>{{ m.label }}</span>
                  <strong>{{ m.value }} {{ m.unit }}</strong>
                  <small>{{ m.delta }} · {{ m.count }} {{ m.count === 1 ? 'registro' : 'registros' }}</small>
                </p>
              }
              <ion-select
                label="Qué mides"
                labelPlacement="stacked"
                fill="outline"
                interface="action-sheet"
                [value]="measureKind()"
                (ionChange)="measureKind.set($event.detail.value)"
              >
                @for (o of measureOptions; track o.value) {
                  <ion-select-option [value]="o.value">{{ o.label }} ({{ o.unit }})</ion-select-option>
                }
              </ion-select>
              <div class="pair">
                <ion-input
                  label="Valor"
                  labelPlacement="stacked"
                  fill="outline"
                  inputmode="decimal"
                  [value]="measureValue()"
                  (ionInput)="measureValue.set($event.detail.value ?? '')"
                ></ion-input>
                <ion-input
                  label="Fecha"
                  labelPlacement="stacked"
                  fill="outline"
                  type="date"
                  [value]="measureDate()"
                  (ionChange)="measureDate.set(text($event.detail.value))"
                ></ion-input>
              </div>
              <ion-button expand="block" [disabled]="saving()" (click)="saveMeasure()">Guardar medición</ion-button>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Metas</ion-card-title></ion-card-header>
            <ion-card-content>
              @if (goals().length === 0) {
                <p>Aún no tienes metas.</p>
              }
              @for (g of goalRows(); track g.goal.id) {
                <div class="goal">
                  <p class="goal-head">
                    <strong>{{ g.goal.title }}</strong>
                    <span class="tag" [class]="g.goal.status">{{ statusLabel(g.goal.status) }}</span>
                  </p>
                  <p class="small">
                    Objetivo: {{ g.goal.target_value }} {{ g.goal.unit
                    }}{{ g.goal.target_date ? ' para el ' + g.goal.target_date : '' }}.
                    {{
                      g.current !== null
                        ? 'Último registro: ' + g.current + ' ' + g.goal.unit + '.'
                        : 'Sin registro actual para medir el avance.'
                    }}
                  </p>
                  @if (g.progress !== null) {
                    <div class="bar" role="img" [attr.aria-label]="'Avance ' + g.progress + ' %'">
                      <div [style.width.%]="g.progress"></div>
                    </div>
                    <p class="small">{{ g.progress }} % del camino desde {{ g.goal.start_value }} {{ g.goal.unit }}.</p>
                  }
                  @if (g.goal.status === 'en_curso') {
                    <div class="row">
                      <ion-button size="small" fill="outline" (click)="setGoal(g.goal, 'lograda')">Lograda</ion-button>
                      <ion-button size="small" fill="clear" (click)="setGoal(g.goal, 'abandonada')"
                        >Abandonar</ion-button
                      >
                    </div>
                  }
                </div>
              }
              <p class="sub">Nueva meta</p>
              <ion-select
                label="Tipo"
                labelPlacement="stacked"
                fill="outline"
                interface="action-sheet"
                [value]="goalKind()"
                (ionChange)="goalKind.set($event.detail.value)"
              >
                @for (k of goalKinds; track k.value) {
                  <ion-select-option [value]="k.value">{{ k.label }}</ion-select-option>
                }
              </ion-select>
              @if (goalKind() === 'carga_ejercicio' || goalKind() === 'repeticiones_ejercicio') {
                <ion-select
                  label="Ejercicio"
                  labelPlacement="stacked"
                  fill="outline"
                  interface="action-sheet"
                  [value]="goalExercise()"
                  (ionChange)="goalExercise.set($event.detail.value)"
                >
                  @for (o of exerciseOptions(); track o.value) {
                    <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
                  }
                </ion-select>
              }
              @if (goalKind() === 'medida') {
                <ion-select
                  label="Medida"
                  labelPlacement="stacked"
                  fill="outline"
                  interface="action-sheet"
                  [value]="goalMeasure()"
                  (ionChange)="goalMeasure.set($event.detail.value)"
                >
                  @for (o of measureOptions; track o.value) {
                    <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
                  }
                </ion-select>
              }
              <div class="pair">
                <ion-input
                  label="Valor objetivo"
                  labelPlacement="stacked"
                  fill="outline"
                  inputmode="decimal"
                  [value]="goalTarget()"
                  (ionInput)="goalTarget.set($event.detail.value ?? '')"
                ></ion-input>
                <ion-input
                  label="Fecha límite (opcional)"
                  labelPlacement="stacked"
                  fill="outline"
                  type="date"
                  [value]="goalDate()"
                  (ionChange)="goalDate.set(text($event.detail.value))"
                ></ion-input>
              </div>
              <ion-button expand="block" [disabled]="saving()" (click)="saveGoal()">Crear meta</ion-button>
              <p class="hint">
                El valor inicial se toma de tu último registro real. Si no existe, la meta se guarda sin punto de
                partida y el avance no se calcula hasta que haya datos.
              </p>
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
    ion-select,
    ion-input,
    ion-button {
      margin-top: 10px;
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .chips {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .chips button {
      min-height: 44px;
      padding: 0 14px;
      border-radius: 22px;
      border: 1px solid var(--ion-color-medium);
      background: transparent;
      color: inherit;
    }
    .kpis {
      display: grid;
      gap: 8px;
      margin: 14px 0 4px;
    }
    .kpis div {
      background: var(--ion-color-light);
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
    }
    .kpis strong {
      font-size: 1.15rem;
    }
    .kpis span {
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade);
    }
    .sub {
      font-weight: 700;
      margin: 14px 0 4px;
    }
    .spark {
      width: 100%;
      height: 56px;
      color: var(--ion-color-primary);
    }
    .spark.alt {
      color: var(--ion-color-secondary);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      margin-top: 10px;
    }
    th,
    td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    .measure {
      display: grid;
      grid-template-columns: 1fr auto;
      margin: 0 0 8px;
    }
    .measure small {
      grid-column: 1 / -1;
      color: var(--ion-color-medium-shade);
    }
    .goal {
      padding: 10px 0;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    .goal p {
      margin: 2px 0;
    }
    .goal-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
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
    }
    .tag.lograda {
      background: color-mix(in srgb, var(--ion-color-success) 25%, transparent);
    }
    .bar {
      height: 8px;
      border-radius: 4px;
      background: var(--ion-color-light-shade);
      overflow: hidden;
      margin: 6px 0;
    }
    .bar div {
      height: 100%;
      background: var(--ion-color-success);
    }
    .row {
      display: flex;
      gap: 8px;
    }
  `,
})
export class EvolutionPage implements ViewDidEnter {
  private readonly catalog = inject(ExerciseService);
  private readonly progression = inject(ProgressionService);
  private readonly reports = inject(ReportService);
  private readonly tracking = inject(TrackingService);
  private readonly stats = inject(StatsService);
  private readonly toasts = inject(ToastController);

  readonly measureOptions = MEASURE_OPTIONS;
  readonly goalKinds = GOAL_KINDS;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly saving = signal(false);

  private readonly sessions = signal<Map<string, ExerciseSession[]>>(new Map());
  readonly exerciseId = signal<string | null>(null);
  readonly unit = signal<LoadUnit>('kg');
  readonly from = signal('');
  readonly to = signal('');

  readonly weeks = signal<WeeklyReport[]>([]);
  readonly weekA = signal('');
  readonly weekB = signal('');

  readonly measures = signal<Measurement[]>([]);
  readonly measureKind = signal<MeasureKind>('cintura');
  readonly measureValue = signal<string | number>('');
  readonly measureDate = signal(today());

  readonly goals = signal<Goal[]>([]);
  readonly goalKind = signal<GoalKind>('peso_corporal');
  readonly goalExercise = signal<string | null>(null);
  readonly goalMeasure = signal<MeasureKind>('cintura');
  readonly goalTarget = signal<string | number>('');
  readonly goalDate = signal('');
  private readonly bodyWeight = signal<number | null>(null);

  readonly exerciseOptions = computed(() =>
    [...this.sessions().keys()]
      .map((id) => {
        const ex = this.catalog.byId().get(id);
        return { value: id, label: ex ? exerciseName(ex) : id };
      })
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  private readonly current = computed(() => this.sessions().get(this.exerciseId() ?? '') ?? []);
  readonly units = computed(() => unitsOf(this.current()));
  readonly points = computed(() =>
    exerciseSeries(
      this.current(),
      this.unit(),
      this.from() ? new Date(this.from() + 'T00:00:00') : null,
      this.to() ? new Date(this.to() + 'T23:59:59') : null,
    ),
  );
  readonly last = computed(() => this.points()[this.points().length - 1]);
  readonly reversed = computed(() => [...this.points()].reverse());
  readonly loadLine = computed(() => sparkPoints(this.points().map((p) => p.load)));
  readonly repsLine = computed(() => sparkPoints(this.points().map((p) => p.totalReps)));

  readonly comparison = computed(() => {
    const a = this.weeks().find((w) => w.weekStart === this.weekA());
    const b = this.weeks().find((w) => w.weekStart === this.weekB());
    if (!a || !b) return [];
    const rows: { label: string; a: string | number; b: string | number }[] = [
      { label: 'Entrenamientos', a: a.sessions.done, b: b.sessions.done },
      { label: 'Minutos', a: a.sessions.minutes, b: b.sessions.minutes },
      { label: 'Series efectivas', a: a.sessions.effectiveSets, b: b.sessions.effectiveSets },
      { label: 'Ejercicios que mejoraron', a: a.improved.length, b: b.improved.length },
    ];
    const keys = new Set([...a.muscles, ...b.muscles].map((m) => m.key));
    for (const k of keys) {
      const ma = a.muscles.find((m) => m.key === k);
      const mb = b.muscles.find((m) => m.key === k);
      rows.push({ label: `${(ma ?? mb)!.name} (series directas)`, a: ma?.directSets ?? 0, b: mb?.directSets ?? 0 });
    }
    return rows;
  });

  readonly latestMeasures = computed(() => {
    const out: { kind: string; label: string; unit: string; value: number; delta: string; count: number }[] = [];
    for (const o of MEASURE_OPTIONS) {
      const list = this.measures().filter((m) => m.kind === o.value);
      if (list.length === 0) continue;
      const first = list[0];
      const lastOne = list[list.length - 1];
      const d = Math.round((lastOne.value - first.value) * 10) / 10;
      out.push({
        kind: o.value,
        label: o.label,
        unit: o.unit,
        value: lastOne.value,
        count: list.length,
        delta:
          list.length > 1
            ? `${d > 0 ? '+' : ''}${d} ${o.unit} desde ${first.measured_on}`
            : `desde ${first.measured_on}`,
      });
    }
    return out;
  });

  readonly goalRows = computed(() =>
    this.goals().map((goal) => {
      const current = this.currentValue(goal.kind, goal.exercise_id, goal.measure_kind);
      return { goal, current, progress: goalProgress(goal.start_value, goal.target_value, current) };
    }),
  );

  ionViewDidEnter() {
    void this.load();
  }

  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.catalog.ensureLoaded();
      const ids = await this.progression.performed();
      const [sessions, stored, measures, goals, stats] = await Promise.all([
        this.progression.sessions(ids, 200),
        this.reports.list(26).catch(() => []),
        this.tracking.measurements().catch(() => []),
        this.tracking.goals().catch(() => []),
        this.stats.load().catch(() => null),
      ]);
      // Solo ejercicios con alguna carga registrada.
      const withLoad = new Map([...sessions].filter(([, list]) => unitsOf(list).length > 0));
      this.sessions.set(withLoad);
      this.weeks.set(stored.map((s) => s.report).filter((r) => r.hasData));
      this.measures.set(measures);
      this.goals.set(goals);
      this.bodyWeight.set(stats?.weights.at(-1)?.weight_kg ?? null);
      if (!this.exerciseId() || !withLoad.has(this.exerciseId()!)) {
        this.pickExercise(this.exerciseOptions()[0]?.value ?? null);
      }
      const w = this.weeks();
      if (w.length >= 2 && !this.weekA()) {
        this.weekA.set(w[1].weekStart);
        this.weekB.set(w[0].weekStart);
      }
    } catch {
      this.error.set('No se pudo cargar tu evolución. Revisa tu internet.');
    } finally {
      this.loading.set(false);
    }
  }

  pickExercise(id: string | null) {
    this.exerciseId.set(id);
    this.unit.set(unitsOf(this.sessions().get(id ?? '') ?? [])[0] ?? 'kg');
  }

  range(days: number | null) {
    this.to.set('');
    this.from.set(days === null ? '' : new Date(Date.now() - days * DAY).toLocaleDateString('en-CA'));
  }

  /** Último valor real con el que medir una meta, o null si no existe. */
  private currentValue(kind: GoalKind, exerciseId: string | null, measure: string | null): number | null {
    if (kind === 'peso_corporal') return this.bodyWeight();
    if (kind === 'medida')
      return (
        this.measures()
          .filter((m) => m.kind === measure)
          .at(-1)?.value ?? null
      );
    if (kind === 'entrenos_semana') return this.weeks()[0]?.sessions.done ?? null;
    const list = this.sessions().get(exerciseId ?? '') ?? [];
    const unit = unitsOf(list)[0];
    if (!unit) return null;
    const p = exerciseSeries(list, unit, null, null).at(-1);
    if (!p) return null;
    return kind === 'carga_ejercicio' ? p.load : Math.max(...p.reps);
  }

  async saveMeasure() {
    const value = parseLoad(this.measureValue());
    if (value === null || value <= 0 || !this.measureDate()) {
      await this.toast('Escribe un valor y una fecha válidos.');
      return;
    }
    if (this.measureDate() > today()) {
      await this.toast('La fecha no puede ser futura.');
      return;
    }
    this.saving.set(true);
    try {
      await this.tracking.addMeasurement(this.measureKind(), value, this.measureDate());
      this.measures.set(await this.tracking.measurements());
      this.measureValue.set('');
    } catch {
      await this.toast('No se pudo guardar la medición.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveGoal() {
    const target = parseLoad(this.goalTarget());
    const kind = this.goalKind();
    const needsExercise = kind === 'carga_ejercicio' || kind === 'repeticiones_ejercicio';
    if (target === null) {
      await this.toast('Escribe el valor objetivo.');
      return;
    }
    if (needsExercise && !this.goalExercise()) {
      await this.toast('Elige el ejercicio.');
      return;
    }
    const exerciseId = needsExercise ? this.goalExercise() : null;
    const measure = kind === 'medida' ? this.goalMeasure() : null;
    const ex = exerciseId ? this.catalog.byId().get(exerciseId) : null;
    const unit =
      kind === 'peso_corporal'
        ? 'kg'
        : kind === 'medida'
          ? (MEASURE_OPTIONS.find((o) => o.value === measure)?.unit ?? '')
          : kind === 'carga_ejercicio'
            ? (unitsOf(this.sessions().get(exerciseId ?? '') ?? [])[0] ?? 'kg')
            : kind === 'repeticiones_ejercicio'
              ? 'reps'
              : 'por semana';
    const label = GOAL_KINDS.find((k) => k.value === kind)!.label;
    this.saving.set(true);
    try {
      await this.tracking.addGoal({
        kind,
        exercise_id: exerciseId,
        measure_kind: measure,
        title: ex ? `${exerciseName(ex)}: ${target} ${unit}` : `${label}: ${target} ${unit}`,
        start_value: this.currentValue(kind, exerciseId, measure),
        target_value: target,
        unit,
        target_date: this.goalDate() || null,
      });
      this.goals.set(await this.tracking.goals());
      this.goalTarget.set('');
    } catch {
      await this.toast('No se pudo crear la meta. Revisa la fecha límite.');
    } finally {
      this.saving.set(false);
    }
  }

  async setGoal(goal: Goal, status: Goal['status']) {
    try {
      await this.tracking.setGoalStatus(goal.id, status);
      this.goals.set(await this.tracking.goals());
    } catch {
      await this.toast('No se pudo actualizar la meta.');
    }
  }

  text = (v: unknown): string => (typeof v === 'string' ? v : '');
  show = (v: number) => formatLoad(v, this.unit());
  date = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: '2-digit' });
  statusLabel = (s: string) => (s === 'en_curso' ? 'En curso' : s === 'lograda' ? 'Lograda' : 'Abandonada');

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }
}
