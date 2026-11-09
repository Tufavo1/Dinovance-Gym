import { Component, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { helpCircleOutline } from 'ionicons/icons';

/** Glosario en palabras simples, para quien nunca ha entrenado. */
const TERMS = [
  {
    term: 'Repetición',
    text: 'Hacer el movimiento completo una vez. Bajar y subir = 1 repetición.',
  },
  {
    term: 'Serie',
    text: 'Un grupo de repeticiones seguidas. "3 series de 10" = haces 10 repeticiones, descansas, y lo repites 3 veces.',
  },
  {
    term: 'Rango (ej: 8 a 12)',
    text: 'Haz al menos 8. Si llegas a 12 y aún te sobran fuerzas, el peso está liviano: la próxima vez subirás.',
  },
  {
    term: 'RIR',
    text: 'Repeticiones en reserva: cuántas más podrías haber hecho, con buena técnica, al terminar la serie. RIR 2 = te quedaban 2. RIR 0 = no podías ni una más.',
  },
  {
    term: 'RPE',
    text: 'Qué tan duro fue, de 1 a 10. Va de la mano con el RIR: RPE 8 = te quedaban 2, RPE 10 = al límite.',
  },
  {
    term: '¿Por qué no ir al límite?',
    text: 'Dejar 1 a 3 repeticiones de margen da casi los mismos resultados, con menos riesgo de lesión y mejor técnica.',
  },
  {
    term: 'Descanso',
    text: 'El tiempo para recuperar el aire entre series. En ejercicios grandes (piernas, espalda) es más largo.',
  },
  {
    term: 'Peso recomendado',
    text: 'Lo calculamos con tus datos y con lo que hiciste antes. Es un punto de partida: si la serie se siente más fácil o más difícil que el objetivo, ajústalo.',
  },
  {
    term: 'Series efectivas',
    text: 'Las series que hiciste cerca de tu límite (te quedaban 3 o menos). Son las que más te hacen progresar.',
  },
  {
    term: 'Kg movidos',
    text: 'La suma de peso × repeticiones de todo el día. Si sube con las semanas, estás progresando.',
  },
  {
    term: 'Esfuerzo del día',
    text: 'Cómo sentiste el entrenamiento completo: 1 = muy suave, como caminar; 10 = lo más duro que puedes.',
  },
];

@Component({
  selector: 'app-help-button',
  imports: [IonButton, IonButtons, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-button (click)="open.set(true)" aria-label="¿Qué significa cada término?">
      <ion-icon slot="icon-only" name="help-circle-outline"></ion-icon>
    </ion-button>

    <ion-modal [isOpen]="open()" (didDismiss)="open.set(false)" [initialBreakpoint]="0.85" [breakpoints]="[0, 0.85, 1]">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>¿Qué significa?</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="open.set(false)">Cerrar</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          @for (t of terms; track t.term) {
            <section class="term">
              <h3>{{ t.term }}</h3>
              <p>{{ t.text }}</p>
            </section>
          }
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    .term {
      margin-bottom: 16px;
    }
    .term h3 {
      margin: 0 0 4px;
      font-size: 1rem;
      font-weight: 700;
    }
    .term p {
      margin: 0;
      line-height: 1.4;
    }
  `,
})
export class HelpButtonComponent {
  readonly terms = TERMS;
  readonly open = signal(false);

  constructor() {
    addIcons({ helpCircleOutline });
  }
}
