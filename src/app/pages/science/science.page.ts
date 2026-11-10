import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, openOutline, searchOutline } from 'ionicons/icons';

import { PubmedService, type PubmedArticle, type Verification } from '../../core/evidence/pubmed.service';
import { REFERENCES, pubmedUrl, type ReferenceSource } from '../../core/evidence/references';

/** Biblioteca de estudios en los que se basan las reglas del generador. */
@Component({
  selector: 'app-science',
  imports: [
    FormsModule,
    IonButton,
    IonCheckbox,
    IonInput,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/rutina" text="Atrás"></ion-back-button></ion-buttons>
        <ion-title>La ciencia</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        <p class="hint">
          Las reglas de tus rutinas salen de estos estudios. Puedes buscar más en PubMed o comprobar que cada cita
          existe.
        </p>
        <section class="live card">
          <h2>Buscar en PubMed</h2>
          <form (ngSubmit)="search()">
            <ion-input
              label="Tema (en inglés)"
              labelPlacement="floating"
              fill="outline"
              placeholder="ej: resistance training volume hypertrophy"
              name="q"
              [(ngModel)]="q"
            ></ion-input>
            <ion-checkbox labelPlacement="end" [checked]="jscr()" (ionChange)="jscr.set($event.detail.checked)"
              >Solo JSCR</ion-checkbox
            >
            <ion-checkbox labelPlacement="end" [checked]="reviews()" (ionChange)="reviews.set($event.detail.checked)"
              >Solo meta-análisis y revisiones</ion-checkbox
            >
            <ion-button type="submit" expand="block" [disabled]="searching()">
              <ion-icon slot="start" name="search-outline"></ion-icon>
              {{ searching() ? 'Buscando…' : 'Buscar' }}
            </ion-button>
          </form>
          @if (searchError()) {
            <p class="hint err">{{ searchError() }}</p>
          }
          @for (a of results(); track a.pmid) {
            <article class="ref">
              <h3>{{ a.title }}</h3>
              <p class="meta">
                {{ a.authors }} · {{ a.year }} · <em>{{ a.journal }}</em>
              </p>
              <a [href]="a.url" target="_blank" rel="noopener noreferrer"
                >PMID {{ a.pmid }} <ion-icon name="open-outline" aria-hidden="true"></ion-icon
              ></a>
            </article>
          } @empty {
            @if (searched()) {
              <p class="hint">Sin resultados.</p>
            }
          }
        </section>

        <h2>Estudios que respaldan las reglas</h2>
        <ion-button fill="outline" size="small" [disabled]="verifying()" (click)="verifyAll()">
          <ion-icon slot="start" name="checkmark-circle"></ion-icon>
          {{ verifying() ? 'Verificando…' : 'Verificar todos en PubMed' }}
        </ion-button>
        <ion-segment [value]="filter()" (ionChange)="filter.set($any($event.detail.value))">
          <ion-segment-button value="todos"><ion-label>Todos</ion-label></ion-segment-button>
          <ion-segment-button value="JSCR"><ion-label>JSCR</ion-label></ion-segment-button>
          <ion-segment-button value="PubMed"><ion-label>PubMed</ion-label></ion-segment-button>
          <ion-segment-button value="otros"><ion-label>Otros</ion-label></ion-segment-button>
        </ion-segment>

        @for (r of list(); track r.id) {
          <article class="ref">
            <h3>{{ r.title }}</h3>
            <p class="meta">
              {{ r.authors }} · {{ r.year }} · <em>{{ r.journal }}</em>
            </p>
            <p class="take">{{ r.takeaway }}</p>
            @if (r.source === 'PubMed' || r.source === 'JSCR') {
              @if (checks()[r.id]; as v) {
                @if (v.matched) {
                  <p class="ok">
                    <ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon> Verificado en PubMed ·
                    <a
                      [href]="'https://pubmed.ncbi.nlm.nih.gov/' + v.pmid + '/'"
                      target="_blank"
                      rel="noopener noreferrer"
                      >PMID {{ v.pmid }}</a
                    >
                  </p>
                } @else {
                  <p class="err">
                    No se pudo confirmar en PubMed: revisa la cita.
                    <a [href]="url(r)" target="_blank" rel="noopener noreferrer">Buscar</a>
                  </p>
                }
              } @else {
                <a [href]="url(r)" target="_blank" rel="noopener noreferrer">
                  Buscar en PubMed <ion-icon name="open-outline" aria-hidden="true"></ion-icon>
                </a>
              }
            }
          </article>
        }
      </div>
    </ion-content>
  `,
  styles: `
    ion-segment {
      margin: 8px 0 16px;
    }
    .ref {
      border-bottom: 1px solid var(--ion-color-light-shade);
      padding: 12px 0;
    }
    .ref h3 {
      font-size: 0.95rem;
      margin: 0 0 4px;
    }
    .meta {
      font-size: 0.78rem;
      color: var(--ion-color-medium);
      margin: 0 0 6px;
    }
    .take {
      font-size: 0.88rem;
      margin: 0 0 6px;
    }
    a {
      font-size: 0.85rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 44px;
    }
    h2 {
      font-size: 1.05rem;
      margin: 20px 0 8px;
    }
    .card {
      background: var(--ion-card-background);
      border: 1px solid var(--dv-border);
      border-radius: var(--dv-radius);
      box-shadow: var(--dv-shadow);
      padding: 4px 16px 16px;
      margin-bottom: 8px;
    }
    .live ion-checkbox {
      display: block;
      min-height: 40px;
      margin: 4px 0;
    }
    .ok {
      color: var(--ion-color-success);
      font-size: 0.85rem;
      margin: 0;
    }
    .err {
      color: var(--ion-color-danger);
      font-size: 0.85rem;
      margin: 0;
    }
  `,
})
export class SciencePage {
  readonly filter = signal<'todos' | 'otros' | ReferenceSource>('todos');
  readonly list = computed(() =>
    this.filter() === 'todos'
      ? REFERENCES
      : this.filter() === 'otros'
        ? REFERENCES.filter((r) => r.source === 'Libro / programa' || r.source === 'Otra revista')
        : REFERENCES.filter((r) => r.source === this.filter()),
  );
  readonly url = pubmedUrl;

  private readonly pubmed = inject(PubmedService);
  q = '';
  readonly jscr = signal(false);
  readonly reviews = signal(true);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly searchError = signal('');
  readonly results = signal<PubmedArticle[]>([]);
  readonly verifying = signal(false);
  readonly checks = signal<Record<string, Verification>>({});

  constructor() {
    addIcons({ checkmarkCircle, openOutline, searchOutline });
  }

  async search() {
    if (this.searching()) return;
    this.searching.set(true);
    this.searchError.set('');
    try {
      this.results.set(await this.pubmed.search(this.q, { jscr: this.jscr(), reviewsOnly: this.reviews() }));
      this.searched.set(true);
    } catch {
      this.searchError.set('No se pudo consultar PubMed. Revisa tu internet.');
    } finally {
      this.searching.set(false);
    }
  }

  async verifyAll() {
    this.verifying.set(true);
    try {
      for (const r of REFERENCES.filter((x) => x.source === 'PubMed' || x.source === 'JSCR')) {
        const v = await this.pubmed.verify(r);
        this.checks.update((c) => ({ ...c, [r.id]: v }));
      }
    } catch {
      this.searchError.set('No se pudo consultar PubMed. Revisa tu internet.');
    } finally {
      this.verifying.set(false);
    }
  }
}
