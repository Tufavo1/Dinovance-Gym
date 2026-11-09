import { Component, input, output } from '@angular/core';

export type BodyView = 'front' | 'back';

export interface BodyPart {
  id: string;
  label: string;
  /** Músculos del dataset que trabaja esta zona. */
  muscles: string[];
  /** Explicación corta para quien no conoce el nombre del músculo. */
  hint: string;
}

/** Zonas tocables del cuerpo y sus músculos. */
export const BODY_PARTS: Record<string, BodyPart> = {
  pecho: { id: 'pecho', label: 'Pecho', muscles: ['chest'], hint: 'Pectorales: empujar hacia adelante.' },
  hombros: {
    id: 'hombros',
    label: 'Hombros',
    muscles: ['shoulders'],
    hint: 'Deltoides: levantar y empujar los brazos.',
  },
  biceps: { id: 'biceps', label: 'Bíceps', muscles: ['biceps'], hint: 'Parte de adelante del brazo: doblar el codo.' },
  triceps: {
    id: 'triceps',
    label: 'Tríceps',
    muscles: ['triceps'],
    hint: 'Parte de atrás del brazo: estirar el codo.',
  },
  antebrazos: { id: 'antebrazos', label: 'Antebrazos', muscles: ['forearms'], hint: 'Agarre y muñecas.' },
  abdomen: { id: 'abdomen', label: 'Abdomen', muscles: ['abdominals'], hint: 'Core: estabiliza la columna.' },
  cadera: {
    id: 'cadera',
    label: 'Cadera (aductores y abductores)',
    muscles: ['adductors', 'abductors'],
    hint: 'Cerrar y abrir las piernas; estabilizan la rodilla.',
  },
  cuadriceps: { id: 'cuadriceps', label: 'Cuádriceps', muscles: ['quadriceps'], hint: 'Parte de adelante del muslo.' },
  trapecio: { id: 'trapecio', label: 'Trapecio', muscles: ['traps'], hint: 'Entre el cuello y los hombros.' },
  espalda: {
    id: 'espalda',
    label: 'Espalda',
    muscles: ['lats', 'middle back'],
    hint: 'Dorsales y espalda media: tirar y mejorar la postura.',
  },
  lumbar: { id: 'lumbar', label: 'Zona lumbar', muscles: ['lower back'], hint: 'Espalda baja: protege la columna.' },
  gluteos: { id: 'gluteos', label: 'Glúteos', muscles: ['glutes'], hint: 'El músculo más grande: cadera y postura.' },
  isquiotibiales: {
    id: 'isquiotibiales',
    label: 'Isquiotibiales',
    muscles: ['hamstrings'],
    hint: 'Parte de atrás del muslo: doblar la rodilla.',
  },
  pantorrillas: {
    id: 'pantorrillas',
    label: 'Pantorrillas',
    muscles: ['calves'],
    hint: 'Gemelos: subir en punta de pies.',
  },
};

interface Shape {
  part: string;
  d: string;
}

/** Siluetas simples (viewBox 0 0 200 400). */
const FRONT: Shape[] = [
  { part: 'hombros', d: 'M48 78a15 13 0 1 0 30 0a15 13 0 1 0 -30 0Z' },
  { part: 'hombros', d: 'M122 78a15 13 0 1 0 30 0a15 13 0 1 0 -30 0Z' },
  { part: 'pecho', d: 'M99 70H79q-9 2-9 14l2 16q12 10 27 4Z' },
  { part: 'pecho', d: 'M101 70h20q9 2 9 14l-2 16q-12 10-27 4Z' },
  { part: 'biceps', d: 'M44 100q0-8 8-8h1q8 0 8 8v30q0 8-8 8h-1q-8 0-8-8Z' },
  { part: 'biceps', d: 'M139 100q0-8 8-8h1q8 0 8 8v30q0 8-8 8h-1q-8 0-8-8Z' },
  { part: 'antebrazos', d: 'M38 148q0-7 7-7h2q7 0 7 7v38q0 7-7 7h-2q-7 0-7-7Z' },
  { part: 'antebrazos', d: 'M146 148q0-7 7-7h2q7 0 7 7v38q0 7-7 7h-2q-7 0-7-7Z' },
  { part: 'abdomen', d: 'M80 116q0-8 8-8h24q8 0 8 8v50q0 8-8 8H88q-8 0-8-8Z' },
  { part: 'cadera', d: 'M88 180h24l-12 34Z' },
  { part: 'cuadriceps', d: 'M72 192q0-12 12-12h2q12 0 12 12v72q0 12-12 12h-2q-12 0-12-12Z' },
  { part: 'cuadriceps', d: 'M102 192q0-12 12-12h2q12 0 12 12v72q0 12-12 12h-2q-12 0-12-12Z' },
  { part: 'pantorrillas', d: 'M76 294q0-9 9-9h2q9 0 9 9v58q0 9-9 9h-2q-9 0-9-9Z' },
  { part: 'pantorrillas', d: 'M104 294q0-9 9-9h2q9 0 9 9v58q0 9-9 9h-2q-9 0-9-9Z' },
];

const BACK: Shape[] = [
  { part: 'trapecio', d: 'M100 56l20 10-8 30-12 8-12-8-8-30Z' },
  { part: 'hombros', d: 'M48 78a15 13 0 1 0 30 0a15 13 0 1 0 -30 0Z' },
  { part: 'hombros', d: 'M122 78a15 13 0 1 0 30 0a15 13 0 1 0 -30 0Z' },
  { part: 'espalda', d: 'M76 86q-6 34 8 64l16 6 16-6q14-30 8-64l-12 14-12 8-12-8Z' },
  { part: 'triceps', d: 'M44 100q0-8 8-8h1q8 0 8 8v30q0 8-8 8h-1q-8 0-8-8Z' },
  { part: 'triceps', d: 'M139 100q0-8 8-8h1q8 0 8 8v30q0 8-8 8h-1q-8 0-8-8Z' },
  { part: 'antebrazos', d: 'M38 148q0-7 7-7h2q7 0 7 7v38q0 7-7 7h-2q-7 0-7-7Z' },
  { part: 'antebrazos', d: 'M146 148q0-7 7-7h2q7 0 7 7v38q0 7-7 7h-2q-7 0-7-7Z' },
  { part: 'lumbar', d: 'M84 158q0-6 6-6h20q6 0 6 6v12q0 6-6 6H90q-6 0-6-6Z' },
  { part: 'gluteos', d: 'M73 194a16 17 0 1 0 32 0a16 17 0 1 0 -32 0Z' },
  { part: 'gluteos', d: 'M95 194a16 17 0 1 0 32 0a16 17 0 1 0 -32 0Z' },
  { part: 'isquiotibiales', d: 'M72 222q0-10 10-10h6q10 0 10 10v50q0 10-10 10h-6q-10 0-10-10Z' },
  { part: 'isquiotibiales', d: 'M102 222q0-10 10-10h6q10 0 10 10v50q0 10-10 10h-6q-10 0-10-10Z' },
  { part: 'pantorrillas', d: 'M74 314a12 28 0 1 0 24 0a12 28 0 1 0 -24 0Z' },
  { part: 'pantorrillas', d: 'M102 314a12 28 0 1 0 24 0a12 28 0 1 0 -24 0Z' },
];

/**
 * Cuerpo humano interactivo: toca una zona para elegir qué entrenar.
 * Rojo = lesión activa · verde = ya tiene ejercicios en el día · azul = seleccionada.
 */
@Component({
  selector: 'app-body-map',
  template: `
    <svg
      viewBox="0 0 200 400"
      role="group"
      [attr.aria-label]="view() === 'front' ? 'Cuerpo de frente' : 'Cuerpo de espalda'"
    >
      <!-- Silueta base (no tocable) -->
      <g class="base">
        <circle cx="100" cy="32" r="20" />
        <rect x="92" y="50" width="16" height="14" rx="4" />
        <path d="M70 66h60q12 4 12 20l-2 90q-4 8-16 10l2 6h-52l2-6q-12-2-16-10l-2-90q0-16 12-20Z" />
        <rect x="74" y="276" width="22" height="16" rx="6" />
        <rect x="104" y="276" width="22" height="16" rx="6" />
        <rect x="74" y="356" width="24" height="12" rx="6" />
        <rect x="102" y="356" width="24" height="12" rx="6" />
        <circle cx="46" cy="200" r="8" />
        <circle cx="154" cy="200" r="8" />
      </g>
      @for (s of shapes(); track $index) {
        <path
          class="part"
          [attr.d]="s.d"
          [class.sel]="selected() === s.part"
          [class.has]="active().includes(s.part)"
          [class.hurt]="injured().includes(s.part)"
          role="button"
          tabindex="0"
          [attr.aria-label]="label(s.part)"
          (click)="pick.emit(s.part)"
          (keydown.enter)="pick.emit(s.part)"
          (keydown.space)="pick.emit(s.part)"
        >
          <title>{{ label(s.part) }}</title>
        </path>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      width: 100%;
      max-width: 260px;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    .base > * {
      fill: var(--ion-color-light);
    }
    .part {
      fill: var(--ion-color-medium-tint, #a0a7b0);
      stroke: var(--ion-background-color, #fff);
      stroke-width: 1.5;
      cursor: pointer;
      transition: fill 0.15s;
      outline: none;
    }
    .part:hover,
    .part:focus-visible {
      fill: var(--ion-color-primary-tint);
    }
    .part.has {
      fill: var(--ion-color-success);
    }
    .part.hurt {
      fill: var(--ion-color-danger-tint);
    }
    .part.sel {
      fill: var(--ion-color-primary);
    }
  `,
})
export class BodyMapComponent {
  readonly view = input<BodyView>('front');
  readonly selected = input<string | null>(null);
  /** Zonas que ya tienen ejercicios en el día elegido. */
  readonly active = input<string[]>([]);
  /** Zonas con lesión activa. */
  readonly injured = input<string[]>([]);
  readonly pick = output<string>();

  shapes(): Shape[] {
    return this.view() === 'front' ? FRONT : BACK;
  }

  label(part: string): string {
    return BODY_PARTS[part]?.label ?? part;
  }
}
