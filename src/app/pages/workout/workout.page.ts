import { Component, computed, effect, inject, input, signal, type OnDestroy, type OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonModal,
  IonTextarea,
  ToastController,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  arrowForwardOutline,
  barbellOutline,
  checkmark,
  checkmarkCircleOutline,
  chevronBack,
  chevronForward,
  close,
  flagOutline,
  happy,
  happyOutline,
  locationOutline,
  pause,
  play,
  remove,
  removeCircleOutline,
  sad,
  sadOutline,
  swapHorizontal,
} from 'ionicons/icons';

import { ExerciseService } from '../../core/exercise.service';
import { localStore } from '../../core/local-store';
import type { Exercise } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { buildAthleteProfile } from '../../core/routine/athlete-profile';
import { ExerciseFactsComponent } from '../../shared/exercise-facts.component';
import { exerciseName } from '../../core/routine/exercise-names';
import {
  RoutineService,
  ageFrom,
  type StoredDay,
  type StoredExercise,
  type StoredRoutine,
  type SwapReason,
} from '../../core/routine.service';
import type { Alternative } from '../../core/routine/generator';
import {
  adjustAfterSet,
  adviseLoad,
  type LoadAdvice,
  type LoadAthlete,
  type LoadHistoryEntry,
} from '../../core/training/load-advisor';
import { rpeFromRir, sessionMetrics } from '../../core/training/strength-math';
import { clock, exerciseTimes, secondsBetween } from '../../core/training/session-time';
import { setupCues, techniqueCues } from '../../core/training/technique';
import { WorkoutService, type EndReason, type SessionSetPayload } from '../../core/workout.service';
import { HelpButtonComponent } from '../../shared/help-button.component';
import { beep, buzz } from '../../shared/sound';

type Phase = 'loading' | 'error' | 'exercise' | 'set' | 'timed' | 'rir' | 'rest' | 'finish' | 'done';

/** Estado del entrenamiento en curso: se guarda en el teléfono para poder retomarlo. */
interface Draft {
  dayId: string;
  startedAt: string;
  index: number;
  setNumber: number;
  phase: Phase;
  sets: SessionSetPayload[];
  weights: Record<string, number | null>;
}

const RIR_OPTIONS = [
  { rir: 0, label: '0', text: 'No podía ni una más', rpe: 'RPE 10' },
  { rir: 1, label: '1', text: 'Me quedaba 1', rpe: 'RPE 9' },
  { rir: 2, label: '2', text: 'Me quedaban 2', rpe: 'RPE 8' },
  { rir: 3, label: '3', text: 'Me quedaban 3', rpe: 'RPE 7' },
  { rir: 4, label: '4+', text: 'Me sobraban 4 o más', rpe: 'RPE 6 o menos' },
];

/** sRPE de Foster (esfuerzo de toda la sesión). */
const SRPE_LABELS: Record<number, string> = {
  1: 'Muy suave',
  2: 'Muy suave',
  3: 'Suave',
  4: 'Suave',
  5: 'Moderado',
  6: 'Moderado',
  7: 'Duro',
  8: 'Duro',
  9: 'Muy duro',
  10: 'Máximo',
};

const GUIDE_OPTIONS = [
  { value: 1, icon: 'sad', label: 'Mala' },
  { value: 2, icon: 'sad-outline', label: 'Regular' },
  { value: 3, icon: 'remove-circle-outline', label: 'Normal' },
  { value: 4, icon: 'happy-outline', label: 'Buena' },
  { value: 5, icon: 'happy', label: 'Excelente' },
];

@Component({
  selector: 'app-workout',
  imports: [
    ExerciseFactsComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonProgressBar,
    IonSpinner,
    IonModal,
    IonTextarea,
    HelpButtonComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="exit()" aria-label="Salir del entrenamiento">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ title() }}</ion-title>
        <ion-buttons slot="end">
          @if (canPause()) {
            <ion-button (click)="pauseWorkout()" aria-label="Pausar entrenamiento">
              <ion-icon slot="start" name="pause"></ion-icon> Pausa
            </ion-button>
          }
          <app-help-button></app-help-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-progress-bar [value]="progressValue()"></ion-progress-bar>
    </ion-header>

    <ion-content>
      <div class="page">
        @if (showClocks()) {
          <div class="clock-bar">
            <span
              >⏱ Este ejercicio <strong>{{ clock(exerciseElapsed()) }}</strong></span
            >
            @if (phase() === 'set' || phase() === 'timed') {
              <span
                >Serie <strong>{{ clock(setElapsed()) }}</strong></span
              >
            }
          </div>
        }
        @switch (phase()) {
          @case ('loading') {
            <div class="center"><ion-spinner></ion-spinner></div>
          }
          @case ('error') {
            <p class="hint">{{ error() }}</p>
            <ion-button expand="block" (click)="init()">Reintentar</ion-button>
          }

          <!-- 1. Presentación del ejercicio: objetivo, cómo colocarse, cómo hacerlo y peso -->
          @case ('exercise') {
            @if (current(); as c) {
              <figure class="media">
                @if (frame(); as src) {
                  <img [src]="src" [alt]="c.name" />
                } @else {
                  <div class="no-img">Sin imagen</div>
                }
              </figure>
              <h1 class="ex-name">{{ c.name }}</h1>
              <ion-button fill="clear" size="small" class="swap-btn" (click)="openSwap()">
                <ion-icon slot="start" name="swap-horizontal"></ion-icon> No me gusta, cambiar ejercicio
              </ion-button>

              <section class="goal">
                <p class="goal-title"><ion-icon name="flag-outline" aria-hidden="true"></ion-icon> Tu objetivo</p>
                @for (line of c.objective; track line) {
                  <p class="goal-line">{{ line }}</p>
                }
              </section>

              <app-exercise-facts [exercise]="c.ex"></app-exercise-facts>

              <p class="block-title"><ion-icon name="location-outline" aria-hidden="true"></ion-icon> Cómo colocarte</p>
              <ul class="cues">
                @for (cue of c.setup; track cue) {
                  <li>{{ cue }}</li>
                }
              </ul>

              <p class="block-title">
                <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon> Cómo hacerlo
              </p>
              <ul class="cues">
                @for (cue of c.cues; track cue) {
                  <li>{{ cue }}</li>
                }
              </ul>

              @if (c.advice.kg !== null) {
                <section class="load">
                  <p class="block-title">
                    <ion-icon name="barbell-outline" aria-hidden="true"></ion-icon> {{ loadLabel(c.advice) }}
                  </p>
                  <div class="stepper">
                    <ion-button fill="outline" (click)="bumpWeight(-c.advice.step)" aria-label="Menos peso">
                      <ion-icon slot="icon-only" name="remove"></ion-icon>
                    </ion-button>
                    <span class="value">{{ weight() }} <small>kg</small></span>
                    <ion-button fill="outline" (click)="bumpWeight(c.advice.step)" aria-label="Más peso">
                      <ion-icon slot="icon-only" name="add"></ion-icon>
                    </ion-button>
                  </div>
                  <p class="hint center-text">
                    Te recomendamos <strong>{{ c.advice.kg }} kg</strong>. {{ c.advice.reason }}
                  </p>
                  @if (c.advice.mode === 'contrapeso') {
                    <p class="hint center-text">Más asistencia = más fácil.</p>
                  }
                </section>
              } @else if (c.advice.reason) {
                <p class="hint">{{ c.advice.reason }}</p>
              }

              @if (doneSetsFor(c.item.exercise_id); as done) {
                <p class="todo">
                  <ion-icon name="checkmark" aria-hidden="true"></ion-icon> Ya hiciste {{ done }} de
                  {{ c.item.sets }} series de este ejercicio.
                  {{
                    done >= c.item.sets
                      ? 'Puedes hacer una serie extra o pasar al siguiente.'
                      : 'Toca Continuar para seguir.'
                  }}
                </p>
              } @else {
                <p class="todo">
                  <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon> Colócate, prepara el peso y toca
                  <strong>Empezar</strong>. Con las flechas cambias de ejercicio.
                </p>
              }
            }
          }

          <!-- 2. Serie en curso: qué hacer, con qué peso y cuántas repeticiones -->
          @case ('set') {
            @if (current(); as c) {
              <figure class="media small">
                @if (frame(); as src) {
                  <img [src]="src" [alt]="c.name" />
                }
              </figure>
              <p class="set-name">{{ c.name }}</p>
              <h2 class="big">Serie {{ setNumber() }} de {{ c.item.sets }}</h2>
              <section class="goal">
                <p class="goal-line strong">
                  Haz {{ repsWords(c.item) }} repeticiones{{ weight() !== null ? ' con ' + weight() + ' kg' : '' }}.
                </p>
                <p class="goal-line">Para cuando sientas que te quedan {{ target[0] }} o {{ target[1] }} más.</p>
              </section>
              @if (c.advice.kg !== null) {
                <p class="load-label">{{ loadLabel(c.advice) }}</p>
                <div class="stepper">
                  <ion-button fill="outline" (click)="bumpWeight(-c.advice.step)" aria-label="Menos peso">
                    <ion-icon slot="icon-only" name="remove"></ion-icon>
                  </ion-button>
                  <span class="value">{{ weight() }} <small>kg</small></span>
                  <ion-button fill="outline" (click)="bumpWeight(c.advice.step)" aria-label="Más peso">
                    <ion-icon slot="icon-only" name="add"></ion-icon>
                  </ion-button>
                </div>
              }
              <p class="load-label">¿Cuántas repeticiones hiciste?</p>
              <div class="stepper">
                <ion-button fill="outline" (click)="bumpReps(-1)" aria-label="Menos repeticiones">
                  <ion-icon slot="icon-only" name="remove"></ion-icon>
                </ion-button>
                <span class="value">{{ reps() }}</span>
                <ion-button fill="outline" (click)="bumpReps(1)" aria-label="Más repeticiones">
                  <ion-icon slot="icon-only" name="add"></ion-icon>
                </ion-button>
              </div>
              <p class="todo">
                <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon> Al terminar la serie, ajusta el
                número si hiciste otra cantidad y toca <strong>Serie lista</strong>.
              </p>
            }
          }

          <!-- 2b. Ejercicios por tiempo (estiramientos, plancha, cardio) -->
          @case ('timed') {
            @if (current(); as c) {
              <figure class="media small">
                @if (frame(); as src) {
                  <img [src]="src" [alt]="c.name" />
                }
              </figure>
              <h2 class="big">{{ c.name }}</h2>
              @if (c.item.sets > 1) {
                <p class="hint center-text">Serie {{ setNumber() }} de {{ c.item.sets }}</p>
              }
              <section class="goal">
                @for (line of c.objective; track line) {
                  <p class="goal-line">{{ line }}</p>
                }
              </section>
              <p class="timer">{{ timerLeft() === null ? fmt(c.seconds) : fmt(timerLeft()!) }}</p>
              @if (timerLeft() === null) {
                <ion-button expand="block" fill="outline" (click)="startTimedWithCountdown(c.seconds)">
                  <ion-icon slot="start" name="play"></ion-icon> Iniciar cronómetro
                </ion-button>
              }
              <p class="todo">
                <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon> Inicia el cronómetro, mantén hasta
                que termine y toca <strong>Listo</strong>.
              </p>
            }
          }

          <!-- 3. RIR de la serie (la "calificación" de cuánto costó) -->
          @case ('rir') {
            @if (current(); as c) {
              @if (rirChosen() === null) {
                <h2 class="big">¿Cuántas repeticiones más podías hacer?</h2>
                <p class="hint center-text">
                  Piensa: si hubieras seguido con buena técnica, ¿cuántas más te salían? Lo ideal hoy:
                  {{ target[0] }} o {{ target[1] }}.
                </p>
                <div class="rir-list">
                  @for (o of rirOptions; track o.rir) {
                    <button
                      class="rir"
                      [class.ideal]="o.rir >= target[0] && o.rir <= target[1]"
                      (click)="chooseRir(o.rir)"
                    >
                      <span class="rir-n">{{ o.label }}</span>
                      <span class="rir-text">{{ o.text }}</span>
                      <span class="rir-rpe">{{ o.rpe }}</span>
                    </button>
                  }
                </div>
                <p class="hint center-text">
                  Esto se llama <strong>RIR</strong> (repeticiones en reserva). Lo usamos para ajustar tu peso.
                </p>
              } @else {
                <h2 class="big">¡Listo!</h2>
                <p class="center-text">{{ exerciseFeedback() }}</p>
                <p class="q">¿Qué tal te pareció este ejercicio?</p>
                <p class="hint">1 = no me gustó nada · 10 = excelente. Nos ayuda a elegir mejor tus ejercicios.</p>
                <div class="scale">
                  @for (n of srpeScale; track n) {
                    <button
                      class="dot"
                      [class.on]="ratingFor(c.item.exercise_id) === n"
                      (click)="rate(c.item.exercise_id, n)"
                    >
                      {{ n }}
                    </button>
                  }
                </div>
                @if ((ratingFor(c.item.exercise_id) ?? 10) <= 4) {
                  <ion-button expand="block" fill="outline" (click)="openSwap()">
                    <ion-icon slot="start" name="swap-horizontal"></ion-icon> Cambiarlo por otro la próxima vez
                  </ion-button>
                }
                @if (nextItem(); as n) {
                  <p class="hint center-text">
                    Siguiente: <strong>{{ n }}</strong>
                  </p>
                }
              }
            }
          }

          <!-- 4. Descanso entre series -->
          @case ('rest') {
            <h2 class="big">Descansa</h2>
            <p class="timer">{{ fmt(timerLeft() ?? 0) }}</p>
            <p class="center-text">
              Recupera el aire. Siguiente: <strong>serie {{ setNumber() }} de {{ current()?.item?.sets }}</strong>
              {{ weight() !== null ? 'con ' + weight() + ' kg' : '' }}.
            </p>
            @if (suggestion(); as s) {
              <div class="suggest">
                <p>{{ s.text }}</p>
                <ion-button size="small" (click)="applySuggestion()">Usar {{ s.kg }} kg</ion-button>
              </div>
            }
            <div class="row">
              <ion-button fill="outline" (click)="addRest(30)">+30 s</ion-button>
              <ion-button fill="clear" (click)="endRest()">Saltar descanso</ion-button>
            </div>
            <p class="todo">
              <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon> Cuando suene el cronómetro, haz la
              siguiente serie.
            </p>
          }

          <!-- 5. Fin del día: esfuerzo y opinión de la guía -->
          @case ('finish') {
            <h1 class="center-text">{{ incomplete() ? 'Fin del día' : '¡Terminaste!' }}</h1>
            @if (incomplete()) {
              <p class="done-note">Hiciste {{ exercisesDone() }} de {{ items().length }} ejercicios.</p>
              <p class="q">¿Por qué terminaste antes? (puedes elegir varios)</p>
              <p class="hint">Con esto ajustamos tus próximas rutinas.</p>
              <div class="reasons">
                @for (r of endReasonOptions; track r.value) {
                  <button class="reason" [class.on]="endReasons().includes(r.value)" (click)="toggleEndReason(r.value)">
                    {{ r.label }}
                  </button>
                }
              </div>
              @if (endReasons().includes('otro') || endReasons().length > 0) {
                <ion-textarea
                  label="Cuéntanos más (opcional)"
                  labelPlacement="floating"
                  fill="outline"
                  [maxlength]="300"
                  [autoGrow]="true"
                  [value]="endNote()"
                  (ionInput)="endNote.set($event.detail.value ?? '')"
                ></ion-textarea>
              }
              <ion-button expand="block" fill="clear" (click)="keepTraining()"
                >Me equivoqué, seguir entrenando</ion-button
              >
            }
            <p class="q">¿Qué tan duro fue el entrenamiento de hoy?</p>
            <p class="hint">1 = muy suave, como caminar · 10 = lo más duro que puedes.</p>
            <div class="scale">
              @for (n of srpeScale; track n) {
                <button class="dot" [class.on]="sessionRpe() === n" (click)="sessionRpe.set(n)">{{ n }}</button>
              }
            </div>
            <p class="hint center-text">{{ sessionRpe() ? srpeLabel(sessionRpe()!) : '' }}</p>

            <p class="q">¿Te sirvió la guía de hoy?</p>
            <p class="hint">Las indicaciones, el peso recomendado y el orden de los ejercicios.</p>
            <div class="grid5">
              @for (g of guideOptions; track g.value) {
                <button class="pick" [class.on]="guideRating() === g.value" (click)="guideRating.set(g.value)">
                  <ion-icon class="pick-main" [name]="g.icon" aria-hidden="true"></ion-icon>
                  <span class="pick-sub">{{ g.label }}</span>
                </button>
              }
            </div>
            <ion-textarea
              class="ion-margin-top"
              label="¿Algo que mejorar? (opcional)"
              labelPlacement="floating"
              fill="outline"
              [maxlength]="300"
              [autoGrow]="true"
              [value]="feedback()"
              (ionInput)="feedback.set($event.detail.value ?? '')"
            ></ion-textarea>
            <p class="todo">
              <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon> Toca <strong>Guardar</strong>: así
              mejoramos tu próxima rutina.
            </p>
          }

          <!-- 6. Resumen: cada número con su explicación -->
          @case ('done') {
            <h1 class="center-text">¡Buen trabajo!</h1>
            @if (incomplete()) {
              <p class="done-note">Hiciste {{ exercisesDone() }} de {{ items().length }} ejercicios. ¡Igual suma!</p>
            }
            <div class="stats">
              <div>
                <strong>{{ summary().minutes }} min</strong>
                <span>de entrenamiento</span>
              </div>
              <div>
                <strong>{{ summary().effectiveSets }}</strong>
                <span>series efectivas</span>
                <small>Hechas cerca de tu límite (te quedaban 3 o menos). Son las que más te hacen progresar.</small>
              </div>
              <div>
                <strong>{{ summary().tonnage }} kg</strong>
                <span>movidos</span>
                <small>Peso × repeticiones de todo el día. Si sube con las semanas, progresas.</small>
              </div>
              @if (sessionRpe(); as r) {
                <div>
                  <strong>{{ r }}/10</strong>
                  <span>esfuerzo: {{ srpeLabel(r).toLowerCase() }}</span>
                  <small>Cómo sentiste el día completo.</small>
                </div>
              }
            </div>
            @if (summary().times.length > 0) {
              <p class="block-title">⏱ Tiempo por ejercicio</p>
              <div class="times">
                @for (t of summary().times; track t.exercise_id) {
                  <div class="time-row">
                    <div>
                      <strong>{{ t.name }}</strong>
                      <small>{{ t.sets }} series · trabajo {{ clock(t.workS) }} · descanso {{ clock(t.restS) }}</small>
                    </div>
                    <span class="time-total">{{ clock(t.totalS) }}</span>
                  </div>
                }
              </div>
            }
            <p class="hint center-text">
              {{
                saved() === 'pending'
                  ? 'Sin conexión: lo guardamos en tu teléfono y se enviará solo.'
                  : 'Guardado. Con estos datos ajustaremos tu peso la próxima vez.'
              }}
            </p>
          }
        }
      </div>
    </ion-content>

    <!-- Cuenta regresiva a pantalla completa: 3, 2, 1, ¡Vamos! -->
    @if (countdown() !== null) {
      <div class="countdown" role="status" aria-live="assertive">
        @if (frame(); as src) {
          <figure class="cd-media"><img [src]="src" [alt]="current()?.name ?? ''" /></figure>
          <p class="cd-name">{{ current()?.name }}</p>
        }
        @if (countdown() === 0) {
          <span class="cd-num go">¡Vamos!</span>
        } @else {
          <span class="cd-sub">Prepárate</span>
          @let n = countdown();
          <span class="cd-num">{{ n }}</span>
        }
      </div>
    }

    <!-- Pausa: congela todos los cronómetros -->
    @if (paused()) {
      <div class="paused" role="dialog" aria-label="Entrenamiento en pausa">
        <p class="paused-icon">⏸</p>
        <h2>Entrenamiento en pausa</h2>
        <p>Los cronómetros están detenidos. Tómate tu tiempo.</p>
        <p class="paused-time">{{ clock(pausedElapsed()) }}</p>
        <ion-button size="large" color="light" (click)="resumeWorkout()">
          <ion-icon slot="start" name="play"></ion-icon> Reanudar
        </ion-button>
        <ion-button fill="outline" color="light" (click)="askEndDay()">Terminar el día</ion-button>
        <ion-button fill="clear" color="light" (click)="exit()">Salir y seguir después</ion-button>
      </div>
    }

    <!-- Cambiar ejercicio: alternativas seguras del mismo músculo -->
    <ion-modal
      [isOpen]="swapOpen()"
      (didDismiss)="swapOpen.set(false)"
      [initialBreakpoint]="0.9"
      [breakpoints]="[0, 0.9, 1]"
    >
      <ng-template>
        <ion-content class="ion-padding">
          <h2 class="sheet-title">Cambiar {{ current()?.name }}</h2>
          <p class="hint">¿Por qué? (así no te lo volvemos a proponer)</p>
          <div class="reasons">
            @for (r of swapReasons; track r.value) {
              <button class="reason" [class.on]="swapReason() === r.value" (click)="swapReason.set(r.value)">
                {{ r.label }}
              </button>
            }
          </div>
          @if (alternativesLoading()) {
            <div class="center"><ion-spinner></ion-spinner></div>
          } @else if (alternatives().length === 0) {
            <p>
              No encontramos otro ejercicio seguro para este músculo con tu equipamiento. Pide ayuda al profesor de
              sala.
            </p>
          } @else {
            <p class="block-title">Elige uno que trabaje lo mismo:</p>
            @for (a of alternatives(); track a.exercise.id) {
              <button class="alt" [disabled]="swapping()" (click)="chooseAlternative(a)">
                @if (catalogImage(a); as img) {
                  <img [src]="img" alt="" />
                }
                <span>
                  <strong>{{ altName(a) }}</strong>
                  <small>{{ a.item.sets }} × {{ repsText(a.item) }} · {{ equipmentLabel(a) }}</small>
                </span>
              </button>
            }
          }
          <ion-button expand="block" fill="clear" (click)="swapOpen.set(false)">Cancelar</ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Barra inferior: anterior · acción principal · siguiente (Ley de Fitts) -->
    @if (primaryAction() || showNav()) {
      <ion-footer>
        <ion-toolbar>
          <div class="actions">
            @if (showNav()) {
              <ion-button
                color="primary"
                class="nav"
                fill="outline"
                [disabled]="index() === 0 || countdown() !== null"
                (click)="goTo(index() - 1)"
                aria-label="Ejercicio anterior"
              >
                <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
              </ion-button>
            }
            @if (primaryAction(); as a) {
              <ion-button color="primary" class="main" size="large" [disabled]="a.disabled" (click)="a.run()">{{
                a.label
              }}</ion-button>
            } @else {
              <span class="main hint center-text">{{ phase() === 'rest' ? 'Descansando…' : 'Elige una opción' }}</span>
            }
            @if (showNav()) {
              <ion-button
                color="primary"
                class="nav"
                fill="outline"
                [disabled]="countdown() !== null"
                (click)="goNext()"
                aria-label="Ejercicio siguiente"
              >
                <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
              </ion-button>
            }
          </div>
        </ion-toolbar>
      </ion-footer>
    }
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
    .center-text {
      text-align: center;
    }
    .media {
      margin: 0 0 12px;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      aspect-ratio: 4 / 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .media.small {
      aspect-ratio: 16 / 9;
    }
    .media img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .no-img {
      color: var(--ion-color-medium);
    }
    .ex-name {
      font-size: 1.4rem;
      margin: 4px 0 8px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .chip {
      background: var(--ion-color-light);
      color: var(--ion-color-dark);
      border: 0;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 0.9rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .info {
      font-size: 0.85rem;
      background: var(--ion-color-light);
      padding: 10px 12px;
      border-radius: 12px;
    }
    .cues {
      padding-left: 18px;
      margin: 8px 0 16px;
    }
    .cues li {
      margin: 4px 0;
    }
    .load {
      border-top: 1px solid var(--ion-color-light);
      padding-top: 12px;
    }
    .load-label {
      text-align: center;
      font-weight: 600;
      margin: 16px 0 4px;
    }
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .stepper ion-button {
      width: 56px;
      height: 56px;
      --border-radius: 50%;
    }
    .stepper .value {
      font-size: 2.4rem;
      font-weight: 700;
      min-width: 110px;
      text-align: center;
    }
    .stepper small {
      font-size: 1rem;
      font-weight: 400;
    }
    .mini {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .mini img {
      width: 64px;
      height: 48px;
      object-fit: contain;
      background: #fff;
      border-radius: 8px;
    }
    .big {
      text-align: center;
      font-size: 1.5rem;
      margin: 20px 0 6px;
    }
    .timer {
      text-align: center;
      font-size: 4rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      margin: 16px 0;
    }
    .grid5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin: 16px 0;
    }
    .pick {
      border: 2px solid var(--ion-color-light-shade);
      background: var(--ion-background-color, #fff);
      color: inherit;
      border-radius: 14px;
      min-height: 72px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .pick.on,
    .dot.on {
      border-color: var(--ion-color-primary);
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
    }
    .pick-main {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .pick-sub {
      font-size: 0.7rem;
    }
    .q {
      font-weight: 600;
      margin: 24px 0 8px;
    }
    .scale {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
    }
    .dot {
      border: 2px solid var(--ion-color-light-shade);
      background: transparent;
      color: inherit;
      border-radius: 10px;
      min-height: 44px;
      font-weight: 700;
    }
    .suggest {
      background: var(--ion-color-light);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
      margin: 12px 0;
    }
    .suggest p {
      margin: 0 0 8px;
    }
    .row {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 20px 0;
    }
    .stats div {
      background: var(--ion-color-light);
      border-radius: 14px;
      padding: 14px;
      text-align: center;
      display: flex;
      flex-direction: column;
    }
    .stats strong {
      font-size: 1.6rem;
    }
    .goal {
      background: color-mix(in srgb, var(--ion-color-primary) 12%, transparent);
      border: 2px solid var(--ion-color-primary);
      border-radius: 16px;
      padding: 12px 16px;
      margin: 12px 0 16px;
    }
    .goal-title {
      font-weight: 700;
      font-size: 1.05rem;
      margin: 0 0 6px;
    }
    .goal-line {
      font-size: 1.05rem;
      margin: 4px 0;
      line-height: 1.35;
    }
    .goal-line.strong {
      font-size: 1.2rem;
      font-weight: 700;
    }
    .block-title {
      font-weight: 700;
      margin: 16px 0 4px;
    }
    .todo {
      margin: 20px 0 8px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--ion-color-light);
      text-align: center;
    }
    .rir-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 16px 0;
    }
    .rir {
      display: grid;
      grid-template-columns: 48px 1fr auto;
      align-items: center;
      gap: 8px;
      min-height: 60px;
      padding: 0 14px;
      border: 2px solid var(--ion-color-light-shade);
      border-radius: 14px;
      background: var(--ion-background-color, #fff);
      color: inherit;
      text-align: left;
    }
    .rir.ideal {
      border-color: var(--ion-color-primary);
    }
    .rir-n {
      font-size: 1.6rem;
      font-weight: 700;
      text-align: center;
    }
    .rir-text {
      font-size: 1.05rem;
    }
    .rir-rpe {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }
    .stats small {
      display: block;
      margin-top: 6px;
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      line-height: 1.3;
    }
    .swap-btn {
      margin: -4px 0 4px -8px;
      font-size: 0.85rem;
    }
    .set-name {
      text-align: center;
      font-weight: 700;
      font-size: 1.1rem;
      margin: 4px 0 0;
    }
    .cd-media {
      width: min(80vw, 360px);
      aspect-ratio: 4 / 3;
      margin: 0 0 8px;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
    }
    .cd-media img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .cd-name {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0 0 8px;
      text-align: center;
    }
    .paused {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      text-align: center;
      background: var(--ion-color-dark);
      color: var(--ion-color-dark-contrast);
    }
    .paused-icon {
      font-size: 4rem;
      margin: 0;
    }
    .paused-time {
      font-size: 2.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .sheet-title {
      margin-top: 8px;
    }
    .reasons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .reason {
      border: 2px solid var(--ion-color-light-shade);
      background: transparent;
      color: inherit;
      border-radius: 999px;
      padding: 8px 14px;
      min-height: 44px;
    }
    .reason.on {
      border-color: var(--ion-color-primary);
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
    }
    .alt {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 72px;
      margin: 8px 0;
      padding: 8px;
      border: 2px solid var(--ion-color-light-shade);
      border-radius: 14px;
      background: transparent;
      color: inherit;
      text-align: left;
    }
    .alt img {
      width: 72px;
      height: 54px;
      object-fit: contain;
      background: #fff;
      border-radius: 8px;
    }
    .alt small {
      display: block;
      color: var(--ion-color-medium);
    }
    .clock-bar {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 12px;
      background: var(--ion-color-light);
      font-variant-numeric: tabular-nums;
    }
    .countdown {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
    }
    .cd-num {
      font-size: 9rem;
      font-weight: 800;
      line-height: 1;
      animation: pop 1s ease-out;
    }
    .cd-num.go {
      font-size: 4.5rem;
    }
    .cd-sub {
      font-size: 1.4rem;
      margin-bottom: 12px;
    }
    @keyframes pop {
      from {
        transform: scale(1.4);
        opacity: 0.4;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .cd-num {
        animation: none;
      }
    }
    .times {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .time-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--ion-color-light);
    }
    .time-row small {
      display: block;
      color: var(--ion-color-medium);
    }
    .time-total {
      font-size: 1.2rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .actions {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      max-width: 480px;
      margin: 0 auto;
    }
    .actions .nav {
      margin: 0;
      width: 56px;
      min-height: 56px;
      --padding-start: 0;
      --padding-end: 0;
    }
    span.main {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .done-note {
      text-align: center;
      font-weight: 600;
    }
    .actions .main {
      flex: 1;
      margin: 0;
      min-height: 56px;
    }
  `,
})
export class WorkoutPage implements OnInit, OnDestroy {
  /** Id del día de la rutina (ruta /entrenar/:dayId). */
  readonly dayId = input.required<string>();

  private readonly catalog = inject(ExerciseService);
  private readonly routines = inject(RoutineService);
  private readonly workouts = inject(WorkoutService);
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly rirOptions = RIR_OPTIONS;
  readonly guideOptions = GUIDE_OPTIONS;
  readonly srpeScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  readonly phase = signal<Phase>('loading');
  readonly error = signal('');
  readonly day = signal<StoredDay | null>(null);
  readonly index = signal(0);
  readonly setNumber = signal(1);
  readonly weight = signal<number | null>(null);
  readonly reps = signal(10);
  readonly sets = signal<SessionSetPayload[]>([]);
  readonly weights = signal<Record<string, number | null>>({});
  readonly rirChosen = signal<number | null>(null);
  readonly timerEndsAt = signal<number | null>(null);
  /** Cuenta regresiva antes de empezar: 3, 2, 1 y 0 (= "¡Vamos!"). */
  readonly countdown = signal<number | null>(null);
  /** Momento en que empezó el ejercicio actual y la serie actual (ms). */
  readonly exerciseStartedAt = signal<number | null>(null);
  readonly setStartedAt = signal<number | null>(null);
  readonly clock = clock;
  /** Pausa: congela cronómetros; el tiempo en pausa no cuenta en las métricas. */
  readonly paused = signal(false);
  readonly pausedAt = signal<number | null>(null);
  private pausedTotalMs = 0;
  private pausedRemaining: number | null = null;
  /** Calificación 1-10 de cada ejercicio. */
  readonly ratings = signal<Record<string, number>>({});
  /** Cambio de ejercicio. */
  readonly swapOpen = signal(false);
  readonly swapReason = signal<SwapReason>('no_me_gusta');
  readonly alternatives = signal<Alternative[]>([]);
  readonly alternativesLoading = signal(false);
  readonly swapping = signal(false);
  readonly swapReasons: { value: SwapReason; label: string }[] = [
    { value: 'no_me_gusta', label: 'No me gusta' },
    { value: 'molestia', label: 'Me molesta o duele' },
    { value: 'no_hay_maquina', label: 'No hay máquina' },
    { value: 'muy_dificil', label: 'Muy difícil' },
  ];
  private routine: StoredRoutine | null = null;
  /** Terminar el día antes: motivos para mejorar las rutinas. */
  readonly endedEarly = signal(false);
  readonly endReasons = signal<EndReason[]>([]);
  readonly endNote = signal('');
  readonly endReasonOptions: { value: EndReason; label: string }[] = [
    { value: 'cansancio', label: 'Me cansé / sin energía' },
    { value: 'sin_tiempo', label: 'Me faltó tiempo' },
    { value: 'dolor', label: 'Dolor o molestia' },
    { value: 'sin_equipo', label: 'Máquina ocupada o sin equipo' },
    { value: 'muy_dificil', label: 'Muy difícil' },
    { value: 'muy_facil', label: 'Muy fácil o aburrido' },
    { value: 'no_entendi', label: 'No entendí algún ejercicio' },
    { value: 'otro', label: 'Otro' },
  ];
  readonly now = signal(Date.now());
  readonly frameIndex = signal(0);
  readonly suggestion = signal<{ text: string; kg: number } | null>(null);
  readonly sessionRpe = signal<number | null>(null);
  readonly guideRating = signal<number | null>(null);
  readonly feedback = signal('');
  readonly saving = signal(false);
  readonly saved = signal<'saved' | 'pending' | null>(null);
  readonly finishedAt = signal<string | null>(null);

  private startedAt = new Date().toISOString();
  private restStartedAt: number | null = null;
  /** Descanso real (s) que se tomó antes de la serie actual. */
  private pendingRest = 0;
  private lastBeep: number | null = null;
  private athlete: LoadAthlete | null = null;
  /** RIR objetivo según el perfil (principiante 2-3, resto 1-2). */
  target: [number, number] = [2, 3];
  private history = new Map<string, LoadHistoryEntry[]>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private readonly reducedMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    addIcons({
      flagOutline,
      locationOutline,
      checkmarkCircleOutline,
      barbellOutline,
      checkmark,
      arrowForwardOutline,
      sad,
      sadOutline,
      removeCircleOutline,
      happyOutline,
      happy,
      add,
      chevronBack,
      chevronForward,
      close,
      pause,
      play,
      remove,
      swapHorizontal,
    });
    // Guarda el avance en cada cambio para poder retomarlo si se cierra la app.
    effect(() => {
      const phase = this.phase();
      if (phase === 'loading' || phase === 'error' || phase === 'done') return;
      const draft: Draft = {
        dayId: this.dayId(),
        startedAt: this.startedAt,
        index: this.index(),
        setNumber: this.setNumber(),
        phase: phase === 'rest' || phase === 'rir' ? 'set' : phase,
        sets: this.sets(),
        weights: this.weights(),
      };
      localStore.set(this.draftKey(), draft);
    });
  }

  // ---------- Datos derivados ----------

  readonly items = computed(() => this.day()?.routine_exercises ?? []);

  readonly current = computed(() => {
    const item = this.items()[this.index()];
    if (!item) return null;
    const ex = this.catalog.byId().get(item.exercise_id);
    const timed = item.reps_min === 1 && item.reps_max === 1;
    const advice = ex
      ? this.adviceFor(ex, item, timed)
      : ({ kg: null, mode: 'corporal', step: 0, reason: '' } as LoadAdvice);
    return {
      item,
      ex,
      timed,
      advice,
      name: ex ? exerciseName(ex) : 'Ejercicio',
      cues: ex ? techniqueCues(ex) : [],
      setup: ex ? setupCues(ex) : [],
      objective: this.objectiveFor(ex, item, timed),
      images: this.catalog.imageUrls(ex),
      seconds: timed ? secondsFrom(item.notes) : 0,
      target: timed
        ? item.sets > 1
          ? `${item.sets} × ${this.fmt(secondsFrom(item.notes))}`
          : this.fmt(secondsFrom(item.notes))
        : `${item.sets} × ${this.repsText(item)}`,
    };
  });

  readonly frame = computed(() => {
    const imgs = this.current()?.images ?? [];
    if (imgs.length === 0) return null;
    return imgs[this.frameIndex() % imgs.length];
  });

  readonly timerLeft = computed(() => {
    const end = this.timerEndsAt();
    return end === null ? null : Math.max(0, Math.ceil((end - this.now()) / 1000));
  });

  readonly title = computed(() => {
    const total = this.items().length;
    if (this.phase() === 'finish' || this.phase() === 'done') return 'Resumen';
    return total ? `Ejercicio ${Math.min(this.index() + 1, total)} de ${total}` : 'Entrenamiento';
  });

  readonly progressValue = computed(() => {
    const total = this.items().length || 1;
    if (this.phase() === 'finish' || this.phase() === 'done') return 1;
    return this.index() / total;
  });

  readonly nextItem = computed(() => {
    const next = this.items()[this.index() + 1];
    if (!next) return null;
    const ex = this.catalog.byId().get(next.exercise_id);
    return ex ? exerciseName(ex) : 'Siguiente ejercicio';
  });

  readonly exerciseFeedback = computed(() => {
    const rir = this.rirChosen();
    if (rir === null) return '';
    if (rir < this.target[0]) return 'Fue más pesado de lo ideal. La próxima vez ajustaremos el peso.';
    if (rir > this.target[1]) return 'Te sobró margen. La próxima vez subiremos un poco.';
    return '¡Justo en el objetivo!';
  });

  readonly showNav = computed(
    () => ['exercise', 'set', 'timed', 'rir', 'rest'].includes(this.phase()) && !this.paused(),
  );
  /** Ejercicios del día con al menos una serie hecha. */
  readonly exercisesDone = computed(() => {
    const done = new Set(this.sets().map((s) => s.exercise_id));
    return this.items().filter((i) => done.has(i.exercise_id)).length;
  });
  readonly incomplete = computed(() => this.endedEarly() || this.exercisesDone() < this.items().length);
  readonly pausedElapsed = computed(() => secondsBetween(this.pausedAt(), this.now()));
  readonly canPause = computed(
    () => ['exercise', 'set', 'timed', 'rir', 'rest'].includes(this.phase()) && !this.paused(),
  );
  readonly exerciseElapsed = computed(() => secondsBetween(this.exerciseStartedAt(), this.now()));
  readonly setElapsed = computed(() => secondsBetween(this.setStartedAt(), this.now()));
  readonly showClocks = computed(
    () => this.exerciseStartedAt() !== null && ['set', 'timed', 'rest', 'rir'].includes(this.phase()),
  );

  readonly summary = computed(() => {
    const m = sessionMetrics(this.sets());
    const end = this.finishedAt() ? new Date(this.finishedAt()!).getTime() : Date.now();
    return {
      minutes: Math.max(1, Math.round((end - new Date(this.startedAt).getTime() - this.pausedTotalMs) / 60000)),
      effectiveSets: m.effectiveSets,
      tonnage: m.tonnage,
      inol: m.inol,
      times: exerciseTimes(this.sets()).map((t) => {
        const ex = this.catalog.byId().get(t.exercise_id);
        return { ...t, name: ex ? exerciseName(ex) : 'Ejercicio' };
      }),
    };
  });

  /** Botón principal según la fase. */
  readonly primaryAction = computed<{ label: string; run: () => void; disabled?: boolean } | null>(() => {
    switch (this.phase()) {
      case 'exercise':
        return {
          label: this.introLabel(),
          run: () => void this.startExercise(),
          disabled: this.countdown() !== null,
        };
      case 'set':
        return { label: `Serie ${this.setNumber()} lista`, run: () => this.finishSet() };
      case 'timed':
        return { label: 'Listo', run: () => this.finishTimed() };
      case 'rir':
        return this.rirChosen() === null
          ? null
          : { label: this.nextItem() ? 'Siguiente ejercicio' : 'Terminar el día', run: () => this.nextExercise() };
      case 'rest':
        return null;
      case 'finish':
        return {
          label: this.saving() ? 'Guardando…' : 'Guardar',
          run: () => void this.save(),
          disabled: this.saving(),
        };
      case 'done':
        return { label: 'Volver al inicio', run: () => void this.router.navigateByUrl('/home', { replaceUrl: true }) };
      default:
        return null;
    }
  });

  // ---------- Ciclo de vida ----------

  ngOnInit() {
    void this.init();
    this.ticker = setInterval(() => this.tick(), 1000);
    void this.keepScreenOn();
  }

  ngOnDestroy() {
    if (this.ticker) clearInterval(this.ticker);
    void this.wakeLock?.release().catch(() => undefined);
  }

  async init() {
    this.phase.set('loading');
    try {
      await this.profiles.load().catch(() => undefined);
      await this.catalog.ensureLoaded().catch(() => undefined);
      const { routine } = await this.routines.loadActive();
      this.routine = routine;
      const day = routine?.routine_days.find((d) => d.id === this.dayId()) ?? null;
      if (!day) {
        this.error.set('Este día ya no está en tu rutina actual.');
        this.phase.set('error');
        return;
      }
      // Perfil e historial ANTES de publicar el día: la recomendación de peso depende de ambos.
      this.buildAthlete();
      this.history = await this.workouts
        .history([...new Set(day.routine_exercises.map((e) => e.exercise_id))])
        .catch(() => new Map());
      this.day.set(day);

      const draft = localStore.get<Draft>(this.draftKey());
      const fresh = draft && Date.now() - new Date(draft.startedAt).getTime() < 12 * 3600_000;
      if (draft && fresh) {
        this.startedAt = draft.startedAt;
        this.sets.set(draft.sets);
        this.weights.set(draft.weights);
        this.index.set(Math.min(draft.index, day.routine_exercises.length));
        this.setNumber.set(draft.setNumber);
        this.prepareExercise(draft.phase === 'set' || draft.phase === 'timed' ? draft.phase : 'exercise');
        if (this.index() >= day.routine_exercises.length) this.phase.set('finish');
      } else {
        this.startedAt = new Date().toISOString();
        this.prepareExercise('exercise');
      }
    } catch {
      this.error.set('No se pudo cargar el entrenamiento. Revisa tu internet.');
      this.phase.set('error');
    }
  }

  // ---------- Acciones ----------

  /** Empezar: cuenta regresiva 3-2-1 y arranca el cronómetro del ejercicio. */
  async startExercise() {
    const c = this.current();
    if (!c || this.countdown() !== null) return;
    await this.runCountdown();
    const now = Date.now();
    // Si vuelve a un ejercicio, sigue desde la serie que falta.
    this.setNumber.set(Math.min(20, this.doneSetsFor(c.item.exercise_id) + 1));
    this.exerciseStartedAt.set(now);
    this.setStartedAt.set(now);
    this.pendingRest = 0;
    this.phase.set(c.timed ? 'timed' : 'set');
    // Ejercicios por tiempo: el cronómetro arranca solo después del "¡Vamos!".
    if (c.timed) this.startTimer(c.seconds);
  }

  /** Iniciar el cronómetro de un ejercicio por tiempo, con cuenta regresiva. */
  async startTimedWithCountdown(seconds: number) {
    if (this.countdown() !== null) return;
    await this.runCountdown();
    this.setStartedAt.set(Date.now());
    this.startTimer(seconds);
  }

  private async runCountdown() {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (const n of [3, 2, 1]) {
      this.countdown.set(n);
      beep(660);
      buzz(60);
      await wait(1000);
    }
    this.countdown.set(0);
    beep(1040, 320);
    buzz(200);
    await wait(700);
    this.countdown.set(null);
  }

  finishSet() {
    const c = this.current();
    if (!c) return;
    this.sets.update((list) => [
      ...list,
      {
        exercise_id: c.item.exercise_id,
        set_number: this.setNumber(),
        reps: this.reps(),
        weight_kg: this.weight(),
        rir: null,
        duration_s: secondsBetween(this.setStartedAt(), Date.now()),
        rest_s: this.pendingRest,
      },
    ]);
    this.setStartedAt.set(null);
    this.weights.update((w) => ({ ...w, [c.item.exercise_id]: this.weight() }));
    this.rirChosen.set(null);
    this.phase.set('rir');
  }

  /** RIR de la serie recién hecha: decide descanso, ajuste de peso o fin del ejercicio. */
  chooseRir(rir: number) {
    const c = this.current();
    if (!c) return;
    this.sets.update((list) => {
      const copy = [...list];
      const last = copy[copy.length - 1];
      if (last) copy[copy.length - 1] = { ...last, rir };
      return copy;
    });
    const lastSet = this.setNumber() >= c.item.sets;
    if (lastSet) {
      this.rirChosen.set(rir);
      return;
    }
    // Autorregulación: si el RIR real se aleja del objetivo, sugerimos ajustar el peso.
    const delta = this.weight() === null ? 0 : adjustAfterSet(rir, this.target, c.advice.mode, this.weight()!);
    this.suggestion.set(
      delta === 0
        ? null
        : {
            kg: Math.max(0, this.weight()! + delta),
            text:
              delta > 0
                ? `Te sobraron ${rir >= 4 ? '4 o más' : rir}: en la siguiente serie súbele un poco (RPE ${rpeFromRir(rir)}).`
                : `Fue muy pesado (te quedaban ${rir}): en la siguiente serie bájale un poco (RPE ${rpeFromRir(rir)}).`,
          },
    );
    this.setNumber.update((n) => n + 1);
    this.startRest(c.item.rest_seconds);
  }

  finishTimed() {
    const c = this.current();
    if (!c) return;
    this.timerEndsAt.set(null);
    // También se registran (sin peso ni repeticiones) para saber cuánto tiempo tomaron.
    this.sets.update((list) => [
      ...list,
      {
        exercise_id: c.item.exercise_id,
        set_number: this.setNumber(),
        reps: null,
        weight_kg: null,
        rir: null,
        duration_s: secondsBetween(this.setStartedAt(), Date.now()),
        rest_s: this.pendingRest,
      },
    ]);
    this.setStartedAt.set(null);
    if (this.setNumber() < c.item.sets) {
      this.setNumber.update((n) => n + 1);
      this.suggestion.set(null);
      this.startRest(c.item.rest_seconds);
      return;
    }
    this.nextExercise();
  }

  nextExercise() {
    this.exerciseStartedAt.set(null);
    this.setStartedAt.set(null);
    this.pendingRest = 0;
    this.rirChosen.set(null);
    this.suggestion.set(null);
    this.timerEndsAt.set(null);
    this.index.update((i) => i + 1);
    if (this.index() >= this.items().length) {
      this.finishedAt.set(new Date().toISOString());
      this.phase.set('finish');
      return;
    }
    this.prepareExercise('exercise');
  }

  // ---------- Navegación entre ejercicios ----------

  doneSetsFor(exerciseId: string): number {
    return this.sets().filter((s) => s.exercise_id === exerciseId).length;
  }

  private introLabel(): string {
    const c = this.current();
    const done = c ? this.doneSetsFor(c.item.exercise_id) : 0;
    if (!c || done === 0) return 'Empezar';
    return done >= c.item.sets ? 'Serie extra' : `Continuar (serie ${done + 1})`;
  }

  /** Ir a otro ejercicio del día. La serie en curso que no se marcó como lista se descarta. */
  goTo(i: number) {
    if (i < 0 || i >= this.items().length || this.countdown() !== null) return;
    this.resetExerciseState();
    this.index.set(i);
    this.prepareExercise('exercise');
  }

  /** Siguiente ejercicio; en el último, cierra el día (y pregunta el motivo si falta algo). */
  goNext() {
    if (this.index() + 1 < this.items().length) {
      this.goTo(this.index() + 1);
      return;
    }
    this.resetExerciseState();
    this.finishedAt.set(new Date().toISOString());
    this.phase.set('finish');
  }

  /** Terminar el día ahora: confirma y lleva al cierre, donde se pregunta el porqué. */
  async askEndDay() {
    const alert = await this.alerts.create({
      header: 'Terminar el día',
      message: 'Guardaremos lo que hiciste y te preguntaremos el motivo para mejorar tu rutina.',
      buttons: [
        { text: 'Seguir entrenando', role: 'cancel' },
        { text: 'Terminar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    if (this.paused()) this.resumeWorkout();
    this.resetExerciseState();
    this.endedEarly.set(true);
    this.finishedAt.set(new Date().toISOString());
    this.phase.set('finish');
  }

  /** Se arrepintió de terminar: vuelve al primer ejercicio sin hacer. */
  keepTraining() {
    this.endedEarly.set(false);
    this.endReasons.set([]);
    this.finishedAt.set(null);
    const done = new Set(this.sets().map((s) => s.exercise_id));
    const next = this.items().findIndex((i) => !done.has(i.exercise_id));
    this.goTo(next < 0 ? Math.max(0, this.items().length - 1) : next);
  }

  toggleEndReason(r: EndReason) {
    this.endReasons.update((list) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]));
  }

  private resetExerciseState() {
    this.exerciseStartedAt.set(null);
    this.setStartedAt.set(null);
    this.restStartedAt = null;
    this.pendingRest = 0;
    this.rirChosen.set(null);
    this.suggestion.set(null);
    this.timerEndsAt.set(null);
  }

  bumpWeight(delta: number) {
    this.weight.update((w) => Math.max(0, Math.round(((w ?? 0) + delta) * 10) / 10));
  }

  bumpReps(delta: number) {
    this.reps.update((r) => Math.min(100, Math.max(0, r + delta)));
  }

  applySuggestion() {
    const s = this.suggestion();
    if (s) this.weight.set(s.kg);
    this.suggestion.set(null);
  }

  startTimer(seconds: number) {
    this.timerEndsAt.set(Date.now() + seconds * 1000);
    this.now.set(Date.now());
  }

  addRest(seconds: number) {
    this.timerEndsAt.update((t) => (t ?? Date.now()) + seconds * 1000);
  }

  endRest() {
    const now = Date.now();
    this.timerEndsAt.set(null);
    this.pendingRest = secondsBetween(this.restStartedAt, now);
    this.restStartedAt = null;
    this.setStartedAt.set(now);
    const c = this.current();
    this.phase.set(c?.timed ? 'timed' : 'set');
    if (c?.timed) this.startTimer(c.seconds);
  }

  // ---------- Pausa ----------

  pauseWorkout() {
    if (this.paused()) return;
    const now = Date.now();
    this.pausedAt.set(now);
    this.now.set(now);
    const end = this.timerEndsAt();
    this.pausedRemaining = end === null ? null : Math.max(0, end - now);
    this.timerEndsAt.set(null);
    this.paused.set(true);
  }

  resumeWorkout() {
    const at = this.pausedAt();
    if (!this.paused() || at === null) return;
    const now = Date.now();
    const delta = now - at;
    this.pausedTotalMs += delta;
    // Se corren los inicios para que la pausa no cuente como trabajo ni descanso.
    const shift = (v: number | null) => (v === null ? null : v + delta);
    this.exerciseStartedAt.update(shift);
    this.setStartedAt.update(shift);
    this.restStartedAt = shift(this.restStartedAt);
    if (this.pausedRemaining !== null) this.timerEndsAt.set(now + this.pausedRemaining);
    this.pausedRemaining = null;
    this.pausedAt.set(null);
    this.paused.set(false);
    this.now.set(now);
  }

  // ---------- Calificación ----------

  ratingFor(exerciseId: string): number | null {
    return this.ratings()[exerciseId] ?? null;
  }

  rate(exerciseId: string, value: number) {
    this.ratings.update((r) => ({ ...r, [exerciseId]: value }));
  }

  // ---------- Cambiar ejercicio ----------

  async openSwap() {
    const c = this.current();
    if (!c || !this.routine) return;
    this.swapReason.set((this.ratingFor(c.item.exercise_id) ?? 10) <= 4 ? 'no_me_gusta' : this.swapReason());
    this.swapOpen.set(true);
    this.alternativesLoading.set(true);
    try {
      this.alternatives.set(await this.routines.alternatives(this.routine, c.item.exercise_id));
    } catch {
      this.alternatives.set([]);
    } finally {
      this.alternativesLoading.set(false);
    }
  }

  async chooseAlternative(alt: Alternative) {
    const c = this.current();
    const routine = this.routine;
    if (!c || !routine || this.swapping()) return;
    const oldId = c.item.exercise_id;
    const doneAlready = this.phase() === 'rir';
    this.swapping.set(true);
    try {
      await this.routines.swapExercise(routine.id, oldId, alt.item, this.swapReason());
      // Historial del nuevo ejercicio para recomendar su peso.
      const hist = await this.workouts.history([alt.exercise.id]).catch(() => new Map());
      this.history = new Map([...this.history, ...hist]);
      // Reemplaza en el día actual (misma posición), sin perder lo ya registrado hoy.
      this.day.update((d) =>
        d
          ? {
              ...d,
              routine_exercises: d.routine_exercises.map((e) =>
                e.exercise_id === oldId ? { ...e, ...alt.item, id: e.id, position: e.position } : e,
              ),
            }
          : d,
      );
      this.swapOpen.set(false);
      const name = this.altName(alt);
      if (doneAlready) {
        await this.toast(`Listo: la próxima vez harás ${name}.`);
      } else {
        this.prepareExercise('exercise');
        await this.toast(`Cambiado por ${name} en tu rutina.`);
      }
    } catch {
      await this.toast('No se pudo cambiar el ejercicio. Revisa tu internet.');
    } finally {
      this.swapping.set(false);
    }
  }

  altName(a: Alternative): string {
    return exerciseName(a.exercise);
  }

  catalogImage(a: Alternative): string | null {
    return this.catalog.imageUrl(a.exercise);
  }

  equipmentLabel(a: Alternative): string {
    const e = a.exercise.equipment;
    if (e === 'machine') return 'máquina';
    if (e === 'cable') return 'polea';
    if (e === 'dumbbell') return 'mancuernas';
    if (e === 'barbell') return /smith/i.test(a.exercise.name) ? 'máquina Smith' : 'barra';
    if (!e || e === 'body only') return 'peso corporal';
    return e;
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }

  async save() {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const metrics = sessionMetrics(this.sets());
      const result = await this.workouts.saveSession({
        routine_day_id: this.dayId(),
        started_at: this.startedAt,
        finished_at: this.finishedAt() ?? new Date().toISOString(),
        session_rpe: this.sessionRpe(),
        guide_rating: this.guideRating(),
        notes: this.feedback().trim() || null,
        inol: metrics.inol,
        paused_s: Math.round(this.pausedTotalMs / 1000),
        ratings: Object.entries(this.ratings()).map(([exercise_id, rating]) => ({ exercise_id, rating })),
        ended_early: this.incomplete(),
        end_reasons: this.incomplete() ? this.endReasons() : [],
        end_note: this.incomplete() ? this.endNote().trim() || null : null,
        exercises_planned: this.items().length,
        exercises_done: this.exercisesDone(),
        skipped_exercises: this.items()
          .map((i) => i.exercise_id)
          .filter((id) => this.doneSetsFor(id) === 0),
        sets: this.sets(),
      });
      this.saved.set(result);
      localStore.remove(this.draftKey());
      this.phase.set('done');
    } finally {
      this.saving.set(false);
    }
  }

  async exit() {
    if (this.phase() === 'done' || this.phase() === 'error') {
      await this.router.navigateByUrl('/rutina', { replaceUrl: true });
      return;
    }
    const alert = await this.alerts.create({
      header: '¿Qué quieres hacer?',
      buttons: [
        { text: 'Terminar el día ahora', role: 'end' },
        { text: 'Salir y seguir después', role: 'leave' },
        { text: 'Seguir entrenando', role: 'cancel' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'end') await this.askEndDay();
    if (role === 'leave') await this.router.navigateByUrl('/rutina', { replaceUrl: true });
  }

  // ---------- Textos ----------

  rirText(): string {
    return `${this.target[0]}-${this.target[1]}`;
  }

  repsText(item: Pick<StoredExercise, 'reps_min' | 'reps_max'>): string {
    return item.reps_min === item.reps_max ? `${item.reps_min}` : `${item.reps_min}-${item.reps_max}`;
  }

  loadLabel(a: LoadAdvice): string {
    if (a.mode === 'mancuerna') return 'Peso de cada mancuerna';
    if (a.mode === 'contrapeso') return 'Asistencia de la máquina';
    return 'Peso total';
  }

  repsWords(item: StoredExercise): string {
    return item.reps_min === item.reps_max ? `${item.reps_min}` : `${item.reps_min} a ${item.reps_max}`;
  }

  /** Tiempo en palabras: "30 segundos", "2 minutos", "1 minuto y 15 segundos". */
  words(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const min = m ? `${m} ${m === 1 ? 'minuto' : 'minutos'}` : '';
    const sec = s ? `${s} segundos` : '';
    return [min, sec].filter(Boolean).join(' y ');
  }

  /** "Tu objetivo" en frases simples: qué hacer, cuánto descansar y dónde parar. */
  private objectiveFor(ex: Exercise | undefined, item: StoredExercise, timed: boolean): string[] {
    const rest = item.rest_seconds > 0 ? `Descansa ${this.words(item.rest_seconds)} entre series.` : null;
    if (timed) {
      const secs = secondsFrom(item.notes);
      if (ex?.category === 'cardio') return [cleanNote(item.notes) || `${this.words(secs)} a ritmo moderado.`];
      if (ex?.category === 'stretching') {
        return [
          `Mantén la posición ${this.words(secs)} (cada lado si corresponde).`,
          'Tensión suave: nunca debe doler.',
        ];
      }
      return [
        item.sets > 1 ? `Haz ${item.sets} series de ${this.words(secs)}.` : `Mantén ${this.words(secs)}.`,
        ...(rest && item.sets > 1 ? [rest] : []),
      ];
    }
    const [lo, hi] = this.target;
    return [
      `Haz ${item.sets} series de ${this.repsWords(item)} repeticiones.`,
      ...(rest ? [rest] : []),
      `Para cada serie cuando sientas que te quedan ${lo} o ${hi} repeticiones más (RIR ${lo}-${hi}).`,
    ];
  }

  srpeLabel(n: number): string {
    return SRPE_LABELS[n] ?? '';
  }

  fmt(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`;
  }

  // ---------- Internos ----------

  private draftKey() {
    return `session.${this.dayId()}`;
  }

  private buildAthlete() {
    const health = this.profiles.health();
    const profile = this.profiles.profile();
    if (!health) return;
    const p = buildAthleteProfile(
      health,
      this.profiles.injuries(),
      ageFrom(profile?.birth_date ?? null),
      profile?.gender ?? null,
    );
    this.athlete = {
      bodyweightKg: profile?.weight_kg ? Number(profile.weight_kg) : null,
      gender: profile?.gender ?? null,
      rank: p.rank,
      beginner: p.beginner,
      senior: p.senior,
      cautious: p.cautious,
      marks: p.marks,
    };
    // El RIR objetivo sale de la programación (enfoque, nivel y precauciones).
    this.target = p.programme.rir;
  }

  private adviceFor(ex: Exercise, item: StoredExercise, timed: boolean): LoadAdvice {
    const athlete = this.athlete ?? {
      bodyweightKg: null,
      gender: null,
      rank: 0,
      beginner: true,
      senior: false,
      cautious: false,
    };
    return adviseLoad(ex, item, athlete, this.history.get(ex.id) ?? [], {
      timed,
      assisted: /asistida/i.test(item.notes ?? ''),
    });
  }

  /** Deja listo el ejercicio actual: peso sugerido (o el que ya usó hoy) y repeticiones objetivo. */
  private prepareExercise(phase: Phase) {
    const c = this.current();
    if (!c) {
      this.phase.set('finish');
      return;
    }
    const usedToday = this.weights()[c.item.exercise_id];
    this.weight.set(usedToday ?? c.advice.kg);
    this.reps.set(c.item.reps_max);
    this.frameIndex.set(0);
    this.phase.set(phase);
  }

  private startRest(seconds: number) {
    if (seconds <= 0) {
      this.endRest();
      return;
    }
    this.restStartedAt = Date.now();
    this.startTimer(seconds);
    this.phase.set('rest');
  }

  private tick() {
    this.now.set(Date.now());
    if (this.paused()) return; // en pausa no avanza nada
    // Animación de 2 cuadros (posición inicial y final) para mostrar el movimiento.
    if (!this.reducedMotion) this.frameIndex.update((i) => i + 1);
    const left = this.timerLeft();
    // Últimos 3 segundos del descanso o del cronómetro: 3, 2, 1 con sonido.
    if (left !== null && left > 0 && left <= 3 && this.lastBeep !== left) {
      this.lastBeep = left;
      beep(660);
      buzz(60);
    }
    if (left === 0) {
      this.lastBeep = null;
      this.timerEndsAt.set(null);
      beep(1040, 320);
      buzz([200, 100, 200]);
      if (this.phase() === 'rest') this.endRest();
    }
  }

  /** PWA: mantiene la pantalla encendida mientras se entrena (si el navegador lo permite). */
  private async keepScreenOn() {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      this.wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null;
    }
  }
}

/** Indicación del ejercicio sin la nota de máquina (ej: "En la máquina asistida…"). */
function cleanNote(notes: string | null): string {
  const parts = (notes ?? '').split('. ');
  const last = parts[parts.length - 1] ?? '';
  return last ? last.charAt(0).toUpperCase() + last.slice(1) + '.' : '';
}

/** Segundos de un ejercicio por tiempo, leídos de la indicación ("Mantén 20 a 30 segundos", "15 minutos…"). */
function secondsFrom(notes: string | null): number {
  const m = /(\d+)\s*(?:a\s*(\d+)\s*)?(segundos|minutos)/i.exec(notes ?? '');
  if (!m) return 30;
  const n = Number(m[2] ?? m[1]);
  return /min/i.test(m[3]) ? n * 60 : n;
}
