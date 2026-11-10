import type { Exercise } from '../models';
import { patternOf } from '../routine/rules';

export interface ExerciseFacts {
  /** Qué músculo o capacidad trabaja, en pocas palabras. */
  para: string;
  /** Ventajas (máximo 2, frases de 2 a 6 palabras). */
  pros: string[];
  /** Cosas negativas o cuidados (máximo 2). */
  contras: string[];
}

type F = [para: string, pros: string[], contras: string[]];

/** Resumen corto por patrón de movimiento: para qué sirve, qué ayuda y qué cuidar. */
const FACTS: Record<string, F> = {
  sentadilla: [
    'Piernas y glúteos',
    ['Gana fuerza general', 'Trabaja muchos músculos a la vez'],
    ['Exige buena técnica', 'Carga la zona lumbar y rodillas'],
  ],
  prensa: [
    'Cuádriceps y glúteos',
    ['Fácil de aprender', 'Espalda apoyada, más seguro'],
    ['Menos trabajo de estabilidad', 'Rodillas si bloqueas arriba'],
  ],
  zancada: [
    'Piernas y glúteos',
    ['Corrige diferencias entre piernas', 'Mejora el equilibrio'],
    ['Cuesta el equilibrio al inicio', 'Exigente para las rodillas'],
  ],
  bisagra: [
    'Isquiotibiales, glúteos y espalda baja',
    ['Gran estímulo para la cadena trasera', 'Útil para levantar del suelo'],
    ['Espalda baja si pierdes la postura', 'Requiere técnica'],
  ],
  puente_gluteo: ['Glúteos', ['Aísla bien el glúteo', 'Poca carga en la espalda'], ['Puede arquear la espalda baja']],
  extension_cuadriceps: [
    'Cuádriceps',
    ['Aísla el cuádriceps', 'Fácil y casi sin técnica'],
    ['Tensión en la rodilla con mucho peso'],
  ],
  curl_femoral: [
    'Isquiotibiales',
    ['Aísla la parte trasera del muslo', 'Ayuda a proteger la rodilla'],
    ['Calambres si vas muy rápido'],
  ],
  abductor: ['Glúteo medio y lateral de cadera', ['Estabiliza la cadera'], ['Aporta poco al volumen total']],
  aductor: ['Cara interna del muslo', ['Estabiliza la cadera'], ['Aporta poco al volumen total']],
  pantorrilla: [
    'Pantorrillas',
    ['Mejora tobillo y salto', 'Casi no cansa el resto del cuerpo'],
    ['Crece lento, necesita constancia'],
  ],
  press_pecho: [
    'Pecho, hombros y tríceps',
    ['Gran fuerza de empuje', 'Se puede cargar pesado'],
    ['Hombros si abres mucho los codos'],
  ],
  press_inclinado: ['Parte alta del pecho y hombros', ['Completa el pecho superior'], ['Más carga en el hombro']],
  aperturas: [
    'Pecho',
    ['Estira bien el pecho', 'Poco trabajo de tríceps'],
    ['Hombro si bajas demasiado', 'No admite mucho peso'],
  ],
  press_hombro: [
    'Hombros y tríceps',
    ['Construye hombros fuertes', 'Útil para empujar sobre la cabeza'],
    ['Hombro y cuello si hay molestia previa'],
  ],
  elevacion_lateral: [
    'Hombro lateral (ancho)',
    ['Da forma al hombro', 'Poco riesgo'],
    ['Se hace mal con demasiado peso'],
  ],
  elevacion_frontal: [
    'Hombro frontal',
    ['Aísla el hombro delantero'],
    ['Ya trabaja en los press', 'Hombro si te sobrecargas'],
  ],
  deltoide_posterior: [
    'Hombro posterior y espalda alta',
    ['Mejora la postura', 'Equilibra el hombro'],
    ['Se compensa con impulso'],
  ],
  jalon: [
    'Dorsales y bíceps',
    ['Prepara para las dominadas', 'Ajustas el peso fácilmente'],
    ['Codos y hombro si tiras con la nuca'],
  ],
  dominada: [
    'Dorsales, espalda alta y bíceps',
    ['Fuerza real con tu peso', 'Muy completo'],
    ['Difícil al empezar', 'Codos y hombros si abusas'],
  ],
  remo: [
    'Espalda media y dorsales',
    ['Mejora la postura', 'Equilibra los ejercicios de empuje'],
    ['Espalda baja si te balanceas'],
  ],
  encogimiento: ['Trapecio superior', ['Aísla el trapecio'], ['Cuello tenso si exageras']],
  curl: ['Bíceps', ['Aísla el bíceps', 'Fácil de aprender'], ['Balancear quita el trabajo al músculo']],
  curl_martillo: ['Bíceps y antebrazo', ['Engrosa el brazo', 'Cuida la muñeca'], ['Menos aislamiento del bíceps']],
  curl_predicador: ['Bíceps (porción larga)', ['Evita hacer trampa', 'Mucho estiramiento'], ['Codo si bajas de golpe']],
  pushdown: ['Tríceps', ['Aísla el tríceps', 'Amable con el codo'], ['Pierde efecto si abres los codos']],
  extension_triceps: ['Tríceps', ['Gran estiramiento del tríceps'], ['Codo y muñeca con mucho peso']],
  fondos: [
    'Pecho, tríceps y hombros',
    ['Muy completo con tu peso', 'Mucha fuerza de empuje'],
    ['Hombros si bajas de más', 'Difícil al comenzar'],
  ],
  crunch: ['Abdomen', ['Aísla el abdomen', 'No necesita equipo'], ['Cuello si tiras de la cabeza']],
  plancha: ['Abdomen y core', ['Estabiliza la columna', 'Casi sin impacto'], ['Se arquea la espalda cuando te cansas']],
  elevacion_piernas: ['Abdomen bajo', ['Trabaja la parte baja del abdomen'], ['Espalda baja si se arquea']],
};

const STRETCH: F = ['Flexibilidad', ['Suelta la zona', 'Ayuda a recuperarte'], ['No fuerces hasta el dolor']];
const CARDIO: F = [
  'Resistencia y corazón',
  ['Mejora tu energía', 'Ayuda a bajar grasa'],
  ['Puede restar recuperación si lo haces antes de pesas'],
];
const DEFAULT: F = [
  'Fuerza y masa muscular',
  ['Suma volumen de entrenamiento'],
  ['Cuida la técnica antes de subir peso'],
];

const EQUIP_CON: Record<string, string> = {
  barbell: 'Pide más técnica que una máquina',
  machine: 'Movimiento fijo, no se adapta a tu cuerpo',
  cable: 'Depende de cómo ajustes la polea',
};

/** Datos cortos para mostrar en pantalla: para qué sirve, a favor y en contra. */
export function factsFor(ex: Exercise): ExerciseFacts {
  const f: F =
    ex.category === 'stretching'
      ? STRETCH
      : ex.category === 'cardio'
        ? CARDIO
        : (FACTS[patternOf(ex.name, '')] ?? DEFAULT);
  const contras = [...f[2]];
  const extra = ex.equipment ? EQUIP_CON[ex.equipment] : null;
  if (extra && contras.length < 2 && ex.category !== 'stretching' && ex.category !== 'cardio') contras.push(extra);
  return { para: f[0], pros: f[1].slice(0, 2), contras: contras.slice(0, 2) };
}
