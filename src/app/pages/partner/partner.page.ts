import { Component, inject, signal } from '@angular/core';
import {
  AlertController,
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
  type ViewDidEnter,
} from '@ionic/angular';

import { volumeKeyName } from '../../core/anatomy/muscles';
import { PartnerService, type PartnerLink, type PartnerSummary } from '../../core/partner.service';
import { RoutineService, type RoutineSummary } from '../../core/routine.service';
import { StatsService, type Stats } from '../../core/stats.service';
import { isoDate } from '../../core/analysis/weekly-report';
import { TabBarComponent } from '../../shared/tab-bar.component';

interface CompareRow {
  week: string;
  mine: number;
  partner: number;
}

/**
 * Pareja de entrenamiento: vínculo opcional entre los dos perfiles. Permite compartir una rutina
 * (copia sin cargas) y, solo si ambos lo activan, comparar un resumen semanal. Los registros de
 * cada persona siguen siendo privados y nunca se mezclan.
 */
@Component({
  selector: 'app-partner',
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
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonToggle,
    TabBarComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button defaultHref="/progreso" text="Volver"></ion-back-button
        ></ion-buttons>
        <ion-title>Mi pareja de entrenamiento</ion-title>
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
          <p class="hint">
            Cada quien tiene su perfil, sus rutinas, sus cargas y sus informes. El vínculo es opcional y nunca usa los
            registros de una persona para recomendarle algo a la otra.
          </p>

          @if (!link()) {
            <ion-card>
              <ion-card-header><ion-card-title>Vincular cuentas</ion-card-title></ion-card-header>
              <ion-card-content>
                <p>Escribe el correo con el que tu pareja se registró. Le llegará una invitación dentro de la app.</p>
                <ion-input
                  label="Correo de tu pareja"
                  labelPlacement="stacked"
                  fill="outline"
                  type="email"
                  inputmode="email"
                  autocomplete="off"
                  [value]="email()"
                  (ionInput)="email.set($event.detail.value ?? '')"
                ></ion-input>
                <ion-button expand="block" [disabled]="busy()" (click)="invite()">Enviar invitación</ion-button>
              </ion-card-content>
            </ion-card>
          } @else if (link(); as l) {
            <ion-card>
              <ion-card-header
                ><ion-card-title>{{ l.partner_name }}</ion-card-title></ion-card-header
              >
              <ion-card-content>
                @if (l.status === 'pendiente' && l.i_invited) {
                  <p>Invitación enviada. Falta que la acepte desde su cuenta.</p>
                  <ion-button expand="block" fill="outline" [disabled]="busy()" (click)="unlink()"
                    >Cancelar invitación</ion-button
                  >
                } @else if (l.status === 'pendiente') {
                  <p>{{ l.partner_name }} quiere vincular su cuenta con la tuya.</p>
                  <ion-button expand="block" [disabled]="busy()" (click)="respond(true)">Aceptar</ion-button>
                  <ion-button expand="block" fill="outline" [disabled]="busy()" (click)="respond(false)"
                    >Rechazar</ion-button
                  >
                } @else {
                  <p>Cuentas vinculadas.</p>
                  <ion-toggle [checked]="l.i_share" [disabled]="busy()" (ionChange)="setSharing($event.detail.checked)">
                    Compartir mi resumen semanal
                  </ion-toggle>
                  <p class="hint">
                    Solo se comparte cuántas veces entrenaste, los minutos y las series por grupo muscular. Nunca tus
                    pesos, repeticiones, medidas ni datos de salud.
                  </p>
                  <ion-button expand="block" fill="clear" color="danger" [disabled]="busy()" (click)="unlink()"
                    >Desvincular</ion-button
                  >
                }
              </ion-card-content>
            </ion-card>

            @if (l.status === 'aceptada') {
              <ion-card>
                <ion-card-header><ion-card-title>Compartir una rutina</ion-card-title></ion-card-header>
                <ion-card-content>
                  @if (routines().length === 0) {
                    <p>Aún no tienes rutinas para compartir.</p>
                  } @else {
                    <ion-select
                      label="Rutina"
                      labelPlacement="stacked"
                      fill="outline"
                      interface="action-sheet"
                      [value]="routineId()"
                      (ionChange)="routineId.set($event.detail.value)"
                    >
                      @for (r of routines(); track r.id) {
                        <ion-select-option [value]="r.id"
                          >{{ r.name }}{{ r.is_active ? ' (en uso)' : '' }}</ion-select-option
                        >
                      }
                    </ion-select>
                    <ion-button expand="block" [disabled]="busy() || !routineId()" (click)="share()"
                      >Enviar una copia a {{ l.partner_name }}</ion-button
                    >
                  }
                  <p class="hint">
                    Recibe una copia en "Rutinas" con los mismos ejercicios, series y repeticiones, sin ninguna carga.
                    Cada quien registra y progresa con sus propios pesos, y puede editar su copia.
                  </p>
                </ion-card-content>
              </ion-card>

              <ion-card>
                <ion-card-header><ion-card-title>Comparación (opcional)</ion-card-title></ion-card-header>
                <ion-card-content>
                  <ion-toggle [checked]="compare()" (ionChange)="toggleCompare($event.detail.checked)">
                    Ver nuestra comparación semanal
                  </ion-toggle>
                  @if (compare()) {
                    @if (comparing()) {
                      <div class="center small"><ion-spinner></ion-spinner></div>
                    } @else if (summary(); as s) {
                      @if (!s.available) {
                        <p>
                          {{
                            s.reason === 'no_comparte'
                              ? l.partner_name + ' no tiene activado compartir su resumen.'
                              : 'El vínculo aún no está aceptado.'
                          }}
                        </p>
                      } @else {
                        <table>
                          <caption>
                            Entrenamientos por semana
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Semana</th>
                              <th scope="col">Yo</th>
                              <th scope="col">{{ l.partner_name }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of sessionRows(); track row.week) {
                              <tr>
                                <td>{{ row.week }}</td>
                                <td>{{ row.mine }}</td>
                                <td>{{ row.partner }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                        <table>
                          <caption>
                            Series por grupo muscular (últimos días)
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Grupo</th>
                              <th scope="col">Yo</th>
                              <th scope="col">{{ l.partner_name }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of muscleRows(); track row.week) {
                              <tr>
                                <td>{{ row.week }}</td>
                                <td>{{ row.mine }}</td>
                                <td>{{ row.partner }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                        <p class="hint">
                          Es solo constancia y volumen. No se comparan cargas: cada cuerpo y cada máquina son distintos.
                        </p>
                      }
                    }
                  }
                </ion-card-content>
              </ion-card>
            }
          }
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
    .center.small {
      padding: 16px 0;
    }
    ion-card {
      margin: 12px 0;
    }
    ion-input,
    ion-select,
    ion-button {
      margin-top: 10px;
    }
    ion-toggle {
      width: 100%;
      min-height: 44px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      margin-top: 12px;
    }
    caption {
      text-align: left;
      font-weight: 700;
      padding-bottom: 4px;
    }
    th,
    td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }
  `,
})
export class PartnerPage implements ViewDidEnter {
  private readonly partner = inject(PartnerService);
  private readonly routineService = inject(RoutineService);
  private readonly statsService = inject(StatsService);
  private readonly toasts = inject(ToastController);
  private readonly alerts = inject(AlertController);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly link = signal<PartnerLink | null>(null);
  readonly email = signal('');
  readonly routines = signal<RoutineSummary[]>([]);
  readonly routineId = signal<string | null>(null);
  readonly compare = signal(false);
  readonly comparing = signal(false);
  readonly summary = signal<PartnerSummary | null>(null);
  readonly sessionRows = signal<CompareRow[]>([]);
  readonly muscleRows = signal<CompareRow[]>([]);

  ionViewDidEnter() {
    void this.load();
  }

  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      const [link, routines] = await Promise.all([this.partner.link(), this.routineService.list().catch(() => [])]);
      this.link.set(link);
      this.routines.set(routines);
      this.routineId.set(routines.find((r) => r.is_active)?.id ?? routines[0]?.id ?? null);
    } catch {
      this.error.set('No se pudo cargar el vínculo. Revisa tu internet.');
    } finally {
      this.loading.set(false);
    }
  }

  async invite() {
    const email = this.email().trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      await this.toast('Escribe un correo válido.');
      return;
    }
    await this.run(
      () => this.partner.invite(email),
      'Invitación enviada.',
      'No se pudo invitar: revisa que el correo sea el de su cuenta y que ninguna de las dos tenga ya un vínculo.',
    );
  }

  respond(accept: boolean) {
    const l = this.link();
    if (!l) return;
    void this.run(
      () => this.partner.respond(l.link_id, accept),
      accept ? 'Cuentas vinculadas.' : 'Invitación rechazada.',
    );
  }

  setSharing(share: boolean) {
    void this.run(
      () => this.partner.setSharing(share),
      share ? 'Tu resumen semanal ahora es visible para tu pareja.' : 'Dejaste de compartir tu resumen.',
    );
  }

  async unlink() {
    const l = this.link();
    if (!l) return;
    const alert = await this.alerts.create({
      header: 'Desvincular',
      message: 'Se quita el vínculo. Las rutinas ya compartidas y los datos de cada quien se conservan.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Desvincular', role: 'confirm' },
      ],
    });
    await alert.present();
    if ((await alert.onDidDismiss()).role !== 'confirm') return;
    this.compare.set(false);
    await this.run(() => this.partner.unlink(l.link_id), 'Vínculo eliminado.');
  }

  share() {
    const id = this.routineId();
    if (!id) return;
    void this.run(() => this.partner.shareRoutine(id), 'Copia enviada. Aparecerá en sus rutinas.');
  }

  async toggleCompare(on: boolean) {
    this.compare.set(on);
    if (!on) return;
    this.comparing.set(true);
    try {
      const [summary, mine] = await Promise.all([this.partner.summary(8), this.statsService.load()]);
      this.summary.set(summary);
      if (summary.available) this.buildRows(summary, mine);
    } catch {
      this.compare.set(false);
      await this.toast('No se pudo cargar la comparación.');
    } finally {
      this.comparing.set(false);
    }
  }

  /** Une mis semanas (calculadas con mis registros) con el resumen agregado de la pareja. */
  private buildRows(summary: PartnerSummary, mine: Stats) {
    const theirs = new Map((summary.weeks ?? []).map((w) => [w.week_start, w.sessions]));
    this.sessionRows.set(
      mine.weeks
        .map((w) => ({ week: isoDate(w.start), mine: w.sessions, partner: theirs.get(isoDate(w.start)) ?? 0 }))
        .reverse(),
    );
    const partnerSets = summary.muscle_sets ?? {};
    const keys = new Set([...mine.muscleSets.keys(), ...Object.keys(partnerSets)]);
    this.muscleRows.set(
      [...keys]
        .map((k) => ({ week: volumeKeyName(k), mine: mine.muscleSets.get(k) ?? 0, partner: partnerSets[k] ?? 0 }))
        .sort((a, b) => a.week.localeCompare(b.week)),
    );
  }

  private async run(action: () => Promise<void>, ok: string, fail = 'No se pudo completar. Inténtalo de nuevo.') {
    this.busy.set(true);
    try {
      await action();
      this.link.set(await this.partner.link());
      await this.toast(ok);
    } catch {
      await this.toast(fail);
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3000, position: 'top' });
    await t.present();
  }
}
