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
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
  type ViewDidEnter,
} from '@ionic/angular';

import { DataService, type AuditEntry, type ImportResult } from '../../core/data.service';
import { ExerciseService } from '../../core/exercise.service';
import { ProfileService } from '../../core/profile.service';
import { ProgressionService } from '../../core/progression.service';
import {
  DEFAULT_LOAD_SETTINGS,
  formatLoad,
  parseLoad,
  unitSuffix,
  type LoadSettings,
} from '../../core/progression/load-units';
import { exerciseName } from '../../core/routine/exercise-names';
import { LoadSettingsModalComponent } from '../../shared/load-settings-modal.component';
import { TabBarComponent } from '../../shared/tab-bar.component';

const TABLE_LABEL: Record<string, string> = {
  set_logs: 'Serie',
  workout_logs: 'Entrenamiento',
  body_metrics: 'Peso corporal',
  body_measurements: 'Medición',
  exercise_load_settings: 'Configuración de carga',
  fitness_goals: 'Meta',
  load_recommendations: 'Recomendación',
  health_profiles: 'Cuestionario',
  profiles: 'Datos personales',
};

/** Mis datos: datos personales, máquinas configuradas, exportar/importar e historial de cambios. */
@Component({
  selector: 'app-data',
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
    IonSpinner,
    LoadSettingsModalComponent,
    TabBarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button defaultHref="/progreso" text="Volver"></ion-back-button
        ></ion-buttons>
        <ion-title>Mis datos</ion-title>
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
            <ion-card-header><ion-card-title>Datos personales</ion-card-title></ion-card-header>
            <ion-card-content>
              <p class="hint">
                La edad ajusta las precauciones de tu rutina; el peso y la estatura, tu IMC y proteína.
              </p>
              <ion-input
                label="Fecha de nacimiento"
                labelPlacement="stacked"
                fill="outline"
                type="date"
                [value]="birth()"
                (ionChange)="birth.set(text($event.detail.value))"
              ></ion-input>
              <div class="pair">
                <ion-input
                  label="Peso (kg)"
                  labelPlacement="stacked"
                  fill="outline"
                  inputmode="decimal"
                  [value]="weight()"
                  (ionInput)="weight.set($event.detail.value ?? '')"
                ></ion-input>
                <ion-input
                  label="Estatura (cm)"
                  labelPlacement="stacked"
                  fill="outline"
                  inputmode="decimal"
                  [value]="height()"
                  (ionInput)="height.set($event.detail.value ?? '')"
                ></ion-input>
              </div>
              <ion-button expand="block" [disabled]="busy()" (click)="savePersonal()">Guardar</ion-button>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Mis máquinas y cargas</ion-card-title></ion-card-header>
            <ion-card-content>
              <p class="hint">
                Unidad, salto mínimo y rango de cada ejercicio que configuraste. También puedes hacerlo durante el
                entrenamiento con "Unidad y saltos".
              </p>
              @if (machines().length === 0) {
                <p>Aún no configuras ninguna. Sin configuración se usan kilogramos y escritura libre.</p>
              }
              @for (m of machines(); track m.id) {
                <div class="item">
                  <p>
                    <strong>{{ m.name }}</strong>
                  </p>
                  <p class="small">{{ m.detail }}</p>
                  <div class="row">
                    <ion-button size="small" fill="outline" (click)="edit(m.id)">Editar</ion-button>
                    <ion-button size="small" fill="clear" (click)="reset(m.id)">Quitar configuración</ion-button>
                  </div>
                </div>
              }
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Exportar</ion-card-title></ion-card-header>
            <ion-card-content>
              <p>
                Descarga una copia de tus datos. Contiene información personal y de salud: guárdala en un lugar seguro.
              </p>
              <ion-button expand="block" [disabled]="busy()" (click)="exportJson()"
                >Respaldo completo (JSON)</ion-button
              >
              <ion-button expand="block" fill="outline" [disabled]="busy()" (click)="exportCsv()"
                >Series registradas (CSV)</ion-button
              >
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Importar entrenamientos</ion-card-title></ion-card-header>
            <ion-card-content>
              <p>
                Desde un respaldo JSON de esta app o un CSV con el mismo formato del exportado. Los entrenamientos que
                ya existen no se duplican y los que traen datos inválidos se rechazan completos.
              </p>
              <label class="file">
                <span>Elegir archivo (.json o .csv)</span>
                <input type="file" accept=".json,.csv,application/json,text/csv" (change)="importFile($event)" />
              </label>
              @if (importResult(); as r) {
                <p role="status">
                  <strong>{{ r.imported }}</strong> importados · {{ r.skipped_existing }} ya existían ·
                  {{ r.rejected.length }} rechazados.
                </p>
                @if (r.parseErrors.length || r.rejected.length) {
                  <ul>
                    @for (e of r.parseErrors.slice(0, 10); track e) {
                      <li>{{ e }}</li>
                    }
                    @for (e of r.rejected.slice(0, 10); track e.index) {
                      <li>Entrenamiento {{ e.index }} ({{ e.started_at ?? 'sin fecha' }}): {{ e.error }}</li>
                    }
                  </ul>
                }
              }
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header><ion-card-title>Historial de modificaciones</ion-card-title></ion-card-header>
            <ion-card-content>
              <p class="hint">
                Cada vez que se corrige o borra un registro ya guardado queda aquí el valor anterior. El historial de
                entrenamiento no se puede reescribir sin dejar rastro.
              </p>
              @if (audit().length === 0) {
                <p>Sin modificaciones registradas.</p>
              }
              @for (a of audit(); track a.id) {
                <p class="small audit">
                  <strong>{{ auditTitle(a) }}</strong>
                  <span>{{ when(a.changed_at) }}</span>
                  <span class="wide">{{ auditDetail(a) }}</span>
                </p>
              }
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>

    <app-load-settings-modal
      [open]="editing() !== null"
      [exerciseName]="editingName()"
      [settings]="editingSettings()"
      (saved)="saveMachine($event)"
      (closed)="editing.set(null)"
    ></app-load-settings-modal>

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
    ion-input,
    ion-button {
      margin-top: 10px;
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .item {
      padding: 10px 0;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    .item p {
      margin: 2px 0;
    }
    .row {
      display: flex;
      gap: 8px;
    }
    .small {
      font-size: 0.85rem;
    }
    .file {
      display: block;
      margin-top: 10px;
    }
    .file span {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .file input {
      width: 100%;
      min-height: 44px;
    }
    ul {
      padding-left: 18px;
      font-size: 0.85rem;
    }
    .audit {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2px 8px;
      margin: 0 0 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
    .audit .wide {
      grid-column: 1 / -1;
      overflow-wrap: anywhere;
    }
  `,
})
export class DataPage implements ViewDidEnter {
  private readonly data = inject(DataService);
  private readonly profiles = inject(ProfileService);
  private readonly progression = inject(ProgressionService);
  private readonly catalog = inject(ExerciseService);
  private readonly toasts = inject(ToastController);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly birth = signal('');
  readonly weight = signal<string | number>('');
  readonly height = signal<string | number>('');
  readonly settings = signal<Map<string, LoadSettings>>(new Map());
  readonly editing = signal<string | null>(null);
  readonly importResult = signal<ImportResult | null>(null);
  readonly audit = signal<AuditEntry[]>([]);

  readonly machines = computed(() =>
    [...this.settings()].map(([id, s]) => ({
      id,
      name: this.nameOf(id) + (s.machineName ? ` · ${s.machineName}` : ''),
      detail: [
        `Unidad: ${unitSuffix(s.unit, s.unitLabel)}`,
        `tipo: ${s.kind.replace('_', ' ')}`,
        s.minIncrement !== null ? `salto: ${s.minIncrement}` : 'salto sin definir',
        s.scaleMin !== null || s.scaleMax !== null
          ? `rango: ${s.scaleMin ?? '–'} a ${s.scaleMax ?? '–'}`
          : 'rango sin definir',
        s.startLoad !== null ? `inicial: ${formatLoad(s.startLoad, s.unit, s.unitLabel)}` : 'carga inicial sin definir',
      ].join(' · '),
    })),
  );
  readonly editingName = computed(() => (this.editing() ? this.nameOf(this.editing()!) : ''));
  readonly editingSettings = computed(() => this.settings().get(this.editing() ?? '') ?? DEFAULT_LOAD_SETTINGS);

  ionViewDidEnter() {
    void this.load();
  }

  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      await Promise.all([this.profiles.load(true), this.catalog.ensureLoaded()]);
      const p = this.profiles.profile();
      this.birth.set(p?.birth_date ?? '');
      this.weight.set(
        typeof p?.weight_kg === 'number' || typeof p?.weight_kg === 'string'
          ? String(p.weight_kg).replace('.', ',')
          : '',
      );
      this.height.set(
        typeof p?.height_cm === 'number' || typeof p?.height_cm === 'string'
          ? String(p.height_cm).replace('.', ',')
          : '',
      );
      const [settings, audit] = await Promise.all([this.progression.loadSettings(), this.data.audit().catch(() => [])]);
      this.settings.set(settings);
      this.audit.set(audit);
    } catch {
      this.error.set('No se pudieron cargar tus datos. Revisa tu internet.');
    } finally {
      this.loading.set(false);
    }
  }

  async savePersonal() {
    const weight = this.weight() === '' ? null : parseLoad(this.weight());
    const height = this.height() === '' ? null : parseLoad(this.height());
    if (
      (this.weight() !== '' && (weight === null || weight < 20 || weight > 400)) ||
      (this.height() !== '' && (height === null || height < 80 || height > 250))
    ) {
      await this.toast('Revisa el peso (20 a 400 kg) y la estatura (80 a 250 cm).');
      return;
    }
    if (this.birth() && this.birth() > new Date().toLocaleDateString('en-CA')) {
      await this.toast('La fecha de nacimiento no puede ser futura.');
      return;
    }
    this.busy.set(true);
    try {
      await this.profiles.savePersonal({ birth_date: this.birth() || null, weight_kg: weight, height_cm: height });
      this.audit.set(await this.data.audit().catch(() => []));
      await this.toast('Datos guardados.');
    } catch {
      await this.toast('No se pudieron guardar los datos.');
    } finally {
      this.busy.set(false);
    }
  }

  edit(id: string) {
    this.editing.set(id);
  }

  async saveMachine(s: LoadSettings) {
    const id = this.editing();
    if (!id) return;
    try {
      await this.progression.saveSettings(id, s);
      this.settings.update((m) => new Map(m).set(id, s));
      this.editing.set(null);
      await this.toast('Configuración guardada. Tu historial no cambió.');
    } catch {
      await this.toast('No se pudo guardar la configuración.');
    }
  }

  async reset(id: string) {
    try {
      await this.progression.resetSettings(id);
      this.settings.update((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
    } catch {
      await this.toast('No se pudo quitar la configuración.');
    }
  }

  async exportJson() {
    await this.export(async () =>
      this.data.download(this.fileName('json'), await this.data.exportJson(), 'application/json'),
    );
  }

  async exportCsv() {
    await this.export(async () =>
      this.data.download(this.fileName('csv'), '﻿' + (await this.data.exportCsv()), 'text/csv;charset=utf-8'),
    );
  }

  private async export(run: () => Promise<void>) {
    this.busy.set(true);
    try {
      await run();
    } catch {
      await this.toast('No se pudo exportar. Revisa tu internet.');
    } finally {
      this.busy.set(false);
    }
  }

  async importFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      await this.toast('El archivo es demasiado grande (máximo 5 MB).');
      return;
    }
    this.busy.set(true);
    this.importResult.set(null);
    try {
      this.importResult.set(await this.data.importFile(file.name, await file.text()));
    } catch {
      await this.toast('No se pudo importar el archivo.');
    } finally {
      this.busy.set(false);
    }
  }

  private fileName(ext: string): string {
    return `dinovance-gym-${new Date().toLocaleDateString('en-CA')}.${ext}`;
  }

  private nameOf(id: string): string {
    const ex = this.catalog.byId().get(id);
    return ex ? exerciseName(ex) : id;
  }

  auditTitle(a: AuditEntry): string {
    return `${TABLE_LABEL[a.table_name] ?? a.table_name} ${a.action === 'DELETE' ? 'borrado' : 'modificado'}`;
  }

  /** Campos que cambiaron, con su valor anterior y el nuevo. */
  auditDetail(a: AuditEntry): string {
    if (a.action === 'DELETE' || !a.new_data) return 'Se conserva una copia del registro borrado.';
    const skip = new Set(['updated_at', 'created_at']);
    const changes = Object.keys(a.new_data)
      .filter((k) => !skip.has(k) && JSON.stringify(a.old_data[k]) !== JSON.stringify(a.new_data![k]))
      .map((k) => `${k}: ${this.short(a.old_data[k])} → ${this.short(a.new_data![k])}`);
    return changes.slice(0, 4).join(' · ') || 'Sin cambios visibles.';
  }

  private short(v: unknown): string {
    if (v === null || v === undefined) return 'vacío';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.length > 40 ? s.slice(0, 40) + '…' : s;
  }

  text = (v: unknown): string => (typeof v === 'string' ? v : '');
  when = (iso: string) => new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3000, position: 'top' });
    await t.present();
  }
}
