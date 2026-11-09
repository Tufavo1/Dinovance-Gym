import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, type OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonReorder,
  IonReorderGroup,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  ToastController,
  type ItemReorderEventDetail,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, chevronDown, chevronUp, ellipsisHorizontal, refresh, remove, trash, trashOutline } from 'ionicons/icons';

import { ExerciseService } from '../../core/exercise.service';
import { localStore } from '../../core/local-store';
import {
  MAX_EXERCISES_PER_DAY,
  analyzePlan,
  canAdd,
  minutesWith,
  moveMuscle,
  neighborConflict,
  sortDay,
  suggestDay,
  type PlanAction,
  type PlanDay,
  type PlanItem,
  type PlanWarning,
} from '../../core/manual/manual-plan';
import { PART_GUIDE } from '../../core/manual/part-guide';
import {
  BODY_AREA_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  PLACE_OPTIONS,
  labelOf,
  type Exercise,
} from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { buildAthleteProfile } from '../../core/routine/athlete-profile';
import { exerciseName } from '../../core/routine/exercise-names';
import { exercisesForMuscle, type GeneratedRoutine, type MuscleOption } from '../../core/routine/generator';
import { MUSCLE_ES } from '../../core/routine/rules';
import { RoutineService, ageFrom } from '../../core/routine.service';
import { BODY_PARTS, BodyMapComponent, type BodyPart, type BodyView } from '../../shared/body-map.component';
import { HelpButtonComponent } from '../../shared/help-button.component';
import { TabBarComponent } from '../../shared/tab-bar.component';

/** Ejercicio de una zona, con el músculo por el que aparece. */
type PartOption = MuscleOption & { muscle: string };
type Mode = 'agregar' | 'dia';
type Field = 'sets' | 'reps_min' | 'reps_max' | 'rest_seconds';

interface DraftItem {
  exercise_id: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
  recommended: PlanItem['recommended'];
}

interface Draft {
  place: string;
  days: DraftItem[][];
}

/** Zonas agrupadas por región (Ley de Proximidad) como alternativa con botones grandes al mapa. */
const REGIONS: { label: string; parts: string[] }[] = [
  { label: 'Tren superior', parts: ['pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'trapecio', 'antebrazos'] },
  { label: 'Core', parts: ['abdomen', 'lumbar'] },
  { label: 'Tren inferior', parts: ['gluteos', 'cuadriceps', 'isquiotibiales', 'cadera', 'pantorrillas'] },
];

@Component({
  selector: 'app-manual',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonReorder,
    IonReorderGroup,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonThumbnail,
    BodyMapComponent,
    HelpButtonComponent,
    TabBarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Crear mi rutina</ion-title>
        <ion-buttons slot="end">
          <ion-button
            color="danger"
            [disabled]="totalItems() === 0"
            (click)="clearAll()"
            aria-label="Limpiar todos los ejercicios"
          >
            <ion-icon slot="start" name="trash-outline"></ion-icon> Limpiar
          </ion-button>
          <app-help-button></app-help-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Contexto fijo: días (Jakob: tarjetas como en un calendario) -->
      @if (!loading()) {
        <ion-toolbar class="days-bar">
          <div class="days" role="tablist" aria-label="Días de la rutina">
            @for (d of days(); track $index; let i = $index) {
              <button
                class="day-card"
                role="tab"
                [attr.aria-selected]="dayIdx() === i"
                [class.on]="dayIdx() === i"
                (click)="selectDay(i)"
              >
                <span class="d-num">Día {{ i + 1 }}</span>
                <span class="d-name">{{ d.length ? dayName(i) : 'Vacío' }}</span>
                <span class="d-meta">
                  {{ d.length }} ej · {{ analysis().dayMinutes[i] || 0 }} min
                  @if (dayAlerts(i) > 0) {
                    <i class="d-alert" aria-label="Tiene sugerencias">●</i>
                  }
                </span>
              </button>
            }
          </div>
        </ion-toolbar>
        <ion-toolbar class="mode-bar">
          <ion-segment [value]="mode()" (ionChange)="mode.set($any($event.detail.value))">
            <ion-segment-button value="agregar"><ion-label>➕ Agregar</ion-label></ion-segment-button>
            <ion-segment-button value="dia">
              <ion-label>📋 Día {{ dayIdx() + 1 }} ({{ day().length }})</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      <div class="page">
        @if (loading()) {
          <div class="center"><ion-spinner></ion-spinner></div>
        } @else {
          <!-- Tus respuestas en una línea; el detalle solo si lo pide (Hick) -->
          <button class="me" (click)="showMe.set(!showMe())" [attr.aria-expanded]="showMe()">
            <span>🎯 {{ goalLabel() }} · ⏱ {{ minutes() }} min · 📍 {{ placeLabel(place()) }}</span>
            <ion-icon [name]="showMe() ? 'chevron-up' : 'chevron-down'"></ion-icon>
          </button>
          @if (showMe()) {
            <div class="me-detail">
              <p>Nivel: {{ levelLabel() }} · {{ days().length }} días por semana</p>
              @if (injuryText()) {
                <p class="hurt-text">⚠ Lesión activa: {{ injuryText() }} (zonas en rojo)</p>
              }
              @if (places().length > 1) {
                <ion-select
                  label="Lugar"
                  labelPlacement="floating"
                  fill="outline"
                  interface="popover"
                  [value]="place()"
                  (ionChange)="changePlace($event.detail.value)"
                >
                  @for (p of places(); track p.value) {
                    <ion-select-option [value]="p.value">{{ p.label }}</ion-select-option>
                  }
                </ion-select>
              }
              <a routerLink="/perfil">Editar mis respuestas</a>
            </div>
          }

          @if (mode() === 'agregar') {
            <!-- ========== MODO AGREGAR: elegir zona ========== -->
            <h2 class="ask">¿Qué quieres entrenar el Día {{ dayIdx() + 1 }}?</h2>

            <section class="map-box">
              <ion-segment [value]="view()" (ionChange)="view.set($any($event.detail.value))" class="view-seg">
                <ion-segment-button value="front"><ion-label>Frente</ion-label></ion-segment-button>
                <ion-segment-button value="back"><ion-label>Espalda</ion-label></ion-segment-button>
              </ion-segment>
              <app-body-map
                [view]="view()"
                [active]="activeParts()"
                [injured]="injuredParts()"
                (pick)="openPart($event)"
              ></app-body-map>
              <p class="legend">
                Toca una zona · <span class="dot has"></span> en este día <span class="dot hurt"></span> lesión
              </p>
            </section>

            <p class="or">o elige de la lista</p>
            @for (r of regions; track r.label) {
              <p class="region">{{ r.label }}</p>
              <div class="parts">
                @for (id of r.parts; track id) {
                  <button
                    class="part-btn"
                    [class.has]="partCount(id) > 0"
                    [class.hurt]="injuredParts().includes(id)"
                    (click)="openPart(id)"
                  >
                    {{ partLabel(id) }}
                    @if (partCount(id) > 0) {
                      <b>{{ partCount(id) }}</b>
                    }
                  </button>
                }
              </div>
            }
          } @else {
            <!-- ========== MODO MI DÍA: lo agregado, su tiempo y sus avisos ========== -->
            <section class="day-head">
              <div class="day-title-row">
                <h2>Día {{ dayIdx() + 1 }} · {{ day().length ? dayName(dayIdx()) : 'Vacío' }}</h2>
                @if (day().length) {
                  <ion-button fill="clear" (click)="dayMenu()" aria-label="Opciones del día">
                    <ion-icon slot="icon-only" name="ellipsis-horizontal"></ion-icon>
                  </ion-button>
                }
              </div>
              <div class="time" [class.over]="dayMinutesNow() > minutes() + 10">
                <div class="time-track"><div class="time-fill" [style.width.%]="timePct()"></div></div>
                <span
                  >≈ {{ dayMinutesNow() }} de {{ minutes() }} min · {{ day().length }} de
                  {{ maxPerDay }} ejercicios</span
                >
              </div>
            </section>

            @for (w of currentDayWarnings(); track w.id) {
              <ng-container *ngTemplateOutlet="warnTpl; context: { $implicit: w }"></ng-container>
            }

            @if (day().length === 0) {
              <div class="empty">
                <p>Este día está vacío.</p>
                <ion-button size="large" (click)="mode.set('agregar')">➕ Agregar ejercicios</ion-button>
              </div>
            } @else {
              <p class="hint">Toca un ejercicio para cambiar series y descanso · arrastra ≡ para ordenar.</p>
              <ion-list lines="full" class="group">
                <ion-reorder-group [disabled]="false" (ionItemReorder)="reorder($event.detail)">
                  @for (it of day(); track it.exercise.id; let k = $index) {
                    <ion-item button [detail]="false" (click)="editIdx.set(k)">
                      @if (img(it.exercise); as src) {
                        <ion-thumbnail slot="start"><img [src]="src" alt="" /></ion-thumbnail>
                      }
                      <ion-label class="ion-text-wrap">
                        <h3>{{ name(it.exercise) }}</h3>
                        <p>{{ rx(it) }}</p>
                        @if (changed(it)) {
                          <p class="custom">Personalizado</p>
                        }
                      </ion-label>
                      <ion-reorder slot="end"></ion-reorder>
                    </ion-item>
                  }
                </ion-reorder-group>
              </ion-list>
              <ion-button expand="block" fill="outline" (click)="mode.set('agregar')">➕ Agregar más</ion-button>
            }
          }
        }
      </div>
    </ion-content>

    <!-- Acción principal siempre abajo (Fitts) -->
    <ion-footer>
      <ion-toolbar>
        <div class="actions">
          <ion-button
            class="main"
            size="large"
            [disabled]="loading() || totalItems() === 0"
            (click)="reviewOpen.set(true)"
          >
            Revisar y guardar ({{ totalItems() }})
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>

    <app-tab-bar active="crear"></app-tab-bar>

    <!-- Aviso con su acción (se reutiliza en "Mi día" y en la revisión) -->
    <ng-template #warnTpl let-w>
      <div class="warn" [class.alto]="w.level === 'alto'" [class.medio]="w.level === 'medio'">
        <p>{{ w.text }}</p>
        @if (w.action; as a) {
          <ion-button size="small" (click)="applyAction(a)">{{ a.label }}</ion-button>
        }
      </div>
    </ng-template>

    <!-- ========== Hoja de una zona: solo sus ejercicios ========== -->
    <ion-modal
      [isOpen]="part() !== null"
      (didDismiss)="part.set(null)"
      [initialBreakpoint]="0.92"
      [breakpoints]="[0, 0.92, 1]"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ part()?.label }} · Día {{ dayIdx() + 1 }}</ion-title>
            <ion-buttons slot="end">
              <ion-button strong (click)="part.set(null)">Listo</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          @if (part(); as pt) {
            <section class="part-intro">
              <p>
                <strong>{{ pt.label }}:</strong> {{ pt.hint }}
              </p>
              <p class="count" [class.full]="day().length >= maxPerDay">
                Día {{ dayIdx() + 1 }}: {{ day().length }} de {{ maxPerDay }} ejercicios
              </p>
            </section>

            @if (injuredParts().includes(pt.id)) {
              <div class="warn alto">
                <p>
                  Tienes una lesión activa en {{ injuryText() }}. No te recomendamos entrenar esta zona hasta que te
                  recuperes; si quieres hacerlo, que sea con autorización de tu kinesiólogo o médico.
                </p>
              </div>
            }
            @if (neighborWarning(); as nw) {
              <p class="warn-inline">{{ nw }}</p>
            }

            @if (loadingOptions()) {
              <div class="center"><ion-spinner></ion-spinner></div>
            } @else if (options().length === 0) {
              <p>
                Con tu equipamiento, nivel y salud no hay ejercicios seguros para esta zona. Prueba otro lugar o pide
                ayuda al profesor de sala.
              </p>
            } @else {
              <h3 class="sec">⭐ Recomendados para {{ pt.label.toLowerCase() }}</h3>
              @for (o of recommendedOptions(); track o.exercise.id) {
                <ng-container *ngTemplateOutlet="optRow; context: { $implicit: o }"></ng-container>
              }

              @if (guide(); as g) {
                <h3 class="sec">💡 Consejos</h3>
                <ul class="tips">
                  @for (t of g.tips; track t) {
                    <li>{{ t }}</li>
                  }
                </ul>
                @if (pairParts().length > 0) {
                  <h3 class="sec">🤝 Combina bien el mismo día con</h3>
                  <p class="hint">{{ g.pairWhy }}</p>
                  <div class="parts">
                    @for (pp of pairParts(); track pp.id) {
                      <button class="part-btn" (click)="openPart(pp.id)">{{ pp.label }}</button>
                    }
                  </div>
                }
              }

              <h3 class="sec">Todos los ejercicios</h3>
              @if (pt.muscles.length > 1) {
                <div class="parts">
                  <button class="part-btn" [class.sel]="muscleFilter() === 'all'" (click)="muscleFilter.set('all')">
                    Todos
                  </button>
                  @for (m of pt.muscles; track m) {
                    <button class="part-btn" [class.sel]="muscleFilter() === m" (click)="muscleFilter.set(m)">
                      {{ muscleLabel(m) }}
                    </button>
                  }
                </div>
              }
              @for (g of groupedOptions(); track g.label) {
                <p class="region">{{ g.label }}</p>
                @for (o of g.items; track o.exercise.id) {
                  <ng-container *ngTemplateOutlet="optRow; context: { $implicit: o }"></ng-container>
                }
              }
            }
          }
        </ion-content>
      </ng-template>
    </ion-modal>

    <ng-template #optRow let-o>
      <div class="opt" [class.rec]="o.recommended">
        @if (img(o.exercise); as src) {
          <img [src]="src" alt="" />
        }
        <span>
          <strong>{{ name(o.exercise) }}</strong>
          <small
            >{{ o.item.sets }} × {{ o.item.reps_min }}-{{ o.item.reps_max }} · descanso
            {{ clock(o.item.rest_seconds) }}</small
          >
        </span>
        @if (inDay(o.exercise.id)) {
          <ion-button fill="outline" (click)="removeById(o.exercise.id)" aria-label="Quitar del día">✓</ion-button>
        } @else {
          <ion-button (click)="addOption(o)">Agregar</ion-button>
        }
      </div>
    </ng-template>

    <!-- ========== Hoja de edición de un ejercicio (controles grandes) ========== -->
    <ion-modal
      [isOpen]="editing() !== null"
      (didDismiss)="editIdx.set(null)"
      [initialBreakpoint]="0.75"
      [breakpoints]="[0, 0.75, 1]"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Editar ejercicio</ion-title>
            <ion-buttons slot="end"><ion-button strong (click)="editIdx.set(null)">Listo</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          @if (editing(); as it) {
            <h3 class="sec">{{ name(it.exercise) }}</h3>
            @for (f of fields; track f.key) {
              <div class="field">
                <span>{{ f.label }}</span>
                <ion-button fill="outline" (click)="bump(f.key, -f.step)" [attr.aria-label]="'Menos ' + f.label">
                  <ion-icon slot="icon-only" name="remove"></ion-icon>
                </ion-button>
                <strong>{{ f.key === 'rest_seconds' ? clock(it.rest_seconds) : it[f.key] }}</strong>
                <ion-button fill="outline" (click)="bump(f.key, f.step)" [attr.aria-label]="'Más ' + f.label">
                  <ion-icon slot="icon-only" name="add"></ion-icon>
                </ion-button>
              </div>
            }
            <p class="hint">
              Recomendado para ti: {{ it.recommended.sets }} × {{ it.recommended.reps_min }}-{{
                it.recommended.reps_max
              }}
              · descanso {{ clock(it.recommended.rest_seconds) }}. Es tu rutina: puedes cambiarlo.
            </p>
            @if (restNote(it); as n) {
              <p class="warn-inline">{{ n }}</p>
            }
            <div class="edit-actions">
              <ion-button fill="outline" (click)="resetItem()">
                <ion-icon slot="start" name="refresh"></ion-icon> Volver a lo recomendado
              </ion-button>
              <ion-button fill="clear" color="danger" (click)="removeItem()">
                <ion-icon slot="start" name="trash"></ion-icon> Quitar del día
              </ion-button>
            </div>
          }
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- ========== Revisión final: intensidad, días, volumen y sugerencias ========== -->
    <ion-modal [isOpen]="reviewOpen()" (didDismiss)="reviewOpen.set(false)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start"><ion-button (click)="reviewOpen.set(false)">Volver</ion-button></ion-buttons>
            <ion-title>Revisa tu rutina</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="gauge" [attr.data-level]="analysis().intensity.level">
            <span>Intensidad total</span>
            <strong>{{ analysis().intensity.label }}</strong>
            <div class="bars">
              @for (n of [1, 2, 3, 4]; track n) {
                <i [class.on]="n <= analysis().intensity.level"></i>
              }
            </div>
            <small>{{ analysis().intensity.text }} {{ analysis().totalSets }} series a la semana.</small>
          </div>

          @if (analysis().warnings.length > 0) {
            <h3 class="sec">💡 Antes de guardar</h3>
            @for (w of reviewWarnings(); track w.id) {
              <ng-container *ngTemplateOutlet="warnTpl; context: { $implicit: w }"></ng-container>
            }
          }

          <h3 class="sec">Tus días</h3>
          @for (d of days(); track $index; let i = $index) {
            <button class="sum-day" (click)="goToDay(i)">
              <strong>Día {{ i + 1 }} · {{ d.length ? dayName(i) : 'Vacío' }}</strong>
              <small>
                {{ d.length }} ejercicios · ≈ {{ analysis().dayMinutes[i] }} min
                @if (analysis().dayMinutes[i] > minutes() + 10) {
                  · ⚠ más que tus {{ minutes() }} min
                }
              </small>
            </button>
          }

          <h3 class="sec">Series por músculo a la semana</h3>
          <p class="hint">Para progresar: {{ range()[0] }} a {{ range()[1] }} por músculo.</p>
          @for (v of analysis().weekly; track v.muscle) {
            <div class="vol">
              <span>{{ muscleLabel(v.muscle) }}</span>
              <div class="track"><div class="fill" [class]="v.status" [style.width.%]="volPct(v.sets)"></div></div>
              <strong>{{ v.sets }}</strong>
            </div>
          }
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <div class="actions">
              <ion-button class="main" size="large" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'Guardando…' : 'Guardar rutina' }}
              </ion-button>
            </div>
          </ion-toolbar>
        </ion-footer>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: 'manual.page.scss',
})
export class ManualPage implements OnInit {
  private readonly profiles = inject(ProfileService);
  private readonly catalog = inject(ExerciseService);
  private readonly routines = inject(RoutineService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly sheets = inject(ActionSheetController);
  private readonly toasts = inject(ToastController);

  readonly regions = REGIONS;
  readonly maxPerDay = MAX_EXERCISES_PER_DAY;
  readonly fields: { key: Field; label: string; step: number }[] = [
    { key: 'sets', label: 'Series', step: 1 },
    { key: 'reps_min', label: 'Repeticiones mín.', step: 1 },
    { key: 'reps_max', label: 'Repeticiones máx.', step: 1 },
    { key: 'rest_seconds', label: 'Descanso', step: 15 },
  ];

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly place = signal('');
  readonly days = signal<PlanDay[]>([]);
  readonly dayIdx = signal(0);
  readonly mode = signal<Mode>('agregar');
  readonly view = signal<BodyView>('front');
  readonly showMe = signal(false);
  readonly part = signal<BodyPart | null>(null);
  readonly options = signal<PartOption[]>([]);
  readonly loadingOptions = signal(false);
  readonly muscleFilter = signal<string>('all');
  readonly editIdx = signal<number | null>(null);
  readonly reviewOpen = signal(false);

  readonly name = (e: Exercise) => exerciseName(e);

  // ---------- Perfil ----------
  readonly athlete = computed(() => {
    const h = this.profiles.health();
    if (!h) return null;
    const pr = this.profiles.profile();
    return buildAthleteProfile(h, this.profiles.injuries(), ageFrom(pr?.birth_date ?? null), pr?.gender ?? null);
  });
  readonly minutes = computed(() => this.athlete()?.minutes ?? 60);
  readonly goalLabel = computed(() => labelOf(GOAL_OPTIONS, this.profiles.health()?.goal));
  readonly levelLabel = computed(() => labelOf(EXPERIENCE_OPTIONS, this.profiles.health()?.experience).split(' (')[0]);
  readonly places = computed(() =>
    (this.profiles.health()?.places ?? []).map((p) => ({ value: p, label: labelOf(PLACE_OPTIONS, p) })),
  );

  // ---------- Plan ----------
  readonly day = computed(() => this.days()[this.dayIdx()] ?? []);
  readonly totalItems = computed(() => this.days().reduce((n, d) => n + d.length, 0));
  readonly editing = computed(() => {
    const k = this.editIdx();
    return k === null ? null : (this.day()[k] ?? null);
  });
  readonly analysis = computed(() => {
    const p = this.athlete();
    return p
      ? analyzePlan(this.days(), p, this.blockedMuscles())
      : {
          warnings: [] as PlanWarning[],
          weekly: [],
          dayMinutes: [],
          totalSets: 0,
          intensity: { level: 1 as const, label: '', text: '' },
        };
  });
  readonly dayMinutesNow = computed(() => this.analysis().dayMinutes[this.dayIdx()] ?? 0);
  readonly timePct = computed(() => Math.min(100, (this.dayMinutesNow() / Math.max(1, this.minutes())) * 100));
  /** Avisos del día elegido (Proximidad: junto a su lista), sin el de "día vacío". */
  readonly currentDayWarnings = computed(() =>
    this.analysis().warnings.filter((w) => w.day === this.dayIdx() && !w.id.startsWith('vacio')),
  );
  /** En la revisión: primero los generales y luego los de cada día. */
  readonly reviewWarnings = computed(() => {
    const ws = this.analysis().warnings.filter((w) => !w.id.startsWith('vacio'));
    return [...ws.filter((w) => w.day === undefined), ...ws.filter((w) => w.day !== undefined)];
  });
  readonly range = computed<[number, number]>(() => (this.athlete()?.beginner ? [6, 15] : [10, 20]));

  // ---------- Lesiones ----------
  readonly injuryText = computed(() =>
    this.profiles
      .injuries()
      .filter((i) => i.status === 'activa')
      .map((i) => labelOf(BODY_AREA_OPTIONS, i.body_area).toLowerCase())
      .join(', '),
  );
  readonly injuredParts = computed(() => {
    const areas = new Set(
      this.profiles
        .injuries()
        .filter((i) => i.status === 'activa')
        .map((i) => i.body_area),
    );
    const risky = new Set(
      this.catalog
        .areaMuscles()
        .filter((a) => areas.has(a.area) && a.risk === 'alto')
        .map((a) => a.muscle),
    );
    return Object.values(BODY_PARTS)
      .filter((p) => p.muscles.some((m) => risky.has(m)))
      .map((p) => p.id);
  });
  readonly blockedMuscles = computed(() => new Set(this.injuredParts().flatMap((id) => BODY_PARTS[id]?.muscles ?? [])));
  readonly activeParts = computed(() =>
    Object.values(BODY_PARTS)
      .filter((p) => this.partCount(p.id) > 0)
      .map((p) => p.id),
  );

  // ---------- Zona abierta ----------
  readonly guide = computed(() => (this.part() ? (PART_GUIDE[this.part()!.id] ?? null) : null));
  readonly pairParts = computed(() =>
    (this.guide()?.pairsWith ?? [])
      .filter((id) => !this.injuredParts().includes(id))
      .map((id) => BODY_PARTS[id])
      .filter((p): p is BodyPart => !!p),
  );
  readonly recommendedOptions = computed(() => this.options().filter((o) => o.recommended));
  readonly groupedOptions = computed(() => {
    const f = this.muscleFilter();
    const rest = this.options().filter((o) => !o.recommended && (f === 'all' || o.muscle === f));
    const order = ['Máquinas', 'Poleas', 'Peso libre', 'Peso corporal'];
    const groups = new Map<string, PartOption[]>();
    for (const o of rest) {
      const g = this.equipmentGroup(o.exercise);
      groups.set(g, [...(groups.get(g) ?? []), o]);
    }
    return order.filter((g) => groups.has(g)).map((label) => ({ label, items: groups.get(label)! }));
  });
  readonly neighborWarning = computed(() => {
    const pt = this.part();
    if (!pt) return null;
    const m = pt.muscles.find((x) => neighborConflict(this.days(), this.dayIdx(), x) !== null);
    if (!m) return null;
    const n = neighborConflict(this.days(), this.dayIdx(), m)!;
    return `Ojo: ya entrenas ${MUSCLE_ES[m] ?? m} el Día ${n + 1}, pegado a este. Necesita ~48 h para recuperarse.`;
  });

  constructor() {
    addIcons({ add, chevronDown, chevronUp, ellipsisHorizontal, refresh, remove, trash, trashOutline });
    // Tesler: borrador automático; si sale y vuelve, sigue donde quedó.
    effect(() => {
      if (this.loading()) return;
      const draft: Draft = {
        place: this.place(),
        days: this.days().map((d) =>
          d.map((it) => ({
            exercise_id: it.exercise.id,
            sets: it.sets,
            reps_min: it.reps_min,
            reps_max: it.reps_max,
            rest_seconds: it.rest_seconds,
            notes: it.notes,
            recommended: it.recommended,
          })),
        ),
      };
      localStore.set('manual.draft', draft);
    });
  }

  async ngOnInit() {
    try {
      await this.profiles.load();
      await this.catalog.ensureLoaded();
      const n = Math.min(7, Math.max(1, this.profiles.health()?.days_per_week ?? 3));
      const draft = localStore.get<Draft>('manual.draft');
      const byId = this.catalog.byId();
      const restored = (draft?.days ?? []).map((d) =>
        d.filter((x) => byId.has(x.exercise_id)).map((x) => ({ ...x, exercise: byId.get(x.exercise_id)! }) as PlanItem),
      );
      this.days.set(Array.from({ length: n }, (_, i) => restored[i] ?? []));
      this.place.set(draft?.place || this.profiles.health()?.places?.[0] || 'smartfit');
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Días ----------

  selectDay(i: number) {
    this.dayIdx.set(i);
    this.editIdx.set(null);
  }

  goToDay(i: number) {
    this.reviewOpen.set(false);
    this.selectDay(i);
    this.mode.set('dia');
  }

  dayAlerts(i: number): number {
    return this.analysis().warnings.filter((w) => w.day === i && w.level !== 'info').length;
  }

  /** Menú del día (Jakob: acciones secundarias en "⋯"). */
  async dayMenu() {
    const i = this.dayIdx();
    const others = this.days()
      .map((_, k) => k)
      .filter((k) => k !== i);
    const sheet = await this.sheets.create({
      header: `Día ${i + 1}`,
      buttons: [
        ...others.map((k) => ({ text: `Copiar al Día ${k + 1}`, data: { copyTo: k } })),
        { text: 'Vaciar este día', role: 'destructive', data: { clear: true } },
        { text: 'Vaciar toda la rutina', role: 'destructive', data: { clearAll: true } },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
    const { data } = await sheet.onDidDismiss<{ copyTo?: number; clear?: boolean; clearAll?: boolean }>();
    if (data?.clearAll) {
      await this.clearAll();
      return;
    }
    if (data?.copyTo !== undefined) await this.copyDay(i, data.copyTo);
    if (data?.clear) {
      const ok = await this.ask('Vaciar día', `¿Quitar todos los ejercicios del Día ${i + 1}?`, [
        { text: 'Vaciar', role: 'ok' },
        { text: 'Cancelar', role: 'cancel' },
      ]);
      if (ok === 'ok') this.days.update((ds) => ds.map((d, k) => (k === i ? [] : d)));
    }
  }

  /** Limpia los ejercicios de todos los días (con confirmación y opción de deshacer). */
  async clearAll() {
    const total = this.totalItems();
    if (total === 0) return;
    const ok = await this.ask(
      'Limpiar toda la rutina',
      `Se quitarán los ${total} ejercicios de todos los días. Podrás deshacerlo unos segundos.`,
      [
        { text: 'Limpiar todo', role: 'ok' },
        { text: 'Cancelar', role: 'cancel' },
      ],
    );
    if (ok !== 'ok') return;
    const before = this.days();
    this.days.set(before.map(() => []));
    this.editIdx.set(null);
    this.mode.set('agregar');
    const t = await this.toasts.create({
      message: 'Rutina vacía.',
      duration: 5000,
      position: 'bottom',
      buttons: [{ text: 'Deshacer', role: 'undo' }],
    });
    await t.present();
    const { role } = await t.onDidDismiss();
    if (role === 'undo') this.days.set(before);
  }

  private async copyDay(from: number, to: number) {
    if (this.days()[to].length > 0) {
      const ok = await this.ask('Reemplazar día', `El Día ${to + 1} ya tiene ejercicios. ¿Reemplazarlos?`, [
        { text: 'Reemplazar', role: 'ok' },
        { text: 'Cancelar', role: 'cancel' },
      ]);
      if (ok !== 'ok') return;
    }
    this.days.update((ds) => ds.map((d, k) => (k === to ? ds[from].map((it) => ({ ...it })) : d)));
    await this.toast(`Copiado al Día ${to + 1}.`);
  }

  // ---------- Zonas y ejercicios ----------

  partLabel(id: string): string {
    return BODY_PARTS[id]?.label.replace(' (aductores y abductores)', '') ?? id;
  }

  partCount(id: string): number {
    const muscles = BODY_PARTS[id]?.muscles ?? [];
    return this.day().filter((it) => it.exercise.primary_muscles.some((m) => muscles.includes(m))).length;
  }

  /** Abre una zona: solo ejercicios de sus músculos, con los 3 mejores marcados como recomendados. */
  async openPart(id: string) {
    const pt = BODY_PARTS[id];
    if (!pt) return;
    this.part.set(pt);
    this.muscleFilter.set('all');
    this.loadingOptions.set(true);
    try {
      const input = await this.routines.generatorInput(this.place());
      const lists = pt.muscles.map((m) => exercisesForMuscle(input, m).map((o) => ({ ...o, muscle: m })));
      const merged: PartOption[] = [];
      const seen = new Set<string>();
      for (let r = 0; lists.some((l) => r < l.length); r++) {
        for (const l of lists) {
          const o = l[r];
          if (o && !seen.has(o.exercise.id)) {
            seen.add(o.exercise.id);
            merged.push(o);
          }
        }
      }
      this.options.set(merged.map((o, i) => ({ ...o, recommended: i < 3 })));
    } catch {
      this.options.set([]);
    } finally {
      this.loadingOptions.set(false);
    }
  }

  inDay(id: string): boolean {
    return this.day().some((it) => it.exercise.id === id);
  }

  async addOption(o: PartOption) {
    const p = this.athlete();
    const m = o.muscle;
    let target = this.dayIdx();
    const it: PlanItem = {
      exercise: o.exercise,
      sets: o.item.sets,
      reps_min: o.item.reps_min,
      reps_max: o.item.reps_max,
      rest_seconds: o.item.rest_seconds,
      notes: o.item.notes,
      recommended: {
        sets: o.item.sets,
        reps_min: o.item.reps_min,
        reps_max: o.item.reps_max,
        rest_seconds: o.item.rest_seconds,
      },
    };

    // 1. Límites: día lleno o demasiados ejercicios del mismo músculo.
    const check = canAdd(this.days()[target], o.exercise);
    if (!check.ok) {
      const muscle = check.muscle ?? m;
      const alt =
        check.reason === 'repetido'
          ? -1
          : this.days().findIndex(
              (d, i) => i !== target && canAdd(d, o.exercise).ok && neighborConflict(this.days(), i, muscle) === null,
            );
      const choice = await this.ask('No se puede agregar aquí', check.text, [
        ...(alt >= 0 ? [{ text: `Agregar al Día ${alt + 1}`, role: 'alt' }] : []),
        { text: 'Entendido', role: 'cancel' },
      ]);
      if (choice !== 'alt' || alt < 0) return;
      target = alt;
    }

    // 2. Recuperación: mismo músculo el día de al lado.
    if (target === this.dayIdx() && neighborConflict(this.days(), target, m) !== null) {
      const alt = suggestDay(this.days(), m, [target]);
      const choice = await this.ask(
        'Mismo músculo en días seguidos',
        `${this.muscleLabel(m)} necesita ~48 h para recuperarse y ya lo entrenas en un día pegado a este.` +
          (alt !== null ? ` Te sugerimos el Día ${alt + 1}.` : ''),
        [
          ...(alt !== null ? [{ text: `Agregar al Día ${alt + 1}`, role: 'alt' }] : []),
          { text: 'Agregar igual', role: 'same' },
          { text: 'Cancelar', role: 'cancel' },
        ],
      );
      if (choice === 'cancel' || !choice) return;
      if (choice === 'alt' && alt !== null) target = alt;
    }

    // 3. Tiempo disponible.
    if (p) {
      const total = minutesWith(this.days()[target], it, p);
      if (total > p.minutes + 10) {
        const choice = await this.ask(
          'No cabe en tu tiempo',
          `Con este ejercicio el Día ${target + 1} duraría unos ${total} min y tú tienes ${p.minutes}. Apurarse hace perder técnica.`,
          [
            { text: 'Agregar igual', role: 'same' },
            { text: 'Cancelar', role: 'cancel' },
          ],
        );
        if (choice !== 'same') return;
      }
    }

    // Tesler: el día se ordena solo (primero los ejercicios grandes).
    this.days.update((ds) =>
      ds.map((d, i) => (i === target && !d.some((x) => x.exercise.id === it.exercise.id) ? sortDay([...d, it]) : d)),
    );
    await this.toast(`Agregado al Día ${target + 1}.`);
  }

  removeById(id: string) {
    this.days.update((ds) => ds.map((d, i) => (i === this.dayIdx() ? d.filter((x) => x.exercise.id !== id) : d)));
  }

  // ---------- Edición ----------

  bump(key: Field, delta: number) {
    this.updateEditing((it) => {
      const next = { ...it };
      if (key === 'sets') next.sets = clamp(it.sets + delta, 1, 10);
      if (key === 'rest_seconds') next.rest_seconds = clamp(it.rest_seconds + delta, 0, 300);
      if (key === 'reps_min') {
        next.reps_min = clamp(it.reps_min + delta, 1, 50);
        next.reps_max = Math.max(next.reps_max, next.reps_min);
      }
      if (key === 'reps_max') next.reps_max = clamp(it.reps_max + delta, Math.max(1, it.reps_min), 50);
      return next;
    });
  }

  resetItem() {
    this.updateEditing((it) => ({ ...it, ...it.recommended }));
  }

  removeItem() {
    const k = this.editIdx();
    if (k === null) return;
    this.editIdx.set(null);
    this.days.update((ds) => ds.map((d, i) => (i === this.dayIdx() ? d.filter((_, j) => j !== k) : d)));
  }

  /** Jakob: arrastrar para reordenar. */
  reorder(ev: ItemReorderEventDetail) {
    const { from, to } = ev;
    this.days.update((ds) =>
      ds.map((d, i) => {
        if (i !== this.dayIdx()) return d;
        const copy = [...d];
        const [moved] = copy.splice(from, 1);
        copy.splice(to, 0, moved);
        return copy;
      }),
    );
    ev.complete(false);
  }

  changed(it: PlanItem): boolean {
    const r = it.recommended;
    return (
      it.sets !== r.sets ||
      it.reps_min !== r.reps_min ||
      it.reps_max !== r.reps_max ||
      it.rest_seconds !== r.rest_seconds
    );
  }

  restNote(it: PlanItem): string | null {
    if (it.exercise.mechanic === 'compound' && it.rest_seconds < 60 && it.reps_max > 1) {
      return 'Descanso corto para un ejercicio grande: rendirás menos en las siguientes series.';
    }
    if (it.sets > 5) return 'Más de 5 series de un mismo ejercicio suele aportar poco: mejor otro ejercicio.';
    return null;
  }

  applyAction(a: PlanAction) {
    if (a.kind === 'sort') {
      this.days.update((ds) => ds.map((d, i) => (i === a.day ? sortDay(d) : d)));
      return;
    }
    if (a.kind === 'move' && a.toDay !== undefined && a.muscle) {
      this.days.update((ds) => moveMuscle(ds, a.day, a.toDay!, a.muscle!));
      void this.toast(`Movido al Día ${a.toDay + 1}.`);
    }
  }

  async changePlace(p: string) {
    if (this.totalItems() > 0 && p !== this.place()) {
      await this.toast('Revisa tus ejercicios: el equipamiento cambia según el lugar.');
    }
    this.place.set(p);
  }

  // ---------- Guardado ----------

  async save() {
    const p = this.athlete();
    if (!p || this.saving()) return;
    const days = this.days();
    const empty = days.map((d, i) => (d.length === 0 ? i + 1 : 0)).filter(Boolean);
    if (empty.length === days.length) return;
    if (empty.length > 0) {
      const choice = await this.ask(
        'Días sin ejercicios',
        `El Día ${empty.join(', ')} no tiene ejercicios. ¿Guardar la rutina sin ${empty.length > 1 ? 'esos días' : 'ese día'}?`,
        [
          { text: 'Guardar igual', role: 'ok' },
          { text: 'Volver', role: 'cancel' },
        ],
      );
      if (choice !== 'ok') return;
    }
    const strong = this.analysis().warnings.filter((w) => w.level === 'alto');
    if (strong.length > 0) {
      const choice = await this.ask(
        'Antes de guardar',
        `${strong[0].text}${strong.length > 1 ? ` (y ${strong.length - 1} aviso más)` : ''} ¿Guardar de todas formas?`,
        [
          { text: 'Guardar igual', role: 'ok' },
          { text: 'Revisar', role: 'cancel' },
        ],
      );
      if (choice !== 'ok') return;
    }
    const minutes = this.analysis().dayMinutes;
    const keep = days.map((d, i) => ({ d, i })).filter(({ d }) => d.length > 0);
    const routine: GeneratedRoutine = {
      name: `Rutina personalizada · ${keep.length} días`,
      goal: p.goal,
      days_per_week: keep.length,
      place: this.place(),
      notes: [
        'Rutina creada por ti.',
        ...this.analysis()
          .warnings.filter((w) => w.level !== 'info')
          .map((w) => `Aviso: ${w.text}`),
      ],
      days: keep.map(({ d, i }, k) => ({
        day_index: k + 1,
        name: `Día ${k + 1} · ${this.dayName(i)}`,
        estimated_minutes: minutes[i] ?? 0,
        exercises: d.map((it) => ({
          exercise_id: it.exercise.id,
          sets: it.sets,
          reps_min: it.reps_min,
          reps_max: it.reps_max,
          rest_seconds: it.rest_seconds,
          notes: it.notes,
        })),
      })),
    };
    this.saving.set(true);
    try {
      await this.routines.saveManual(routine);
      localStore.remove('manual.draft');
      this.reviewOpen.set(false);
      await this.toast('¡Listo! Es tu rutina actual.');
      await this.router.navigateByUrl('/rutina', { replaceUrl: true });
    } catch {
      await this.toast('No se pudo guardar. Revisa tu internet.');
    } finally {
      this.saving.set(false);
    }
  }

  // ---------- Textos ----------

  dayName(i: number): string {
    const sets = new Map<string, number>();
    for (const it of this.days()[i] ?? []) {
      const m = it.exercise.primary_muscles[0];
      if (m) sets.set(m, (sets.get(m) ?? 0) + it.sets);
    }
    const top = [...sets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([m]) => MUSCLE_ES[m] ?? m);
    if (top.length === 0) return 'Vacío';
    const label = top.join(' y ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  rx(it: PlanItem): string {
    return `${it.sets} × ${it.reps_min}-${it.reps_max} · descanso ${this.clock(it.rest_seconds)}`;
  }

  clock(s: number): string {
    return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  muscleLabel(m: string): string {
    const l = MUSCLE_ES[m] ?? m;
    return l.charAt(0).toUpperCase() + l.slice(1);
  }

  placeLabel(p: string): string {
    return labelOf(PLACE_OPTIONS, p);
  }

  img(e: Exercise): string | null {
    return this.catalog.imageUrl(e);
  }

  equipmentGroup(e: Exercise): string {
    if (e.equipment === 'machine' || /smith/i.test(e.name)) return 'Máquinas';
    if (e.equipment === 'cable') return 'Poleas';
    if (e.equipment === 'barbell' || e.equipment === 'dumbbell' || e.equipment === 'kettlebells') return 'Peso libre';
    return 'Peso corporal';
  }

  volPct(sets: number): number {
    return Math.min(100, (sets / (this.range()[1] + 5)) * 100);
  }

  // ---------- Internos ----------

  private updateEditing(fn: (it: PlanItem) => PlanItem) {
    const k = this.editIdx();
    if (k === null) return;
    this.days.update((ds) => ds.map((d, i) => (i === this.dayIdx() ? d.map((it, j) => (j === k ? fn(it) : it)) : d)));
  }

  private async ask(
    header: string,
    message: string,
    buttons: { text: string; role: string }[],
  ): Promise<string | undefined> {
    const alert = await this.alerts.create({ header, message, buttons });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role;
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 1800, position: 'top' });
    await t.present();
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
