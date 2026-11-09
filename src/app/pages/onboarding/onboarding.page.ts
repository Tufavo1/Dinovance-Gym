import { Component, computed, effect, inject, signal, type WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { GEAR_GROUPS, PLACE_PRESETS } from '../../core/equipment';
import {
  BODY_AREA_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  DAYS_OPTIONS,
  EXPERIENCE_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  INJURY_KIND_OPTIONS,
  INJURY_STATUS_OPTIONS,
  LAST_TRAINED_OPTIONS,
  MINUTES_OPTIONS,
  PAST_ACTIVITY_OPTIONS,
  PLACE_OPTIONS,
  PREGNANCY_OPTIONS,
  SLEEP_OPTIONS,
  SPORT_OPTIONS,
  STYLE_OPTIONS,
  labelOf,
  type HealthInput,
  type InjuryDraft,
} from '../../core/models';
import { ProfileService } from '../../core/profile.service';

const TOTAL_STEPS = 7;

@Component({
  selector: 'app-onboarding',
  imports: [
    IonBackButton,
    IonButtons,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonProgressBar,
    IonList,
    IonAccordion,
    IonAccordionGroup,
    IonFooter,
    IonItem,
    IonLabel,
    IonNote,
    IonRadioGroup,
    IonRadio,
    IonCheckbox,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonTextarea,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (editMode) {
          <ion-buttons slot="start">
            <ion-back-button defaultHref="/home" text="Inicio"></ion-back-button>
          </ion-buttons>
        }
        <ion-title>{{ editMode ? 'Mis respuestas' : 'Cuéntanos de ti' }}</ion-title>
      </ion-toolbar>
      <ion-progress-bar [value]="(step() + 1) / total"></ion-progress-bar>
    </ion-header>

    <ion-content>
      <div class="page">
        <p class="hint">Paso {{ step() + 1 }} de {{ total }}</p>

        @switch (step()) {
          @case (0) {
            <p class="section-title">¿Cuánta experiencia tienes entrenando?</p>
            <ion-list lines="full" class="group">
              <ion-radio-group [value]="experience()" (ionChange)="experience.set($event.detail.value)">
                @for (o of experienceOptions; track o.value) {
                  <ion-item>
                    <ion-radio [value]="o.value" labelPlacement="end" justify="start">{{ o.label }}</ion-radio>
                  </ion-item>
                }
              </ion-radio-group>
            </ion-list>

            <p class="section-title">¿Cuánto tiempo puedes entrenar?</p>
            <ion-select
              label="Días por semana"
              labelPlacement="floating"
              fill="outline"
              interface="popover"
              [value]="days()"
              (ionChange)="days.set($event.detail.value)"
            >
              @for (o of daysOptions; track o.value) {
                <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
              }
            </ion-select>
            <ion-select
              label="Duración de cada sesión"
              labelPlacement="floating"
              fill="outline"
              interface="popover"
              [value]="minutes()"
              (ionChange)="minutes.set($event.detail.value)"
            >
              @for (o of minutesOptions; track o.value) {
                <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
              }
            </ion-select>

            <p class="section-title">¿Dónde entrenas? (puedes elegir varios)</p>
            <ion-list [inset]="false" lines="full" class="group">
              @for (o of placeOptions; track o.value) {
                <ion-item>
                  <ion-checkbox
                    labelPlacement="end"
                    justify="start"
                    [checked]="places().includes(o.value)"
                    (ionChange)="toggle(places, o.value, $event.detail.checked)"
                    >{{ o.label }}</ion-checkbox
                  >
                </ion-item>
              }
            </ion-list>
          }

          @case (1) {
            <p class="section-title">¿Cuál es tu objetivo principal?</p>
            <ion-list lines="full" class="group">
              <ion-radio-group [value]="goal()" (ionChange)="goal.set($event.detail.value)">
                @for (o of goalOptions; track o.value) {
                  <ion-item>
                    <ion-radio [value]="o.value" labelPlacement="end" justify="start">
                      <div class="opt">
                        {{ o.label }}
                        @if (o.hint) {
                          <small>{{ o.hint }}</small>
                        }
                      </div>
                    </ion-radio>
                  </ion-item>
                }
              </ion-radio-group>
            </ion-list>

            <ion-accordion-group class="optional">
              <ion-accordion value="more">
                <ion-item slot="header"><ion-label>Más opciones (opcional)</ion-label></ion-item>
                <div slot="content">
                  <p class="section-title">¿Tienes otros objetivos? (opcional, puedes elegir varios)</p>
                  <ion-list [inset]="false" lines="full" class="group">
                    @for (o of goalOptions; track o.value) {
                      @if (o.value !== goal()) {
                        <ion-item>
                          <ion-checkbox
                            labelPlacement="end"
                            justify="start"
                            [checked]="secondaryGoals().includes(o.value)"
                            (ionChange)="toggle(secondaryGoals, o.value, $event.detail.checked)"
                            >{{ o.label }}</ion-checkbox
                          >
                        </ion-item>
                      }
                    }
                  </ion-list>

                  <p class="section-title">¿Quieres darle más trabajo a alguna zona? (opcional)</p>
                  <p class="hint">Agregaremos más ejercicios para esas zonas en tu rutina.</p>
                  <ion-list [inset]="false" lines="full" class="group">
                    @for (o of focusOptions; track o.value) {
                      <ion-item>
                        <ion-checkbox
                          labelPlacement="end"
                          justify="start"
                          [checked]="focusAreas().includes(o.value)"
                          (ionChange)="toggle(focusAreas, o.value, $event.detail.checked)"
                          >{{ o.label }}</ion-checkbox
                        >
                      </ion-item>
                    }
                  </ion-list>

                  <p class="section-title">Cuéntanos más sobre tu meta (opcional)</p>
                  <ion-textarea
                    label="Ej: bajar 5 kg para diciembre, correr 5 km, subir mi sentadilla"
                    labelPlacement="floating"
                    fill="outline"
                    [autoGrow]="true"
                    [value]="goalDetail()"
                    (ionInput)="goalDetail.set($event.detail.value ?? '')"
                  ></ion-textarea>
                </div>
              </ion-accordion>
            </ion-accordion-group>
          }

          @case (2) {
            <p class="section-title">¿Qué tipo de entrenamiento te interesa? (puedes elegir varios)</p>
            <p class="hint">Si no sabes por dónde partir, elige "No sé, recomiéndenme".</p>
            <ion-list [inset]="false" lines="full" class="group">
              @for (o of styleOptions; track o.value) {
                <ion-item>
                  <ion-checkbox
                    labelPlacement="end"
                    justify="start"
                    [checked]="styles().includes(o.value)"
                    (ionChange)="toggle(styles, o.value, $event.detail.checked)"
                  >
                    <div class="opt">
                      {{ o.label }}
                      @if (o.hint) {
                        <small>{{ o.hint }}</small>
                      }
                    </div>
                  </ion-checkbox>
                </ion-item>
              }
            </ion-list>
            @if (styles().includes('otro')) {
              <ion-input
                class="ion-margin-top"
                label="¿Cuál? (ej: natación, boxeo)"
                labelPlacement="floating"
                fill="outline"
                [value]="stylesOther()"
                (ionInput)="stylesOther.set($event.detail.value ?? '')"
              ></ion-input>
            }

            <ion-accordion-group class="optional">
              <ion-accordion value="more">
                <ion-item slot="header"><ion-label>Más opciones (opcional)</ion-label></ion-item>
                <div slot="content">
                  <p class="section-title">¿Practicas o te gustaría practicar algún deporte? (opcional)</p>
                  <ion-list [inset]="false" lines="full" class="group">
                    @for (o of sportOptions; track o.value) {
                      <ion-item>
                        <ion-checkbox
                          labelPlacement="end"
                          justify="start"
                          [checked]="sports().includes(o.value)"
                          (ionChange)="toggle(sports, o.value, $event.detail.checked)"
                          >{{ o.label }}</ion-checkbox
                        >
                      </ion-item>
                    }
                  </ion-list>
                </div>
              </ion-accordion>
            </ion-accordion-group>
          }

          @case (3) {
            <p class="section-title">¿Con qué equipamiento cuentas?</p>
            <p class="hint">
              Armamos tu rutina solo con lo que marques. Si no marcas nada, usaremos ejercicios con tu peso corporal.
            </p>

            @for (p of places(); track p) {
              <p class="section-title">{{ placeLabel(p) }}</p>
              @if (p === 'smartfit' && !adjustSmartfit()) {
                <p class="hint">
                  Ya conocemos el equipamiento de Smart Fit (pesas libres, Smith, semi jaula, poleas, máquinas guiadas,
                  hip thrust, prensas y cardio), así que no necesitas marcar nada.
                </p>
                <ion-button fill="clear" size="small" (click)="adjustSmartfit.set(true)"
                  >Mi sede es distinta, ajustar equipo</ion-button
                >
              } @else {
                @if (p === 'otro_gimnasio') {
                  <p class="hint">Marcamos lo habitual en un gimnasio. Ajústalo según el tuyo.</p>
                } @else if (p === 'smartfit') {
                  <p class="hint">Desmarca lo que tu sede no tenga.</p>
                } @else {
                  <p class="hint">Marca lo que tengas disponible aquí.</p>
                }

                @for (grp of gearGroups; track grp.name) {
                  <p class="hint">
                    <strong>{{ grp.name }}</strong>
                  </p>
                  @for (g of grp.items; track g.value) {
                    <ion-item>
                      <ion-checkbox
                        labelPlacement="end"
                        justify="start"
                        [checked]="hasGear(p, g.value)"
                        (ionChange)="toggleGear(p, g.value, $event.detail.checked)"
                        >{{ g.label }}</ion-checkbox
                      >
                    </ion-item>
                  }
                }
              }
            }
          }

          @case (4) {
            <p class="section-title">Tu salud</p>
            <p class="hint">
              Esto sirve para no recomendarte ejercicios que puedan afectarte. Solo tú puedes ver esta información.
            </p>

            <ion-item>
              <ion-toggle [checked]="hasInjuries()" (ionChange)="hasInjuries.set($event.detail.checked)"
                >He tenido cirugías, lesiones o dolores</ion-toggle
              >
            </ion-item>

            @if (hasInjuries()) {
              @if (injuries().length > 0) {
                <ion-list>
                  @for (i of injuries(); track $index) {
                    <ion-item>
                      <ion-label>
                        <h3>{{ areaLabel(i.body_area) }} · {{ kindLabel(i.kind) }}</h3>
                        <p>
                          {{ statusLabel(i.status) }}{{ i.year ? ' · ' + i.year : ''
                          }}{{ i.description ? ' · ' + i.description : '' }}
                        </p>
                      </ion-label>
                      <ion-button fill="clear" color="danger" slot="end" (click)="removeInjury($index)"
                        >Quitar</ion-button
                      >
                    </ion-item>
                  }
                </ion-list>
              }

              <p class="section-title">Agregar</p>
              <ion-select
                label="Zona del cuerpo"
                labelPlacement="floating"
                fill="outline"
                interface="popover"
                [value]="dArea()"
                (ionChange)="dArea.set($event.detail.value)"
              >
                @for (o of areaOptions; track o.value) {
                  <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
                }
              </ion-select>
              <ion-select
                label="Tipo"
                labelPlacement="floating"
                fill="outline"
                interface="popover"
                [value]="dKind()"
                (ionChange)="dKind.set($event.detail.value)"
              >
                @for (o of kindOptions; track o.value) {
                  <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
                }
              </ion-select>
              <ion-select
                label="Estado"
                labelPlacement="floating"
                fill="outline"
                interface="popover"
                [value]="dStatus()"
                (ionChange)="dStatus.set($event.detail.value)"
              >
                @for (o of statusOptions; track o.value) {
                  <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
                }
              </ion-select>
              <ion-input
                label="Año (opcional)"
                labelPlacement="floating"
                fill="outline"
                type="number"
                inputmode="numeric"
                [value]="dYear()"
                (ionInput)="dYear.set($event.detail.value ?? '')"
              ></ion-input>
              <ion-input
                label="Detalle (opcional, ej: menisco)"
                labelPlacement="floating"
                fill="outline"
                [value]="dDesc()"
                (ionInput)="dDesc.set($event.detail.value ?? '')"
              ></ion-input>
              <ion-button expand="block" fill="outline" (click)="addInjury()">Agregar a mi lista</ion-button>
            }

            <ion-item class="ion-margin-top">
              <ion-toggle [checked]="hasMedical()" (ionChange)="hasMedical.set($event.detail.checked)"
                >Tengo una condición médica (diabetes, hipertensión, asma, embarazo, etc.)</ion-toggle
              >
            </ion-item>
            @if (hasMedical()) {
              <ion-textarea
                class="ion-margin-top"
                label="Cuéntanos cuál (opcional)"
                labelPlacement="floating"
                fill="outline"
                [autoGrow]="true"
                [value]="medicalNotes()"
                (ionInput)="medicalNotes.set($event.detail.value ?? '')"
              ></ion-textarea>
            }
          }

          @case (5) {
            <p class="section-title">Tu historial de entrenamiento</p>
            <p class="hint">Esto es lo primero que usamos para decidir con qué carga y volumen partir.</p>

            <p class="section-title">¿Cuándo fue la última vez que entrenaste con regularidad?</p>
            <ion-list lines="full" class="group">
              <ion-radio-group [value]="lastTrained()" (ionChange)="lastTrained.set($event.detail.value)">
                @for (o of lastTrainedOptions; track o.value) {
                  <ion-item>
                    <ion-radio [value]="o.value" labelPlacement="end" justify="start">{{ o.label }}</ion-radio>
                  </ion-item>
                }
              </ion-radio-group>
            </ion-list>

            <p class="section-title">¿Qué has practicado antes? (puedes elegir varios)</p>
            <ion-list [inset]="false" lines="full" class="group">
              @for (o of pastActivityOptions; track o.value) {
                <ion-item>
                  <ion-checkbox
                    labelPlacement="end"
                    justify="start"
                    [checked]="pastActivities().includes(o.value)"
                    (ionChange)="toggle(pastActivities, o.value, $event.detail.checked)"
                    >{{ o.label }}</ion-checkbox
                  >
                </ion-item>
              }
            </ion-list>

            <p class="section-title">¿Qué tan activo/a eres en tu día a día?</p>
            <ion-list lines="full" class="group">
              <ion-radio-group [value]="activityLevel()" (ionChange)="activityLevel.set($event.detail.value)">
                @for (o of activityLevelOptions; track o.value) {
                  <ion-item>
                    <ion-radio [value]="o.value" labelPlacement="end" justify="start">
                      <div class="opt">
                        {{ o.label }}
                        @if (o.hint) {
                          <small>{{ o.hint }}</small>
                        }
                      </div>
                    </ion-radio>
                  </ion-item>
                }
              </ion-radio-group>
            </ion-list>

            <p class="section-title">¿Cuántas horas duermes normalmente?</p>
            <ion-select
              label="Horas de sueño"
              labelPlacement="floating"
              fill="outline"
              interface="popover"
              [value]="sleepHours()"
              (ionChange)="sleepHours.set($event.detail.value)"
            >
              @for (o of sleepOptions; track o.value) {
                <ion-select-option [value]="o.value">{{ o.label }}</ion-select-option>
              }
            </ion-select>

            @if (gender() !== 'masculino') {
              <p class="section-title">¿Estás embarazada o tuviste un bebé hace poco?</p>
              <ion-list lines="full" class="group">
                <ion-radio-group [value]="pregnancy()" (ionChange)="pregnancy.set($event.detail.value)">
                  @for (o of pregnancyOptions; track o.value) {
                    <ion-item>
                      <ion-radio [value]="o.value" labelPlacement="end" justify="start">{{ o.label }}</ion-radio>
                    </ion-item>
                  }
                </ion-radio-group>
              </ion-list>
            }
          }

          @case (6) {
            <p class="section-title">Confirma tus datos</p>
            <ion-list>
              <ion-item>
                <ion-label>
                  <h3>Experiencia</h3>
                  <p>{{ experienceLabel() }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Disponibilidad</h3>
                  <p>{{ days() }} días por semana · {{ minutes() }} min por sesión</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Lugares</h3>
                  <p>{{ placesLabel() }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Objetivo</h3>
                  <p>{{ goalLabel() }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h3>Tipo de entrenamiento</h3>
                  <p>{{ stylesLabel() }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h3>Historial</h3>
                  <p>
                    {{ lastTrainedLabel() }} · Actividad: {{ activityLabel() }} · Sueño:
                    {{ sleepLabel() }}
                  </p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h3>Salud</h3>
                  <p>
                    {{
                      hasInjuries()
                        ? injuries().length + ' registro(s) de lesiones/cirugías'
                        : 'Sin lesiones ni cirugías'
                    }}
                    @if (hasMedical()) {
                      · Con condición médica
                    }
                  </p>
                </ion-label>
              </ion-item>
            </ion-list>

            @if (hasMedical() || hasInjuries()) {
              <ion-note color="warning" class="ion-padding-vertical" style="display: block">
                Como indicaste una lesión o condición médica, consulta a tu médico o kinesiólogo antes de comenzar a
                entrenar.
              </ion-note>
            }

            <p class="hint ion-margin-top">
              Esta app no reemplaza el consejo de un profesional de la salud. Las rutinas son orientativas y debes
              entrenar según tus capacidades.
            </p>

            <ion-item>
              <ion-checkbox
                labelPlacement="end"
                justify="start"
                [checked]="consent()"
                (ionChange)="consent.set($event.detail.checked)"
                >Acepto que se guarden mis datos de salud para armar mi rutina</ion-checkbox
              >
            </ion-item>
          }
        }
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div class="nav">
          @if (step() > 0) {
            <ion-button fill="outline" (click)="back()" [disabled]="busy()">Atrás</ion-button>
          }
          @if (step() < total - 1) {
            <ion-button class="primary" (click)="next()">Siguiente</ion-button>
          } @else {
            <ion-button class="primary" (click)="finish()" [disabled]="busy() || !consent()">
              {{ busy() ? 'Guardando...' : 'Finalizar' }}
            </ion-button>
          }
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: `
    .nav {
      display: flex;
      gap: 12px;
      padding: 8px 16px;
      max-width: 480px;
      margin: 0 auto;
    }
    .nav ion-button {
      margin: 0;
      min-height: 52px;
    }
    .nav ion-button.primary {
      flex: 1;
    }
  `,
})
export class OnboardingPage {
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);

  /** /perfil: el mismo cuestionario con las respuestas guardadas, para editarlas. */
  readonly editMode = !!inject(ActivatedRoute).snapshot.data['edit'];

  constructor() {
    if (this.editMode) {
      // El género decide si se pregunta por embarazo.
      this.profiles
        .load()
        .then(() => this.prefillFromSaved())
        .catch(() => undefined);
      return;
    }
    this.profiles.load().catch(() => undefined);
    // Tesler: la app guarda tu avance solo; si cierras o recargas, sigues donde quedaste.
    this.restoreDraft();
    effect(() => this.saveDraft());
  }

  /** Carga en el formulario lo que la persona ya respondió. */
  private prefillFromSaved() {
    const h = this.profiles.health();
    if (!h) return;
    this.experience.set(h.experience ?? '');
    this.days.set(String(h.days_per_week ?? 3));
    this.minutes.set(String(h.session_minutes ?? 60));
    this.places.set(h.places ?? []);
    this.goal.set(h.goal ?? '');
    this.secondaryGoals.set(h.secondary_goals ?? []);
    this.focusAreas.set(h.focus_areas ?? []);
    this.goalDetail.set(h.goal_detail ?? '');
    this.sports.set(h.sports ?? []);
    this.styles.set(h.training_styles ?? []);
    this.stylesOther.set(h.training_styles_other ?? '');
    this.equipment.set(h.place_equipment ?? {});
    this.hasMedical.set(h.has_medical_condition);
    this.medicalNotes.set(h.medical_notes ?? '');
    this.lastTrained.set(h.last_trained ?? '');
    this.pastActivities.set(h.past_activities ?? []);
    this.activityLevel.set(h.activity_level ?? '');
    this.sleepHours.set(h.sleep_hours ?? '');
    this.pregnancy.set(h.pregnancy_status ?? 'no');
    const injuries = this.profiles.injuries();
    this.hasInjuries.set(injuries.length > 0);
    this.injuries.set(
      injuries.map((i) => ({
        body_area: i.body_area,
        kind: i.kind,
        status: i.status,
        year: i.year,
        description: i.description ?? '',
      })),
    );
    this.consent.set(h.consent_health_data);
  }

  private draftKey = 'avanza.onboarding.draft';

  private draftState() {
    return {
      step: this.step(),
      experience: this.experience(),
      days: this.days(),
      minutes: this.minutes(),
      places: this.places(),
      goal: this.goal(),
      secondaryGoals: this.secondaryGoals(),
      focusAreas: this.focusAreas(),
      goalDetail: this.goalDetail(),
      sports: this.sports(),
      styles: this.styles(),
      stylesOther: this.stylesOther(),
      equipment: this.equipment(),
      hasInjuries: this.hasInjuries(),
      injuries: this.injuries(),
      hasMedical: this.hasMedical(),
      medicalNotes: this.medicalNotes(),
      lastTrained: this.lastTrained(),
      pastActivities: this.pastActivities(),
      activityLevel: this.activityLevel(),
      sleepHours: this.sleepHours(),
      pregnancy: this.pregnancy(),
    };
  }

  private saveDraft() {
    const state = this.draftState();
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(state));
    } catch {
      // Sin almacenamiento disponible: la app funciona igual, solo no recuerda el avance.
    }
  }

  private restoreDraft() {
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<ReturnType<OnboardingPage['draftState']>>;
      if (d.experience) this.experience.set(d.experience);
      if (d.days) this.days.set(d.days);
      if (d.minutes) this.minutes.set(d.minutes);
      if (d.places) this.places.set(d.places);
      if (d.goal) this.goal.set(d.goal);
      if (d.secondaryGoals) this.secondaryGoals.set(d.secondaryGoals);
      if (d.focusAreas) this.focusAreas.set(d.focusAreas);
      if (d.goalDetail) this.goalDetail.set(d.goalDetail);
      if (d.sports) this.sports.set(d.sports);
      if (d.styles) this.styles.set(d.styles);
      if (d.stylesOther) this.stylesOther.set(d.stylesOther);
      if (d.equipment) this.equipment.set(d.equipment);
      if (d.hasInjuries) this.hasInjuries.set(d.hasInjuries);
      if (d.injuries) this.injuries.set(d.injuries);
      if (d.hasMedical) this.hasMedical.set(d.hasMedical);
      if (d.medicalNotes) this.medicalNotes.set(d.medicalNotes);
      if (d.lastTrained) this.lastTrained.set(d.lastTrained);
      if (d.pastActivities) this.pastActivities.set(d.pastActivities);
      if (d.activityLevel) this.activityLevel.set(d.activityLevel);
      if (d.sleepHours) this.sleepHours.set(d.sleepHours);
      if (d.pregnancy) this.pregnancy.set(d.pregnancy);
      if (typeof d.step === 'number') this.step.set(Math.min(d.step, TOTAL_STEPS - 1));
    } catch {
      // Borrador dañado: se ignora y se parte de cero.
    }
  }

  readonly total = TOTAL_STEPS;
  readonly experienceOptions = EXPERIENCE_OPTIONS;
  readonly daysOptions = DAYS_OPTIONS;
  readonly minutesOptions = MINUTES_OPTIONS;
  readonly placeOptions = PLACE_OPTIONS;
  readonly goalOptions = GOAL_OPTIONS;
  readonly focusOptions = FOCUS_OPTIONS;
  readonly sportOptions = SPORT_OPTIONS;
  readonly styleOptions = STYLE_OPTIONS;
  readonly gearGroups = GEAR_GROUPS;
  readonly areaOptions = BODY_AREA_OPTIONS;
  readonly kindOptions = INJURY_KIND_OPTIONS;
  readonly statusOptions = INJURY_STATUS_OPTIONS;
  readonly lastTrainedOptions = LAST_TRAINED_OPTIONS;
  readonly pastActivityOptions = PAST_ACTIVITY_OPTIONS;
  readonly activityLevelOptions = ACTIVITY_LEVEL_OPTIONS;
  readonly sleepOptions = SLEEP_OPTIONS;
  readonly pregnancyOptions = PREGNANCY_OPTIONS;

  readonly step = signal(0);
  readonly adjustSmartfit = signal(false);
  readonly busy = signal(false);

  readonly experience = signal('');
  readonly days = signal('3');
  readonly minutes = signal('60');
  readonly places = signal<string[]>([]);
  readonly goal = signal('');
  readonly secondaryGoals = signal<string[]>([]);
  readonly focusAreas = signal<string[]>([]);
  readonly goalDetail = signal('');
  readonly sports = signal<string[]>([]);
  readonly styles = signal<string[]>([]);
  readonly stylesOther = signal('');
  /** Equipo disponible por lugar, ej: { smartfit: ['barra', ...], casa: [] } */
  readonly equipment = signal<Record<string, string[]>>({});

  readonly hasInjuries = signal(false);
  readonly injuries = signal<InjuryDraft[]>([]);
  readonly dArea = signal('');
  readonly dKind = signal('lesion');
  readonly dStatus = signal('activa');
  readonly dYear = signal('');
  readonly dDesc = signal('');

  readonly lastTrained = signal('');
  readonly pastActivities = signal<string[]>([]);
  readonly activityLevel = signal('');
  readonly sleepHours = signal('');
  readonly pregnancy = signal('no');
  readonly gender = computed(() => this.profiles.profile()?.gender ?? null);

  readonly hasMedical = signal(false);
  readonly medicalNotes = signal('');
  readonly consent = signal(false);

  readonly experienceLabel = computed(() => labelOf(EXPERIENCE_OPTIONS, this.experience()));
  readonly lastTrainedLabel = computed(() => labelOf(LAST_TRAINED_OPTIONS, this.lastTrained()));
  readonly activityLabel = computed(() => labelOf(ACTIVITY_LEVEL_OPTIONS, this.activityLevel()).toLowerCase());
  readonly sleepLabel = computed(() => labelOf(SLEEP_OPTIONS, this.sleepHours()).toLowerCase());
  readonly goalLabel = computed(() => {
    const extra = this.secondaryGoals().filter((g) => g !== this.goal());
    const focus = this.focusAreas();
    return (
      labelOf(GOAL_OPTIONS, this.goal()) +
      (extra.length ? ` (también: ${extra.map((g) => labelOf(GOAL_OPTIONS, g)).join(', ')})` : '') +
      (focus.length ? ` · Más trabajo en: ${focus.map((f) => labelOf(FOCUS_OPTIONS, f)).join(', ')}` : '')
    );
  });
  readonly stylesLabel = computed(() =>
    this.styles()
      .map((s) =>
        s === 'otro' && this.stylesOther().trim() ? `Otro (${this.stylesOther().trim()})` : labelOf(STYLE_OPTIONS, s),
      )
      .join(', '),
  );
  readonly placesLabel = computed(() =>
    this.places()
      .map((p) => `${labelOf(PLACE_OPTIONS, p)} (${this.equipment()[p]?.length ?? 0} equipos)`)
      .join(', '),
  );

  areaLabel = (v: string) => labelOf(BODY_AREA_OPTIONS, v);
  kindLabel = (v: string) => labelOf(INJURY_KIND_OPTIONS, v);
  statusLabel = (v: string) => labelOf(INJURY_STATUS_OPTIONS, v);

  placeLabel = (v: string) => labelOf(PLACE_OPTIONS, v);

  hasGear(place: string, code: string): boolean {
    return this.equipment()[place]?.includes(code) ?? false;
  }

  toggleGear(place: string, code: string, checked: boolean) {
    this.equipment.update((cur) => {
      const list = cur[place] ?? [];
      const next = checked ? (list.includes(code) ? list : [...list, code]) : list.filter((x) => x !== code);
      return { ...cur, [place]: next };
    });
  }

  /** Crea la lista de equipo de cada lugar elegido (con lo habitual marcado) y quita los lugares descartados. */
  private initEquipment() {
    this.equipment.update((cur) => {
      const next: Record<string, string[]> = {};
      for (const p of this.places()) next[p] = cur[p] ?? [...(PLACE_PRESETS[p] ?? [])];
      return next;
    });
  }

  toggle(list: WritableSignal<string[]>, value: string, checked: boolean) {
    list.update((cur) => (checked ? (cur.includes(value) ? cur : [...cur, value]) : cur.filter((x) => x !== value)));
  }

  async addInjury() {
    if (!this.dArea() || !this.dKind()) {
      await this.toast('Elige la zona del cuerpo y el tipo.');
      return;
    }
    let year: number | null = null;
    if (this.dYear().trim() !== '') {
      year = Number(this.dYear());
      const max = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1950 || year > max) {
        await this.toast(`El año debe estar entre 1950 y ${max}.`);
        return;
      }
    }
    this.injuries.update((cur) => [
      ...cur,
      {
        body_area: this.dArea(),
        kind: this.dKind(),
        status: this.dStatus(),
        year,
        description: this.dDesc(),
      },
    ]);
    this.dArea.set('');
    this.dYear.set('');
    this.dDesc.set('');
  }

  removeInjury(index: number) {
    this.injuries.update((cur) => cur.filter((_, i) => i !== index));
  }

  back() {
    this.step.update((s) => Math.max(0, s - 1));
  }

  async next() {
    const problem = this.validateStep(this.step());
    if (problem) {
      await this.toast(problem);
      return;
    }
    if (this.step() === 2) this.initEquipment();
    this.step.update((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  private validateStep(step: number): string | null {
    if (step === 0) {
      if (!this.experience()) return 'Elige tu nivel de experiencia.';
      if (this.places().length === 0) return 'Elige al menos un lugar donde entrenas.';
    }
    if (step === 1 && !this.goal()) return 'Elige tu objetivo principal.';
    if (step === 2 && this.styles().length === 0) return 'Elige al menos un tipo de entrenamiento.';
    if (step === 5) {
      if (!this.lastTrained()) return 'Cuéntanos cuándo entrenaste por última vez.';
      if (!this.activityLevel()) return 'Elige qué tan activo/a eres en tu día a día.';
      if (!this.sleepHours()) return 'Indica cuántas horas duermes.';
    }
    if (step === 4 && this.hasInjuries() && this.injuries().length === 0) {
      return 'Agrega al menos una lesión o cirugía, o desactiva esa opción.';
    }
    return null;
  }

  async finish() {
    if (!this.consent() || this.busy()) return;
    for (let s = 0; s < TOTAL_STEPS - 1; s++) {
      const problem = this.validateStep(s);
      if (problem) {
        this.step.set(s);
        await this.toast(problem);
        return;
      }
    }
    this.initEquipment();
    this.busy.set(true);
    try {
      const health: HealthInput = {
        experience: this.experience(),
        days_per_week: Number(this.days()),
        session_minutes: Number(this.minutes()),
        places: this.places(),
        goal: this.goal(),
        secondary_goals: this.secondaryGoals().filter((g) => g !== this.goal()),
        focus_areas: this.focusAreas(),
        goal_detail: this.goalDetail().trim() || null,
        sports: this.sports(),
        place_equipment: this.equipment(),
        last_trained: this.lastTrained(),
        past_activities: this.pastActivities(),
        activity_level: this.activityLevel(),
        sleep_hours: this.sleepHours(),
        pregnancy_status: this.gender() === 'masculino' ? 'no' : this.pregnancy(),
        training_styles: this.styles(),
        training_styles_other: this.styles().includes('otro') ? this.stylesOther().trim() || null : null,
        has_medical_condition: this.hasMedical(),
        medical_notes: this.hasMedical() ? this.medicalNotes().trim() || null : null,
        consent_health_data: true,
      };
      await this.profiles.saveOnboarding(health, this.hasInjuries() ? this.injuries() : []);
      try {
        localStorage.removeItem(this.draftKey);
      } catch {
        // nada que limpiar
      }
      // Tesler: en vez de pedir otro paso, vamos directo a la rutina, que se genera sola.
      await this.router.navigateByUrl(this.editMode ? '/rutina?actualizado=1' : '/rutina', {
        replaceUrl: true,
      });
    } catch (e) {
      console.error('Error al guardar el cuestionario:', e);
      await this.toast('No se pudo guardar. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3500, position: 'top' });
    await t.present();
  }
}
