import { Component, computed, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, remove, settingsOutline } from 'ionicons/icons';

import { fitsScale, parseLoad, unitSuffix, type LoadSettings } from '../core/progression/load-units';

/**
 * Campo de carga libre: la persona escribe cualquier valor (con decimales) en la unidad de su
 * máquina. Los botones + y − son solo un atajo con el salto configurado; nunca limitan lo que se
 * puede escribir. Vacío significa "sin carga registrada".
 */
@Component({
  selector: 'app-load-input',
  imports: [IonButton, IonIcon],
  template: `
    <div class="head">
      <span class="label">{{ label() }}</span>
      <button type="button" class="config" (click)="configure.emit()">
        <ion-icon name="settings-outline" aria-hidden="true"></ion-icon> Unidad y saltos
      </button>
    </div>
    <div class="row">
      <ion-button fill="outline" [disabled]="step() === null" (click)="bump(-1)" aria-label="Menos carga">
        <ion-icon slot="icon-only" name="remove"></ion-icon>
      </ion-button>
      <label class="field">
        @if (prefix(); as p) {
          <span class="unit">{{ p }}</span>
        }
        <input
          type="text"
          inputmode="decimal"
          autocomplete="off"
          [attr.aria-label]="label()"
          [value]="text()"
          placeholder="–"
          (input)="typed($any($event.target).value)"
        />
        @if (suffix(); as s) {
          <span class="unit">{{ s }}</span>
        }
      </label>
      <ion-button fill="outline" [disabled]="step() === null" (click)="bump(1)" aria-label="Más carga">
        <ion-icon slot="icon-only" name="add"></ion-icon>
      </ion-button>
    </div>
    @if (warning(); as w) {
      <p class="warn">{{ w }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .label {
      font-weight: 600;
    }
    .config {
      background: transparent;
      border: 0;
      color: var(--ion-color-primary);
      font-size: 0.85rem;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .field {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 6px;
      min-width: 150px;
      padding: 6px 10px;
      border: 2px solid var(--ion-color-medium);
      border-radius: 12px;
      background: var(--ion-background-color, #fff);
    }
    .field:focus-within {
      border-color: var(--ion-color-primary);
    }
    input {
      width: 5ch;
      border: 0;
      outline: 0;
      background: transparent;
      color: inherit;
      font-size: 1.9rem;
      font-weight: 700;
      text-align: center;
    }
    .unit {
      font-size: 0.95rem;
      color: var(--ion-color-medium-shade);
    }
    .warn {
      margin: 6px 0 0;
      font-size: 0.85rem;
      text-align: center;
      color: var(--ion-color-warning-shade);
    }
  `,
})
export class LoadInputComponent {
  readonly value = input.required<number | null>();
  readonly settings = input.required<LoadSettings>();
  /** Salto de los botones. Null = sin salto definido. */
  readonly step = input<number | null>(null);
  readonly valueChange = output<number | null>();
  readonly configure = output<void>();

  constructor() {
    addIcons({ add, remove, settingsOutline });
  }

  readonly label = computed(() => {
    const s = this.settings();
    switch (s.kind) {
      case 'por_lado':
        return 'Carga por lado';
      case 'lastre':
        return 'Peso añadido (lastre)';
      case 'asistido':
        return 'Asistencia de la máquina';
      default:
        return s.unit === 'nivel' ? 'Nivel de la máquina' : s.unit === 'placas' ? 'Placa' : 'Carga';
    }
  });

  /** "Nivel 5" y "Placa 7" llevan la unidad delante; el resto, detrás. */
  readonly prefix = computed(() => {
    const u = this.settings().unit;
    return u === 'nivel' ? 'Nivel' : u === 'placas' ? 'Placa' : null;
  });
  readonly suffix = computed(() => {
    const s = this.settings();
    return s.unit === 'nivel' || s.unit === 'placas' ? null : unitSuffix(s.unit, s.unitLabel);
  });

  readonly text = computed(() => {
    const v = this.value();
    return v === null ? '' : String(v).replace('.', ',');
  });

  readonly warning = computed(() => {
    const v = this.value();
    const s = this.settings();
    if (v === null || fitsScale(v, s)) return null;
    return `Fuera del rango configurado (${s.scaleMin ?? '–'} a ${s.scaleMax ?? '–'}). Se guardará igual: tú decides.`;
  });

  typed(raw: string) {
    // Vacío o texto no numérico = sin carga. Nunca se ajusta a una lista de valores.
    this.valueChange.emit(parseLoad(raw));
  }

  bump(dir: 1 | -1) {
    const step = this.step();
    if (step === null) return;
    const s = this.settings();
    const current = this.value() ?? (dir === 1 ? (s.scaleMin ?? 0) - step : 0);
    const next = Math.max(s.scaleMin ?? 0, Math.round((current + dir * step) * 100) / 100);
    this.valueChange.emit(s.scaleMax !== null ? Math.min(s.scaleMax, next) : next);
  }
}
