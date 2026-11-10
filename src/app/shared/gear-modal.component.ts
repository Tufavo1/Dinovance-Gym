import { Component, Input, computed, inject, signal, type OnInit } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, homeOutline } from 'ionicons/icons';

import { EXTRA_GEAR, GEAR_GROUPS, PLACE_PRESETS, gearCounts, requiredGear } from '../core/equipment';
import { ExerciseService } from '../core/exercise.service';
import { PLACE_OPTIONS } from '../core/models';
import { ProfileService } from '../core/profile.service';

/**
 * Pregunta, antes de crear o generar una rutina, qué máquinas y accesorios hay a mano.
 * Lo marcado se guarda en el perfil para ese lugar y el generador solo usa ese equipo.
 */
@Component({
  selector: 'app-gear-modal',
  imports: [
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Tu equipo</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Cancelar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h2 class="q">¿Qué tienes a mano hoy en {{ placeName }}?</h2>
      <p class="sub">Marca lo que puedes usar. La rutina solo tendrá ejercicios para eso.</p>
      <div class="quick">
        <ion-button size="small" fill="outline" (click)="setAll(true)">
          <ion-icon slot="start" name="barbell-outline"></ion-icon>Marcar todo
        </ion-button>
        <ion-button size="small" fill="outline" (click)="setAll(false)">
          <ion-icon slot="start" name="home-outline"></ion-icon>Solo mi cuerpo
        </ion-button>
        <ion-button size="small" fill="clear" (click)="reset()">Lo habitual</ion-button>
      </div>
      @for (grp of groups(); track grp.name) {
        <p class="grp">{{ grp.name }}</p>
        @for (g of grp.items; track g.value) {
          <ion-item lines="full">
            <ion-checkbox
              labelPlacement="end"
              justify="start"
              [checked]="sel().includes(g.value)"
              (ionChange)="toggle(g.value, $event.detail.checked)"
              >{{ g.label }}
              @if (counts().get(g.value); as n) {
                <span class="n">· {{ n }} {{ n === 1 ? 'ejercicio' : 'ejercicios' }}</span>
              }
            </ion-checkbox>
          </ion-item>
        }
      }
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <div class="actions">
          <p class="count">{{ sel().length }} de {{ total() }} implementos · {{ unlocked() }} ejercicios disponibles</p>
          <ion-button color="primary" expand="block" size="large" [disabled]="saving()" (click)="confirm()">
            @if (saving()) {
              <ion-spinner name="dots"></ion-spinner>
            } @else {
              Continuar
            }
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: `
    .q {
      margin: 4px 0 6px;
      font-size: 1.2rem;
    }
    .sub {
      margin: 0 0 12px;
      color: var(--ion-color-medium);
    }
    .quick {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .grp {
      margin: 16px 0 4px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ion-color-medium);
    }
    .n {
      color: var(--ion-color-medium);
      font-size: 0.8rem;
    }
    .actions {
      padding: 8px 16px;
    }
    .count {
      margin: 0 0 6px;
      text-align: center;
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }
  `,
})
export class GearModalComponent implements OnInit {
  // Ionic asigna las propiedades del modal directamente, por eso no es un input con signal.
  @Input() place = '';

  private readonly profiles = inject(ProfileService);
  private readonly ctrl = inject(ModalController);

  private readonly catalog = inject(ExerciseService);

  /** Cuántos ejercicios del dataset desbloquea cada implemento. */
  readonly counts = computed(() => gearCounts(this.catalog.exercises()));
  /** Lo básico más los implementos extra, pero solo los que el dataset cargado realmente usa. */
  readonly groups = computed(() => {
    const c = this.counts();
    const extra = EXTRA_GEAR.filter((g) => (c.get(g.value) ?? 0) > 0);
    return extra.length > 0 ? [...GEAR_GROUPS, { name: 'Más implementos', items: extra }] : GEAR_GROUPS;
  });
  readonly allCodes = computed(() => this.groups().flatMap((g) => g.items.map((i) => i.value)));
  readonly total = computed(() => this.allCodes().length);
  readonly unlocked = computed(() => {
    const have = new Set(this.sel());
    return this.catalog.exercises().filter((e) => {
      const need = requiredGear(e);
      return need !== null && need.every((n) => have.has(n));
    }).length;
  });
  readonly sel = signal<string[]>([]);
  readonly saving = signal(false);
  get placeName(): string {
    return PLACE_OPTIONS.find((p) => p.value === this.place)?.label ?? 'este lugar';
  }

  constructor() {
    addIcons({ barbellOutline, homeOutline });
  }

  async ngOnInit() {
    await this.catalog.ensureLoaded().catch(() => undefined);
    const saved = this.profiles.health()?.place_equipment?.[this.place];
    this.sel.set([...(saved ?? PLACE_PRESETS[this.place] ?? [])]);
  }

  toggle(code: string, on: boolean) {
    this.sel.update((c) => (on ? (c.includes(code) ? c : [...c, code]) : c.filter((x) => x !== code)));
  }

  setAll(on: boolean) {
    this.sel.set(on ? this.allCodes() : []);
  }

  reset() {
    this.sel.set([...(PLACE_PRESETS[this.place] ?? [])]);
  }

  close() {
    return this.ctrl.dismiss(null, 'cancel');
  }

  async confirm() {
    this.saving.set(true);
    try {
      await this.profiles.saveEquipment(this.place, this.sel());
    } catch {
      // Si no se puede guardar, igual se usa para esta rutina.
    }
    await this.ctrl.dismiss(this.sel(), 'confirm');
  }
}

/** Abre la pregunta de equipo. Devuelve true si la persona confirmó. */
export async function askGear(modal: ModalController, place: string): Promise<boolean> {
  const m = await modal.create({
    component: GearModalComponent,
    componentProps: { place },
    backdropDismiss: false,
  });
  await m.present();
  return (await m.onDidDismiss()).role === 'confirm';
}
