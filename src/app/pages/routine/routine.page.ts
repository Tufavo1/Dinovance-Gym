import { Component, computed, inject, input, signal, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  arrowDownOutline,
  arrowUpOutline,
  checkmarkCircle,
  chevronDown,
  chevronUp,
  listOutline,
  cloudOfflineOutline,
  createOutline,
  create,
  play,
  repeatOutline,
  saveOutline,
  timeOutline,
  trashOutline,
  closeOutline,
  pencilOutline,
} from 'ionicons/icons';

import { ExerciseService } from '../../core/exercise.service';
import { estimateMinutesFor } from '../../core/routine/estimate';
import type { Exercise } from '../../core/models';
import { PLACE_OPTIONS, labelOf } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { exerciseName } from '../../core/routine/exercise-names';
import { techniqueCues } from '../../core/training/technique';
import {
  EmptyExerciseCatalogError,
  MissingRoutineDataError,
  RoutineService,
  type StoredExercise,
  type StoredRoutine,
} from '../../core/routine.service';
import { WorkoutService, type WorkoutProgress } from '../../core/workout.service';
import { EvidenceCardComponent } from '../../shared/evidence-card.component';
import { ExerciseFactsComponent } from '../../shared/exercise-facts.component';
import { askGear } from '../../shared/gear-modal.component';
import { ExercisePickerComponent } from '../../shared/exercise-picker.component';
import { HeaderActionsComponent } from '../../shared/header-actions.component';
import { HelpButtonComponent } from '../../shared/help-button.component';
import { TabBarComponent } from '../../shared/tab-bar.component';

@Component({
  selector: 'app-routine',
  imports: [
    ExerciseFactsComponent,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonThumbnail,
    IonSegment,
    IonSegmentButton,
    TabBarComponent,
    HelpButtonComponent,
    HeaderActionsComponent,
    EvidenceCardComponent,
    ExercisePickerComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (id()) {
          <ion-buttons slot="start">
            <ion-back-button defaultHref="/rutinas" text="Mis rutinas"></ion-back-button>
          </ion-buttons>
        }
        <ion-title>{{ id() && !routine()?.is_active ? 'Rutina guardada' : 'Mi rutina' }}</ion-title>
        <ion-buttons slot="end">
          <app-help-button></app-help-button>
          <app-header-actions></app-header-actions>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        @if (loading() || (generating() && !routine())) {
          <div class="center">
            <ion-spinner></ion-spinner>
            @if (generating()) {
              <p class="hint">Armando tu rutina con tus respuestas…</p>
            }
          </div>
        } @else if (loadError()) {
          <ion-note color="danger">{{ loadError() }}</ion-note>
          <ion-button expand="block" (click)="init()">Reintentar</ion-button>
        } @else if (routine(); as r) {
          @if (offline()) {
            <ion-note class="offline">
              <ion-icon name="cloud-offline-outline"></ion-icon>
              Sin conexión: estás viendo la copia guardada en tu teléfono.
            </ion-note>
          }

          @if (updated() && r.is_active) {
            <ion-card color="primary">
              <ion-card-content>
                <p><strong>Actualizaste tus respuestas.</strong></p>
                <p>Genera una rutina nueva para que las tome en cuenta.</p>
                <ion-button expand="block" color="light" [disabled]="generating()" (click)="onGenerate(false)">
                  Generar rutina nueva
                </ion-button>
              </ion-card-content>
            </ion-card>
          }

          <h1 class="title">{{ r.name }}</h1>
          @if (r.shared_by_name) {
            <p class="hint">
              Compartida por {{ r.shared_by_name }}. Las cargas son tuyas: salen solo de tus registros.
            </p>
          }
          <p class="hint">
            {{ placeLabel(r.place) }} · creada el {{ date(r.created_at) }}
            @if (!r.is_active) {
              · <strong>no está en uso</strong>
            }
          </p>

          <ion-segment [scrollable]="true" [value]="selectedDay()" (ionChange)="selectDay($event.detail.value)">
            @for (day of r.routine_days; track day.id; let i = $index) {
              <ion-segment-button [value]="i">
                <ion-label>
                  Día {{ day.day_index }}
                  @if (r.is_active && progress()?.nextDay === i) {
                    <ion-badge color="success">Hoy</ion-badge>
                  }
                </ion-label>
              </ion-segment-button>
            }
          </ion-segment>

          @if (currentDay(); as day) {
            <div class="day-head">
              <h2>{{ dayTitle(day.name) }}</h2>
              @if (!offline() && !editing()) {
                <ion-button size="small" fill="outline" (click)="startEdit()">
                  <ion-icon slot="start" name="create-outline"></ion-icon>
                  Editar este día
                </ion-button>
              }
              <p class="hint">
                <ion-icon name="time-outline"></ion-icon>
                {{ day.estimated_minutes ? '≈ ' + day.estimated_minutes + ' min · ' : ''
                }}{{ day.routine_exercises.length }} ejercicios
              </p>
              @if (day.objective) {
                <p class="hint"><strong>Objetivo de la sesión:</strong> {{ day.objective }}</p>
              }
            </div>

            @if (editing()) {
              <ion-list lines="full" class="group">
                @for (e of draft(); track e.id; let n = $index; let first = $first; let last = $last) {
                  @let ex = catalog.byId().get(e.exercise_id);
                  <ion-item>
                    <ion-label class="ion-text-wrap">
                      <h3>{{ n + 1 }}. {{ ex ? name(ex) : 'Ejercicio' }}</h3>
                      <p class="rx">{{ prescription(e) }}</p>
                      <div class="tools">
                        <div class="grp">
                          @if (!isTimed(e)) {
                            <ion-button size="small" fill="outline" (click)="editSets(n)">
                              <ion-icon slot="start" name="pencil-outline"></ion-icon>Series
                            </ion-button>
                          }
                          <ion-button size="small" fill="outline" (click)="swapAt(n)">
                            <ion-icon slot="start" name="repeat-outline"></ion-icon>Cambiar
                          </ion-button>
                        </div>
                        <div class="grp">
                          <ion-button
                            size="small"
                            fill="clear"
                            aria-label="Subir"
                            [disabled]="first"
                            (click)="move(n, -1)"
                          >
                            <ion-icon slot="icon-only" name="arrow-up-outline"></ion-icon>
                          </ion-button>
                          <ion-button
                            size="small"
                            fill="clear"
                            aria-label="Bajar"
                            [disabled]="last"
                            (click)="move(n, 1)"
                          >
                            <ion-icon slot="icon-only" name="arrow-down-outline"></ion-icon>
                          </ion-button>
                          <ion-button
                            size="small"
                            fill="clear"
                            color="danger"
                            aria-label="Quitar"
                            (click)="removeAt(n)"
                          >
                            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                          </ion-button>
                        </div>
                      </div>
                    </ion-label>
                  </ion-item>
                } @empty {
                  <ion-item><ion-label class="hint">Este día no tiene ejercicios. Agrega uno.</ion-label></ion-item>
                }
              </ion-list>
              <ion-button
                expand="block"
                fill="outline"
                [disabled]="draft().length >= 15"
                (click)="pickerOpen.set(true)"
              >
                <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                Agregar ejercicio
              </ion-button>
              <ion-button expand="block" size="large" [disabled]="saving()" (click)="saveEdit(day.id)">
                <ion-icon slot="start" name="save-outline"></ion-icon>
                {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
              </ion-button>
              <ion-button expand="block" fill="clear" color="medium" [disabled]="saving()" (click)="cancelEdit()">
                <ion-icon slot="start" name="close-outline"></ion-icon>
                Cancelar
              </ion-button>
              <p class="hint">
                Los cambios valen para este día. Los ejercicios fuera de tu equipo o lesión salen marcados al agregar.
              </p>
            } @else {
              <ion-list lines="full" class="group">
                @for (e of shown(day.routine_exercises); track e.id; let n = $index) {
                  @let ex = catalog.byId().get(e.exercise_id);
                  <ion-item button [detail]="false" (click)="toggleOpen(e.id)">
                    @if (catalog.imageUrl(ex); as img) {
                      <ion-thumbnail slot="start">
                        <img [src]="img" [alt]="ex ? name(ex) : ''" loading="lazy" />
                      </ion-thumbnail>
                    }
                    <ion-label class="ion-text-wrap">
                      <h3>{{ n + 1 }}. {{ ex ? name(ex) : 'Ejercicio' }}</h3>
                      <p class="rx">{{ prescription(e) }}</p>
                      @if (extraNote(e); as note) {
                        <p>{{ note }}</p>
                      }
                      @if (isOpen(e.id) && e.rationale) {
                        <p class="tech">Por qué está en tu rutina</p>
                        <p>{{ e.rationale }}</p>
                      }
                      @if (isOpen(e.id) && ex) {
                        <app-exercise-facts [exercise]="ex"></app-exercise-facts>
                        <p class="tech">Cómo hacerlo</p>
                        <ul class="steps">
                          @for (cue of cues(ex); track cue) {
                            <li>{{ cue }}</li>
                          }
                        </ul>
                      }
                    </ion-label>
                    <ion-icon
                      slot="end"
                      [name]="isOpen(e.id) ? 'chevron-up' : 'chevron-down'"
                      color="medium"
                    ></ion-icon>
                  </ion-item>
                }
              </ion-list>
              @if (day.routine_exercises.length > 1) {
                <ion-button expand="block" fill="outline" (click)="showFull.set(!showFull())">
                  <ion-icon slot="start" [name]="showFull() ? 'chevron-up' : 'list-outline'"></ion-icon>
                  {{
                    showFull() ? 'Ver menos' : 'Ver toda la rutina (' + day.routine_exercises.length + ' ejercicios)'
                  }}
                </ion-button>
              }
              <p class="hint">Toca un ejercicio: para qué sirve y cómo hacerlo.</p>
            }

            @if (r.is_active && !editing()) {
              <ion-button expand="block" size="large" [routerLink]="['/entrenar', day.id]">
                <ion-icon slot="start" name="play"></ion-icon>
                Empezar día {{ day.day_index }}
              </ion-button>
              <ion-button
                expand="block"
                fill="clear"
                size="small"
                [disabled]="saving() || offline()"
                (click)="completeDay(day.id)"
              >
                <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                {{ saving() ? 'Guardando…' : 'Ya lo hice (marcar sin registrar)' }}
              </ion-button>
              @if (progress(); as pr) {
                <p class="hint ion-text-center">
                  Esta semana llevas {{ pr.doneThisWeek }} de {{ r.routine_days.length }} entrenamientos.
                </p>
              }
            }
          }

          @if (noteList().length > 0) {
            <ion-card class="notes">
              <ion-card-content>
                <p class="notes-title">Para ti</p>
                @for (n of visibleNotes(); track $index) {
                  <p>• {{ n }}</p>
                }
                @if (noteList().length > 1) {
                  <ion-button fill="clear" size="small" (click)="showAllNotes.set(!showAllNotes())">
                    {{ showAllNotes() ? 'Ver menos' : 'Ver ' + (noteList().length - 1) + ' más' }}
                  </ion-button>
                }
              </ion-card-content>
            </ion-card>
          }

          <app-evidence-card [routine]="r"></app-evidence-card>

          @if (!r.is_active) {
            <ion-button expand="block" size="large" [disabled]="saving()" (click)="useThis(r.id)">
              Usar esta rutina
            </ion-button>
            <ion-button expand="block" fill="clear" color="danger" [disabled]="saving()" (click)="remove(r.id)">
              Eliminar esta rutina
            </ion-button>
          } @else if (!offline()) {
            <div class="regen">
              @if (places().length > 1) {
                <ion-select
                  label="Lugar para la próxima rutina"
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
              <ion-button expand="block" fill="outline" [disabled]="generating()" (click)="onGenerate(true)">
                {{ generating() ? 'Generando…' : 'Generar una rutina nueva' }}
              </ion-button>
              <p class="hint ion-text-center">Tu rutina actual queda guardada en "Mis rutinas".</p>
              <ion-button expand="block" fill="clear" routerLink="/crear-rutina"
                ><ion-icon slot="start" name="create-outline"></ion-icon>O créala tú a mano</ion-button
              >
            </div>
          }
        } @else {
          <h1>Aún no tienes una rutina</h1>
          <p class="hint">La armamos con tu nivel, objetivo, tiempo, lugar y salud.</p>
          <ion-button expand="block" size="large" [disabled]="generating()" (click)="onGenerate(false)">
            Generar mi rutina
          </ion-button>
        }
      </div>
    </ion-content>

    <app-exercise-picker
      [open]="pickerOpen()"
      [allowed]="allowed()"
      [exclude]="draftIds()"
      (picked)="addExercise($event)"
      (closed)="pickerOpen.set(false)"
    ></app-exercise-picker>

    <app-tab-bar [active]="id() ? 'rutinas' : 'rutina'"></app-tab-bar>
  `,
  styles: `
    .center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 0;
    }
    .page h1.title {
      font-size: 1.3rem;
      margin-bottom: 4px;
    }
    .offline {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    ion-card {
      margin: 12px 0;
    }
    .notes p {
      white-space: normal;
      margin: 4px 0;
    }
    .tech {
      margin: 8px 0 2px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ion-color-medium);
    }
    .notes-title {
      font-weight: 600;
    }
    ion-segment {
      margin-top: 16px;
    }
    ion-segment-button ion-badge {
      margin-left: 4px;
      vertical-align: middle;
    }
    .day-head h2 {
      margin: 20px 0 2px;
      font-size: 1.15rem;
    }
    .day-head ion-icon {
      vertical-align: -2px;
    }
    .rx {
      font-weight: 600;
    }
    .day-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .day-head h2 {
      flex: 1 1 100%;
    }
    .tools {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      margin-top: 10px;
    }
    .tools .grp {
      display: flex;
      gap: 6px;
    }
    .tools ion-button {
      margin: 0;
    }
    .steps {
      margin: 8px 0 0;
      padding-left: 18px;
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }
    .regen {
      margin-top: 32px;
    }
  `,
})
export class RoutinePage implements OnInit, ViewWillEnter {
  /** Id de una rutina guardada (ruta /rutina/:id). Sin id se muestra la rutina activa. */
  readonly id = input<string>();

  readonly catalog = inject(ExerciseService);
  private readonly routines = inject(RoutineService);
  private readonly workouts = inject(WorkoutService);
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly modals = inject(ModalController);

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly generating = signal(false);
  readonly saving = signal(false);
  readonly offline = signal(false);
  readonly routine = signal<StoredRoutine | null>(null);
  readonly progress = signal<WorkoutProgress | null>(null);
  readonly place = signal('');
  readonly selectedDay = signal(0);
  readonly showAllNotes = signal(false);
  /** En "Mi rutina" se ve 1 ejercicio; el botón muestra el día completo. */
  readonly showFull = signal(false);

  shown<T>(list: T[]): T[] {
    return this.showFull() ? list : list.slice(0, 1);
  }
  readonly updated = signal(false);
  private readonly openIds = signal<Set<string>>(new Set());

  // ---- Edición de un día ----
  readonly editing = signal(false);
  readonly draft = signal<StoredExercise[]>([]);
  readonly pickerOpen = signal(false);
  readonly allowed = signal<Set<string>>(new Set());
  readonly draftIds = computed(() => this.draft().map((e) => e.exercise_id));
  private pickerCtx: Awaited<ReturnType<RoutineService['pickerContext']>> | null = null;

  readonly places = computed(() =>
    (this.profiles.health()?.places ?? []).map((p) => ({ value: p, label: labelOf(PLACE_OPTIONS, p) })),
  );
  readonly noteList = computed(() => (this.routine()?.notes ?? '').split('\n').filter((n) => n.trim().length > 0));
  readonly visibleNotes = computed(() => (this.showAllNotes() ? this.noteList() : this.noteList().slice(0, 1)));
  readonly currentDay = computed(() => {
    const days = this.routine()?.routine_days ?? [];
    return days[this.selectedDay()] ?? days[0] ?? null;
  });

  readonly name = exerciseName;
  readonly cues = techniqueCues;

  constructor() {
    addIcons({
      addCircleOutline,
      arrowDownOutline,
      arrowUpOutline,
      checkmarkCircle,
      chevronDown,
      chevronUp,
      listOutline,
      cloudOfflineOutline,
      createOutline,
      create,
      play,
      repeatOutline,
      saveOutline,
      timeOutline,
      trashOutline,
      closeOutline,
      pencilOutline,
    });
    // Ionic reutiliza la página: se escucha el parámetro aunque la vista ya exista.
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((q) => this.updated.set(q.get('actualizado') === '1'));
  }

  private entered = false;

  ngOnInit() {
    void this.init();
  }

  /** Ionic mantiene la página viva entre pestañas: al volver se recargan los datos. */
  ionViewWillEnter() {
    if (this.entered && !this.generating()) void this.init();
    this.entered = true;
  }

  async init() {
    this.loading.set(true);
    this.loadError.set('');
    try {
      await this.profiles.load().catch(() => undefined);
      await this.catalog.ensureLoaded().catch(() => undefined);
      const id = this.id();
      if (id) {
        this.offline.set(false);
        this.routine.set(await this.routines.loadById(id));
        if (!this.routine()) this.loadError.set('No encontramos esa rutina.');
      } else {
        const { routine, offline } = await this.routines.loadActive();
        this.routine.set(routine);
        this.offline.set(offline);
      }
      await this.refreshProgress();
      const first = this.profiles.health()?.places?.[0] ?? '';
      this.place.set(this.routine()?.place ?? first);
      // Tesler: si aún no hay rutina, se genera sola con lo que ya respondió.
      if (!id && !this.routine() && first) {
        this.loading.set(false);
        if (await askGear(this.modals, first)) await this.generate();
      }
    } catch {
      this.loadError.set('No se pudo cargar tu rutina. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshProgress() {
    const r = this.routine();
    if (!r?.is_active || this.offline()) {
      this.progress.set(null);
      return;
    }
    try {
      const p = await this.workouts.progress(r);
      this.progress.set(p);
      this.selectedDay.set(p.nextDay);
    } catch {
      this.progress.set(null);
    }
  }

  selectDay(value: unknown) {
    this.editing.set(false);
    this.selectedDay.set(Number(value ?? 0));
    this.openIds.set(new Set());
    this.showFull.set(false);
  }

  placeLabel(p: string | null): string {
    return p ? labelOf(PLACE_OPTIONS, p) : '';
  }

  date(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  dayTitle(name: string): string {
    return name.replace(/^Día \d+ · /, '');
  }

  /** Texto principal: series y repeticiones, o la indicación de tiempo (estiramientos, cardio, plancha). */
  prescription(e: StoredExercise): string {
    const rest = e.rest_seconds > 0 ? ` · descanso ${formatRest(e.rest_seconds)}` : '';
    if (e.reps_min === 1 && e.reps_max === 1 && e.notes) {
      const timed = lastSentence(e.notes);
      return e.sets > 1 ? `${e.sets} series · ${timed}${rest}` : timed;
    }
    const reps = e.reps_min === e.reps_max ? `${e.reps_min}` : `${e.reps_min} a ${e.reps_max}`;
    const rir =
      typeof e.rir_min === 'number' && typeof e.rir_max === 'number' ? ` · RIR ${e.rir_min}-${e.rir_max}` : '';
    const tempo = e.tempo ? ` · ${e.tempo}` : '';
    return `${e.sets} series de ${reps} repeticiones${rest}${rir}${tempo}`;
  }

  /** Nota adicional (por ejemplo "En la máquina asistida…") cuando no se usó como indicación principal. */
  extraNote(e: StoredExercise): string | null {
    if (!e.notes) return null;
    if (e.reps_min === 1 && e.reps_max === 1) {
      const parts = e.notes.split('. ');
      return parts.length > 1 ? parts.slice(0, -1).join('. ') : null;
    }
    return e.notes;
  }

  // ---------- Edición ----------

  isTimed(e: StoredExercise): boolean {
    return e.reps_min === 1 && e.reps_max === 1;
  }

  async startEdit() {
    const day = this.currentDay();
    const r = this.routine();
    if (!day || !r) return;
    this.draft.set(day.routine_exercises.map((e) => ({ ...e })));
    this.editing.set(true);
    try {
      this.pickerCtx = await this.routines.pickerContext(r);
      this.allowed.set(this.pickerCtx.allowed);
    } catch {
      this.pickerCtx = null;
    }
  }

  cancelEdit() {
    this.editing.set(false);
    this.draft.set([]);
  }

  move(i: number, dir: -1 | 1) {
    this.draft.update((list) => {
      const next = [...list];
      const j = i + dir;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async removeAt(i: number) {
    const item = this.draft()[i];
    const ex = item ? this.catalog.byId().get(item.exercise_id) : undefined;
    const ok = await this.confirm(
      'Quitar ejercicio',
      `¿Quitar "${ex ? this.name(ex) : 'este ejercicio'}" de este día?`,
      'Quitar',
    );
    if (ok) this.draft.update((list) => list.filter((_, n) => n !== i));
  }

  async editSets(i: number) {
    const e = this.draft()[i];
    if (!e) return;
    const alert = await this.alerts.create({
      header: 'Series y repeticiones',
      inputs: [
        { name: 'sets', type: 'number', label: 'Series', value: e.sets, min: 1, max: 10, placeholder: 'Series' },
        { name: 'reps_min', type: 'number', value: e.reps_min, min: 1, max: 100, placeholder: 'Repeticiones mínimas' },
        { name: 'reps_max', type: 'number', value: e.reps_max, min: 1, max: 100, placeholder: 'Repeticiones máximas' },
        { name: 'rest', type: 'number', value: e.rest_seconds, min: 0, max: 600, placeholder: 'Descanso (segundos)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aplicar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    const v = data?.values ?? {};
    const sets = Math.round(Number(v.sets));
    const min = Math.round(Number(v.reps_min));
    const max = Math.round(Number(v.reps_max));
    const rest = Math.round(Number(v.rest));
    if (
      ![sets, min, max, rest].every(Number.isFinite) ||
      sets < 1 ||
      sets > 10 ||
      min < 1 ||
      max < min ||
      max > 100 ||
      rest < 0 ||
      rest > 600
    ) {
      await this.toast('Revisa los números: series 1 a 10, repeticiones mínimas ≤ máximas, descanso 0 a 600 s.');
      return;
    }
    this.draft.update((list) =>
      list.map((x, n) => (n === i ? { ...x, sets, reps_min: min, reps_max: max, rest_seconds: rest } : x)),
    );
  }

  async swapAt(i: number) {
    const r = this.routine();
    const e = this.draft()[i];
    if (!r || !e) return;
    let alts;
    try {
      alts = await this.routines.alternatives(r, e.exercise_id);
    } catch {
      await this.toast('No se pudieron buscar alternativas. Revisa tu internet.');
      return;
    }
    if (alts.length === 0) {
      await this.toast('No hay alternativas seguras para este ejercicio. Puedes quitarlo y agregar otro.');
      return;
    }
    const alert = await this.alerts.create({
      header: 'Cambiar por…',
      inputs: alts.map((a, n) => ({
        type: 'radio' as const,
        label: this.name(a.exercise),
        value: n,
        checked: n === 0,
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cambiar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    const pick = alts[Number(data?.values ?? 0)];
    if (!pick) return;
    this.draft.update((list) =>
      list.map((x, n) => (n === i ? { ...x, ...pick.item, id: x.id, position: x.position } : x)),
    );
  }

  async addExercise(ex: Exercise) {
    this.pickerOpen.set(false);
    if (this.draft().length >= 15) {
      await this.toast('Máximo 15 ejercicios por día.');
      return;
    }
    if (!this.allowed().has(ex.id)) {
      const ok = await this.confirm(
        'No recomendado para ti',
        'Este ejercicio no encaja con tu equipo, nivel o lesiones. ¿Agregarlo igual?',
        'Agregar',
      );
      if (!ok) return;
    }
    const rx = this.pickerCtx?.prescribe(ex).item ?? {
      exercise_id: ex.id,
      sets: 3,
      reps_min: 8,
      reps_max: 12,
      rest_seconds: 90,
      notes: null,
    };
    this.draft.update((list) => [...list, { id: `nuevo-${Date.now()}`, position: list.length + 1, ...rx }]);
  }

  async saveEdit(dayId: string) {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const items = this.draft().map((e) => ({
        exercise_id: e.exercise_id,
        sets: e.sets,
        reps_min: e.reps_min,
        reps_max: e.reps_max,
        rest_seconds: e.rest_seconds,
        notes: e.notes,
      }));
      const minutes = estimateMinutesFor(items, this.catalog.byId());
      await this.routines.saveDay(dayId, items, minutes);
      const id = this.id();
      const { routine } = id ? { routine: await this.routines.loadById(id) } : await this.routines.loadActive();
      this.routine.set(routine);
      this.editing.set(false);
      await this.toast('Cambios guardados.');
    } catch {
      await this.toast('No se pudo guardar. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  toggleOpen(id: string) {
    this.openIds.update((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  async completeDay(dayId: string) {
    const r = this.routine();
    if (!r || this.saving()) return;
    this.saving.set(true);
    try {
      await this.workouts.completeDay(dayId);
      await this.refreshProgress();
      const next = r.routine_days[this.progress()?.nextDay ?? 0];
      await this.toast(`¡Bien hecho! La próxima vez te toca el día ${next?.day_index ?? 1}.`);
    } catch {
      await this.toast('No se pudo guardar. Revisa tu internet.');
    } finally {
      this.saving.set(false);
    }
  }

  async useThis(id: string) {
    this.saving.set(true);
    try {
      await this.routines.activate(id);
      await this.toast('Listo, esta es tu rutina actual.');
      await this.router.navigateByUrl('/rutina', { replaceUrl: true });
    } catch {
      await this.toast('No se pudo cambiar la rutina. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string) {
    const ok = await this.confirm('Eliminar rutina', 'Se borrará para siempre. ¿Continuar?', 'Eliminar');
    if (!ok) return;
    this.saving.set(true);
    try {
      await this.routines.remove(id);
      await this.router.navigateByUrl('/rutinas', { replaceUrl: true });
    } catch {
      await this.toast('No se pudo eliminar. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  async onGenerate(ask: boolean) {
    if (!this.place() || this.generating()) return;
    if (ask && this.routine()) {
      const ok = await this.confirm(
        'Generar una rutina nueva',
        'Tu rutina actual quedará guardada en "Mis rutinas". ¿Continuar?',
        'Generar',
      );
      if (!ok) return;
    }
    if (!(await askGear(this.modals, this.place()))) return;
    await this.generate();
  }

  private async generate() {
    this.generating.set(true);
    try {
      await this.routines.generateAndSave(this.place());
      const { routine } = await this.routines.loadActive();
      this.routine.set(routine);
      this.updated.set(false);
      this.showAllNotes.set(false);
      await this.refreshProgress();
      if (this.id()) await this.router.navigateByUrl('/rutina', { replaceUrl: true });
    } catch (e) {
      const msg =
        e instanceof EmptyExerciseCatalogError
          ? 'La base de ejercicios está vacía. Falta ejecutar la importación en Supabase.'
          : e instanceof MissingRoutineDataError
            ? `${e.message} Complétalos en tu perfil y vuelve a intentarlo.`
            : 'No se pudo generar la rutina. Inténtalo de nuevo.';
      await this.toast(msg);
    } finally {
      this.generating.set(false);
    }
  }

  private async confirm(header: string, message: string, okText: string): Promise<boolean> {
    const alert = await this.alerts.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: okText, role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3000, position: 'top' });
    await t.present();
  }
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

function lastSentence(text: string): string {
  const parts = text.split('. ');
  return parts[parts.length - 1];
}
