import { Component, effect, input, output, signal } from '@angular/core';
import { IonButton, IonContent, IonInput, IonModal, IonSelect, IonSelectOption } from '@ionic/angular';

import {
  DEFAULT_LOAD_SETTINGS,
  LOAD_KIND_OPTIONS,
  LOAD_UNIT_OPTIONS,
  parseLoad,
  type LoadKind,
  type LoadSettings,
  type LoadUnit,
} from '../core/progression/load-units';

/**
 * Configuración de la carga de un ejercicio para ESTA persona: unidad (kg, lb, niveles, placas u
 * otra), tipo de carga, salto mínimo, rango de la máquina y carga inicial. Todo es opcional: lo que
 * se deja vacío queda sin definir y la app no lo inventa.
 */
@Component({
  selector: 'app-load-settings-modal',
  imports: [IonModal, IonContent, IonButton, IonInput, IonSelect, IonSelectOption],
  template: `
    <ion-modal [isOpen]="open()" (didDismiss)="closed.emit()" [initialBreakpoint]="0.95" [breakpoints]="[0, 0.95]">
      <ng-template>
        <ion-content class="ion-padding">
          <h2>Carga de {{ exerciseName() }}</h2>
          <p class="hint">
            Solo para ti: cada persona configura sus máquinas. Deja en blanco lo que no sepas; no se rellena solo.
          </p>

          <ion-select
            label="Unidad"
            labelPlacement="stacked"
            fill="outline"
            interface="action-sheet"
            [value]="unit()"
            (ionChange)="unit.set($event.detail.value)"
          >
            @for (u of unitOptions; track u.value) {
              <ion-select-option [value]="u.value">{{ u.label }}</ion-select-option>
            }
          </ion-select>
          @if (unit() === 'nivel' || unit() === 'placas') {
            <p class="hint">Los niveles y las placas se guardan tal cual: no se convierten a kilos.</p>
          }
          @if (unit() === 'otro') {
            <ion-input
              label="Nombre de la unidad"
              labelPlacement="stacked"
              fill="outline"
              placeholder="Ej: muescas"
              [maxlength]="20"
              [value]="unitLabel()"
              (ionInput)="unitLabel.set($event.detail.value ?? '')"
            ></ion-input>
          }

          <ion-select
            label="Qué se registra"
            labelPlacement="stacked"
            fill="outline"
            interface="action-sheet"
            [value]="kind()"
            (ionChange)="kind.set($event.detail.value)"
          >
            @for (k of kindOptions; track k.value) {
              <ion-select-option [value]="k.value">{{ k.label }}</ion-select-option>
            }
          </ion-select>
          <p class="hint">{{ kindHint() }}</p>

          <ion-input
            label="Salto mínimo disponible"
            labelPlacement="stacked"
            fill="outline"
            inputmode="decimal"
            placeholder="Ej: 2,5 · 1 · 5"
            [value]="increment()"
            (ionInput)="increment.set($event.detail.value ?? '')"
          ></ion-input>
          <div class="pair">
            <ion-input
              label="Mínimo de la máquina"
              labelPlacement="stacked"
              fill="outline"
              inputmode="decimal"
              placeholder="Ej: 1"
              [value]="scaleMin()"
              (ionInput)="scaleMin.set($event.detail.value ?? '')"
            ></ion-input>
            <ion-input
              label="Máximo de la máquina"
              labelPlacement="stacked"
              fill="outline"
              inputmode="decimal"
              placeholder="Ej: 8"
              [value]="scaleMax()"
              (ionInput)="scaleMax.set($event.detail.value ?? '')"
            ></ion-input>
          </div>
          <ion-input
            label="Carga inicial"
            labelPlacement="stacked"
            fill="outline"
            inputmode="decimal"
            placeholder="Sin definir"
            [value]="startLoad()"
            (ionInput)="startLoad.set($event.detail.value ?? '')"
          ></ion-input>
          <ion-input
            label="Nombre o número de la máquina (opcional)"
            labelPlacement="stacked"
            fill="outline"
            [maxlength]="60"
            [value]="machine()"
            (ionInput)="machine.set($event.detail.value ?? '')"
          ></ion-input>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <ion-button expand="block" (click)="submit()">Guardar</ion-button>
          <ion-button expand="block" fill="clear" (click)="closed.emit()">Cancelar</ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    ion-select,
    ion-input {
      margin-top: 12px;
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .hint {
      font-size: 0.85rem;
      color: var(--ion-color-medium-shade);
      margin: 6px 0 0;
    }
    .error {
      color: var(--ion-color-danger);
    }
    ion-button {
      margin-top: 14px;
    }
  `,
})
export class LoadSettingsModalComponent {
  readonly open = input.required<boolean>();
  readonly exerciseName = input('');
  readonly settings = input<LoadSettings>(DEFAULT_LOAD_SETTINGS);
  readonly saved = output<LoadSettings>();
  readonly closed = output<void>();

  readonly unitOptions = LOAD_UNIT_OPTIONS;
  readonly kindOptions = LOAD_KIND_OPTIONS;

  readonly unit = signal<LoadUnit>('kg');
  readonly unitLabel = signal('');
  readonly kind = signal<LoadKind>('total');
  readonly increment = signal<string | number>('');
  readonly scaleMin = signal<string | number>('');
  readonly scaleMax = signal<string | number>('');
  readonly startLoad = signal<string | number>('');
  readonly machine = signal('');
  readonly error = signal('');

  constructor() {
    // Cada vez que se abre, parte de la configuración vigente.
    effect(() => {
      if (!this.open()) return;
      const s = this.settings();
      const txt = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
      this.unit.set(s.unit);
      this.unitLabel.set(s.unitLabel ?? '');
      this.kind.set(s.kind);
      this.increment.set(txt(s.minIncrement));
      this.scaleMin.set(txt(s.scaleMin));
      this.scaleMax.set(txt(s.scaleMax));
      this.startLoad.set(txt(s.startLoad));
      this.machine.set(s.machineName ?? '');
      this.error.set('');
    });
  }

  kindHint(): string {
    return this.kindOptions.find((k) => k.value === this.kind())?.hint ?? '';
  }

  submit() {
    const read = (v: string | number, name: string): number | null | undefined => {
      if (v === '' || v === null) return null;
      const n = parseLoad(v);
      if (n === null) {
        this.error.set(`"${name}" debe ser un número (puedes usar decimales).`);
        return undefined;
      }
      return n;
    };
    const inc = read(this.increment(), 'Salto mínimo');
    const min = read(this.scaleMin(), 'Mínimo de la máquina');
    const max = read(this.scaleMax(), 'Máximo de la máquina');
    const start = read(this.startLoad(), 'Carga inicial');
    if (inc === undefined || min === undefined || max === undefined || start === undefined) return;
    if (inc !== null && (inc <= 0 || inc > 100)) return this.error.set('El salto mínimo debe ser mayor que 0.');
    if (min !== null && max !== null && max <= min) return this.error.set('El máximo debe ser mayor que el mínimo.');
    if (this.unit() === 'otro' && !this.unitLabel().trim()) return this.error.set('Escribe el nombre de la unidad.');
    this.saved.emit({
      unit: this.unit(),
      unitLabel: this.unit() === 'otro' ? this.unitLabel().trim() : null,
      kind: this.kind(),
      minIncrement: inc,
      scaleMin: min,
      scaleMax: max,
      startLoad: start,
      machineName: this.machine().trim() || null,
    });
  }
}
