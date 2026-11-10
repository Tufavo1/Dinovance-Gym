import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
  type RefresherCustomEvent,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  flameOutline,
  flashOutline,
  speedometerOutline,
  timeOutline,
  trendingDownOutline,
  trendingUpOutline,
} from 'ionicons/icons';

import { MUSCLE_LABEL_ES, TRACKED_MUSCLES, weeklyRange } from '../../core/evidence/programming';
import { ExerciseService } from '../../core/exercise.service';
import { ProfileService } from '../../core/profile.service';
import { ageFrom } from '../../core/routine.service';
import { buildAthleteProfile } from '../../core/routine/athlete-profile';
import { exerciseName } from '../../core/routine/exercise-names';
import { StatsService, type Stats } from '../../core/stats.service';
import { HeaderActionsComponent } from '../../shared/header-actions.component';
import { HelpButtonComponent } from '../../shared/help-button.component';
import { TabBarComponent } from '../../shared/tab-bar.component';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Métricas del usuario: constancia, volumen por músculo, fuerza, carga de entrenamiento y peso. */
@Component({
  selector: 'app-progress',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton,
    IonButtons,
    IonInput,
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    TabBarComponent,
    HeaderActionsComponent,
    HelpButtonComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Mi progreso</ion-title>
        <ion-buttons slot="end">
          <app-help-button></app-help-button>
          <app-header-actions></app-header-actions>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="page">
        @if (loading() && !s()) {
          <div class="center"><ion-spinner></ion-spinner></div>
        } @else if (error()) {
          <ion-note color="danger">{{ error() }}</ion-note>
          <ion-button expand="block" (click)="load()">Reintentar</ion-button>
        } @else if (s(); as st) {
          <section class="kpis" aria-label="Resumen">
            <div class="kpi">
              <ion-icon name="flame-outline" aria-hidden="true"></ion-icon><strong>{{ st.streakWeeks }}</strong
              ><span>semanas seguidas</span>
            </div>
            <div class="kpi">
              <ion-icon name="barbell-outline" aria-hidden="true"></ion-icon><strong>{{ st.last30 }}</strong
              ><span>entrenos en 30 días</span>
            </div>
            <div class="kpi">
              <ion-icon name="time-outline" aria-hidden="true"></ion-icon><strong>{{ hours(st.minutesTotal) }}</strong
              ><span>entrenadas en total</span>
            </div>
            <div class="kpi">
              <ion-icon name="speedometer-outline" aria-hidden="true"></ion-icon
              ><strong>{{ st.avgRpe ? st.avgRpe.toFixed(1) : '–' }}</strong
              ><span>esfuerzo promedio</span>
            </div>
          </section>

          @if (st.total === 0) {
            <ion-card>
              <ion-card-content>
                Aún no tienes entrenamientos registrados. Cuando termines tu primer día guiado verás aquí tu volumen, tu
                fuerza y tu carga semanal.
              </ion-card-content>
            </ion-card>
          } @else {
            <ion-card>
              <ion-card-header><ion-card-title>Entrenamientos por semana</ion-card-title></ion-card-header>
              <ion-card-content>
                <div class="bars" role="img" [attr.aria-label]="'Entrenamientos por semana: ' + weekSummary()">
                  @for (w of st.weeks; track w.start) {
                    <div class="col">
                      <span class="val">{{ w.sessions || '' }}</span>
                      <div class="b" [style.height.%]="(w.sessions / maxSessions()) * 100"></div>
                      <span class="lab">{{ weekLabel(w.start) }}</span>
                    </div>
                  }
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card>
              <ion-card-header><ion-card-title>Kilos movidos por semana</ion-card-title></ion-card-header>
              <ion-card-content>
                <div class="bars" role="img" aria-label="Tonelaje semanal">
                  @for (w of st.weeks; track w.start) {
                    <div class="col">
                      <span class="val">{{ w.tonnage ? kilo(w.tonnage) : '' }}</span>
                      <div class="b alt" [style.height.%]="(w.tonnage / maxTonnage()) * 100"></div>
                      <span class="lab">{{ weekLabel(w.start) }}</span>
                    </div>
                  }
                </div>
                <p class="hint">Peso × repeticiones de todas tus series. Si sube con las semanas, estás progresando.</p>
              </ion-card-content>
            </ion-card>

            @if (muscles().length > 0) {
              <ion-card>
                <ion-card-header><ion-card-title>Series por músculo (últimos 7 días)</ion-card-title></ion-card-header>
                <ion-card-content>
                  @for (m of muscles(); track m.key) {
                    <div class="mrow">
                      <span class="lbl">{{ m.label }}</span>
                      <div
                        class="track"
                        role="img"
                        [attr.aria-label]="m.label + ': ' + m.sets + ' series, rango ' + m.lo + ' a ' + m.hi"
                      >
                        <div
                          class="band"
                          [style.left.%]="(m.lo / 24) * 100"
                          [style.width.%]="((m.hi - m.lo) / 24) * 100"
                        ></div>
                        <div class="fill" [class]="m.status" [style.width.%]="(Math.min(m.sets, 24) / 24) * 100"></div>
                      </div>
                      <span class="num">{{ m.sets }}</span>
                    </div>
                  }
                  <p class="hint">
                    La banda verde es el rango recomendado por semana para tu nivel (Schoenfeld 2017, Israetel).
                    Amarillo = te falta; rojo = te pasaste.
                  </p>
                </ion-card-content>
              </ion-card>
            }

            @if (st.strength.length > 0) {
              <ion-card>
                <ion-card-header><ion-card-title>Fuerza (1RM estimado)</ion-card-title></ion-card-header>
                <ion-card-content>
                  @for (t of st.strength; track t.exercise.id) {
                    <div class="srow">
                      <div class="sname">
                        <span>{{ name(t.exercise) }}</span>
                        <small>{{ t.first }} → {{ t.last }} kg</small>
                      </div>
                      <svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
                        <polyline
                          [attr.points]="spark(t.points)"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          vector-effect="non-scaling-stroke"
                        />
                      </svg>
                      <span class="delta" [class.up]="t.last >= t.first" [class.down]="t.last < t.first">
                        <ion-icon
                          [name]="t.last >= t.first ? 'trending-up-outline' : 'trending-down-outline'"
                          aria-hidden="true"
                        ></ion-icon>
                        {{ pct(t.first, t.last) }}
                      </span>
                    </div>
                  }
                </ion-card-content>
              </ion-card>
            }

            <ion-card>
              <ion-card-header><ion-card-title>Carga de entrenamiento</ion-card-title></ion-card-header>
              <ion-card-content>
                <div class="bars" role="img" aria-label="Carga semanal">
                  @for (w of st.weeks; track w.start) {
                    <div class="col">
                      <span class="val">{{ w.load ? Math.round(w.load) : '' }}</span>
                      <div class="b warn" [style.height.%]="(w.load / maxLoad()) * 100"></div>
                      <span class="lab">{{ weekLabel(w.start) }}</span>
                    </div>
                  }
                </div>
                <p class="hint">
                  Esfuerzo de la sesión × minutos (Foster 1998). Evita saltos bruscos de una semana a otra.
                </p>
              </ion-card-content>
            </ion-card>
          }

          <ion-card>
            <ion-card-header><ion-card-title>Cuerpo</ion-card-title></ion-card-header>
            <ion-card-content>
              @if (st.weightAvailable) {
                <div class="body-head">
                  <div class="kpi flat">
                    <strong>{{ lastWeight() ?? '–' }}</strong
                    ><span>kg</span>
                  </div>
                  <div class="kpi flat">
                    <strong>{{ bmi() ?? '–' }}</strong
                    ><span>IMC</span>
                  </div>
                  <div class="kpi flat">
                    <strong>{{ weightDelta() }}</strong
                    ><span>en 30 días</span>
                  </div>
                </div>
                @if (st.weights.length > 1) {
                  <svg
                    class="spark wide"
                    viewBox="0 0 100 28"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Evolución de tu peso"
                  >
                    <polyline
                      [attr.points]="spark(weightPoints())"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      vector-effect="non-scaling-stroke"
                    />
                  </svg>
                }
                <div class="weigh">
                  <ion-input
                    label="Peso de hoy (kg)"
                    labelPlacement="floating"
                    fill="outline"
                    type="number"
                    inputmode="decimal"
                    [(ngModel)]="weightInput"
                  ></ion-input>
                  <ion-button (click)="saveWeight()" [disabled]="savingWeight()">Guardar</ion-button>
                </div>
                <p class="hint">
                  Pésate 1 vez por semana a la misma hora. El IMC es solo una referencia: no distingue músculo de grasa.
                </p>
              } @else {
                <p class="hint">El registro de peso se activa al ejecutar la migración 011 en Supabase.</p>
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
    .kpis {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 4px;
    }
    .kpi {
      background: var(--ion-color-light);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kpi ion-icon {
      color: var(--ion-color-primary);
      font-size: 1.2rem;
    }
    .kpi strong {
      font-size: 1.5rem;
      line-height: 1.1;
    }
    .kpi span {
      font-size: 0.78rem;
      color: var(--ion-color-medium);
    }
    .kpi.flat {
      background: transparent;
      padding: 0;
    }
    .body-head {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 140px;
    }
    .col {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      min-width: 0;
    }
    .b {
      width: 100%;
      max-width: 28px;
      min-height: 2px;
      background: var(--ion-color-primary);
      border-radius: 4px 4px 0 0;
    }
    .b.alt {
      background: var(--dv-chart2);
    }
    .b.warn {
      background: var(--ion-color-tertiary);
    }
    .val {
      font-size: 0.68rem;
      color: var(--ion-color-medium);
      height: 14px;
    }
    .lab {
      font-size: 0.62rem;
      color: var(--ion-color-medium);
      margin-top: 4px;
      white-space: nowrap;
    }
    .mrow {
      display: grid;
      grid-template-columns: 96px 1fr 28px;
      gap: 8px;
      align-items: center;
      margin: 6px 0;
      font-size: 0.85rem;
    }
    .track {
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
    .srow {
      display: grid;
      grid-template-columns: 1fr 80px 64px;
      gap: 8px;
      align-items: center;
      margin: 10px 0;
    }
    .sname {
      display: flex;
      flex-direction: column;
      font-size: 0.88rem;
    }
    .sname small {
      color: var(--ion-color-medium);
    }
    .spark {
      width: 80px;
      height: 28px;
      color: var(--ion-color-primary);
    }
    .spark.wide {
      width: 100%;
      height: 56px;
      margin-bottom: 8px;
    }
    .delta {
      font-size: 0.8rem;
      text-align: right;
      font-weight: 600;
    }
    .delta.up {
      color: var(--ion-color-success);
    }
    .delta.down {
      color: var(--ion-color-danger);
    }
    .weigh {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .weigh ion-input {
      flex: 1;
      margin-bottom: 0;
    }
    .weigh ion-button {
      margin-top: 4px;
    }
  `,
})
export class ProgressPage implements ViewWillEnter {
  private readonly stats = inject(StatsService);
  private readonly profiles = inject(ProfileService);
  private readonly catalog = inject(ExerciseService);
  private readonly toasts = inject(ToastController);

  readonly Math = Math;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly s = signal<Stats | null>(null);
  readonly savingWeight = signal(false);
  weightInput: number | null = null;
  readonly name = exerciseName;

  constructor() {
    addIcons({
      barbellOutline,
      flameOutline,
      flashOutline,
      speedometerOutline,
      timeOutline,
      trendingDownOutline,
      trendingUpOutline,
    });
  }

  ionViewWillEnter() {
    void this.load();
  }

  async refresh(ev: RefresherCustomEvent) {
    await this.load();
    await ev.target.complete();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.profiles.load().catch(() => undefined);
      await this.catalog.ensureLoaded();
      this.s.set(await this.stats.load());
    } catch {
      if (!this.s()) this.error.set('No se pudieron cargar tus métricas. Revisa tu internet.');
    } finally {
      this.loading.set(false);
    }
  }

  readonly maxSessions = computed(() => Math.max(1, ...(this.s()?.weeks.map((w) => w.sessions) ?? [1])));
  readonly maxTonnage = computed(() => Math.max(1, ...(this.s()?.weeks.map((w) => w.tonnage) ?? [1])));
  readonly maxLoad = computed(() => Math.max(1, ...(this.s()?.weeks.map((w) => w.load) ?? [1])));

  readonly muscles = computed(() => {
    const st = this.s();
    const h = this.profiles.health();
    if (!st || !h) return [];
    const p = buildAthleteProfile(
      h,
      this.profiles.injuries(),
      ageFrom(this.profiles.profile()?.birth_date ?? null),
      this.profiles.profile()?.gender ?? null,
    );
    return TRACKED_MUSCLES.filter((m) => st.muscleSets.has(m)).map((m) => {
      const [lo, hi] = weeklyRange(m, p.programme)!;
      const sets = st.muscleSets.get(m)!;
      return {
        key: m,
        label: MUSCLE_LABEL_ES[m],
        sets,
        lo,
        hi,
        status: sets < lo ? 'bajo' : sets > hi ? 'alto' : 'optimo',
      };
    });
  });

  readonly weightPoints = computed(() => (this.s()?.weights ?? []).slice(-30).map((w) => w.weight_kg));
  readonly lastWeight = computed(
    () =>
      this.s()?.weights.at(-1)?.weight_kg ??
      (this.profiles.profile()?.weight_kg ? Number(this.profiles.profile()!.weight_kg) : null),
  );
  readonly bmi = computed(() => {
    const kg = this.lastWeight();
    const cm = this.profiles.profile()?.height_cm;
    if (!kg || !cm) return null;
    return (kg / Math.pow(Number(cm) / 100, 2)).toFixed(1);
  });
  readonly weightDelta = computed(() => {
    const w = this.s()?.weights ?? [];
    if (w.length < 2) return '–';
    const last = w.at(-1)!;
    const ref =
      [...w]
        .reverse()
        .find((x) => new Date(last.measured_on).getTime() - new Date(x.measured_on).getTime() >= 25 * 86_400_000) ??
      w[0];
    const d = last.weight_kg - ref.weight_kg;
    return (d > 0 ? '+' : '') + d.toFixed(1) + ' kg';
  });

  weekSummary(): string {
    return (this.s()?.weeks ?? []).map((w) => `${this.weekLabel(w.start)} ${w.sessions}`).join(', ');
  }
  weekLabel(d: Date): string {
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  kilo(n: number): string {
    return n >= 1000 ? (n / 1000).toFixed(1) + 't' : String(Math.round(n));
  }
  hours(min: number): string {
    return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
  }
  pct(a: number, b: number): string {
    const d = ((b - a) / a) * 100;
    return (d > 0 ? '+' : '') + d.toFixed(0) + '%';
  }
  spark(points: number[]): string {
    if (points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    return points
      .map((v, i) => `${(i / Math.max(1, points.length - 1)) * 100},${26 - ((v - min) / span) * 24}`)
      .join(' ');
  }

  async saveWeight() {
    const kg = Number(this.weightInput);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      await this.toast('Escribe un peso entre 20 y 400 kg.');
      return;
    }
    this.savingWeight.set(true);
    try {
      await this.stats.addWeight(Math.round(kg * 10) / 10);
      this.weightInput = null;
      await this.load();
      await this.toast('Peso guardado.');
    } catch {
      await this.toast('No se pudo guardar. ¿Ya ejecutaste la migración 011?');
    } finally {
      this.savingWeight.set(false);
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3000, position: 'top' });
    await t.present();
  }
}
