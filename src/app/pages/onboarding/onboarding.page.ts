import { Component, computed, inject, signal, type WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
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
  DAYS_OPTIONS,
  EXPERIENCE_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  INJURY_KIND_OPTIONS,
  INJURY_STATUS_OPTIONS,
  MINUTES_OPTIONS,
  PLACE_OPTIONS,
  SPORT_OPTIONS,
  STYLE_OPTIONS,
  labelOf,
  type HealthInput,
  type InjuryDraft,
} from '../../core/models';
import { ProfileService } from '../../core/profile.service';

const TOTAL_STEPS = 6;

@Component({
  selector: 'app-onboarding',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonProgressBar,
    IonList,
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
        <ion-title>Cuéntanos de ti</ion-title>
      </ion-toolbar>
      <ion-progress-bar [value]="(step() + 1) / total"></ion-progress-bar>
    </ion-header>

    <ion-content>
      <div class="page">
        <p class="hint">Paso {{ step() + 1 }} de {{ total }}</p>

        @switch (step()) {
          @case (0) {
            <p class="section-title">¿Cuánta experiencia tienes entrenando?</p>
            <ion-radio-group
              [value]="experience()"
              (ionChange)="experience.set($event.detail.value)"
            >
              @for (o of experienceOptions; track o.value) {
                <ion-item>
                  <ion-radio [value]="o.value" labelPlacement="end" justify="start">{{
                    o.label
                  }}</ion-radio>
                </ion-item>
              }
            </ion-radio-group>

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
          }

          @case (1) {
            <p class="section-title">¿Cuál es tu objetivo principal?</p>
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

            <p class="section-title">¿Tienes otros objetivos? (opcional, puedes elegir varios)</p>
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

            <p class="section-title">¿Quieres darle más trabajo a alguna zona? (opcional)</p>
            <p class="hint">Agregaremos más ejercicios para esas zonas en tu rutina.</p>
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

            <p class="section-title">Cuéntanos más sobre tu meta (opcional)</p>
            <ion-textarea
              label="Ej: bajar 5 kg para diciembre, correr 5 km, subir mi sentadilla"
              labelPlacement="floating"
              fill="outline"
              [autoGrow]="true"
              [value]="goalDetail()"
              (ionInput)="goalDetail.set($event.detail.value ?? '')"
            ></ion-textarea>

          }

          @case (2) {
            <p class="section-title">¿Qué tipo de entrenamiento te interesa? (puedes elegir varios)</p>
            <p class="hint">Si no sabes por dónde partir, elige "No sé, recomiéndenme".</p>
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

            <p class="section-title">¿Practicas o te gustaría practicar algún deporte? (opcional)</p>
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
          }

          @case (3) {
            <p class="section-title">¿Con qué equipamiento cuentas?</p>
            <p class="hint">
              Armamos tu rutina solo con lo que marques. Si no marcas nada, usaremos ejercicios
              con tu peso corporal.
            </p>

            @for (p of places(); track p) {
              <p class="section-title">{{ placeLabel(p) }}</p>
              @if (p === 'smartfit') {
                <p class="hint">
                  Dejamos marcado lo que Smart Fit informa en sus sedes: pesas libres, máquinas
                  guiadas, poleas, Smith y cardio. El equipamiento varía según la sede, así que
                  desmarca lo que tu sede no tenga.
                </p>
              } @else if (p === 'otro_gimnasio') {
                <p class="hint">Marcamos lo habitual en un gimnasio. Ajústalo según el tuyo.</p>
              } @else {
                <p class="hint">Marca lo que tengas disponible aquí.</p>
              }

              @for (grp of gearGroups; track grp.name) {
                <p class="hint"><strong>{{ grp.name }}</strong></p>
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

          @case (4) {
            <p class="section-title">Tu salud</p>
            <p class="hint">
              Esto sirve para no recomendarte ejercicios que puedan afectarte. Solo tú puedes ver
              esta información.
            </p>

            <ion-item>
              <ion-toggle
                [checked]="hasInjuries()"
                (ionChange)="hasInjuries.set($event.detail.checked)"
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
              <ion-button expand="block" fill="outline" (click)="addInjury()"
                >Agregar a mi lista</ion-button
              >
            }

            <ion-item class="ion-margin-top">
              <ion-toggle
                [checked]="hasMedical()"
                (ionChange)="hasMedical.set($event.detail.checked)"
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
                <ion-label>
                  <h3>Salud</h3>
                  <p>
                    {{ hasInjuries() ? injuries().length + ' registro(s) de lesiones/cirugías' : 'Sin lesiones ni cirugías' }}
                    @if (hasMedical()) {
                      · Con condición médica
                    }
                  </p>
                </ion-label>
              </ion-item>
            </ion-list>

            @if (hasMedical() || hasInjuries()) {
              <ion-note color="warning" class="ion-padding-vertical" style="display: block">
                Como indicaste una lesión o condición médica, consulta a tu médico o
                kinesiólogo antes de comenzar a entrenar.
              </ion-note>
            }

            <p class="hint ion-margin-top">
              Esta app no reemplaza el consejo de un profesional de la salud. Las rutinas son
              orientativas y debes entrenar según tus capacidades.
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

        <div class="nav">
          @if (step() > 0) {
            <ion-button fill="outline" (click)="back()" [disabled]="busy()">Atrás</ion-button>
          }
          @if (step() < total - 1) {
            <ion-button (click)="next()">Siguiente</ion-button>
          } @else {
            <ion-button (click)="finish()" [disabled]="busy() || !consent()">
              {{ busy() ? 'Guardando...' : 'Finalizar' }}
            </ion-button>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .nav {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 24px;
    }
    .nav ion-button:only-child {
      margin-left: auto;
    }
  `,
})
export class OnboardingPage {
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);

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

  readonly step = signal(0);
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

  readonly hasMedical = signal(false);
  readonly medicalNotes = signal('');
  readonly consent = signal(false);

  readonly experienceLabel = computed(() => labelOf(EXPERIENCE_OPTIONS, this.experience()));
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
        s === 'otro' && this.stylesOther().trim()
          ? `Otro (${this.stylesOther().trim()})`
          : labelOf(STYLE_OPTIONS, s),
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
    list.update((cur) =>
      checked ? (cur.includes(value) ? cur : [...cur, value]) : cur.filter((x) => x !== value),
    );
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
        training_styles: this.styles(),
        training_styles_other: this.styles().includes('otro')
          ? this.stylesOther().trim() || null
          : null,
        has_medical_condition: this.hasMedical(),
        medical_notes: this.hasMedical() ? this.medicalNotes().trim() || null : null,
        consent_health_data: true,
      };
      await this.profiles.saveOnboarding(health, this.hasInjuries() ? this.injuries() : []);
      await this.router.navigateByUrl('/home', { replaceUrl: true });
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
