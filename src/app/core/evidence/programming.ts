import type { HealthProfile } from '../models';

/**
 * Reglas de programación basadas en evidencia. Cada número viene de un meta-análisis o de los
 * marcos de Helms (pirámide), Israetel (MEV/MAV/MRV), Schoenfeld (volumen, frecuencia, carga),
 * Wolf / Androulakis-Korakakis (dosis mínima, recorrido) y Mentzer (alta intensidad).
 * Ver references.ts para las citas.
 */

export type Approach = 'equilibrado' | 'alta_intensidad' | 'alto_volumen';

export interface ProgrammeInput {
  rank: number;
  beginner: boolean;
  cautious: boolean;
  poorSleep: boolean;
  highStress: boolean;
  approach: Approach;
  nutrition: string;
  goal: string;
  styles: string[];
  minutes: number;
  daysPerWeek: number;
}

export interface Programme {
  approach: Approach;
  /** Series semanales objetivo por músculo grande (rango). */
  weeklySets: [number, number];
  /** Máximo de series por ejercicio. */
  maxSetsPerExercise: number;
  /** Repeticiones en reserva objetivo en las series de trabajo. */
  rir: [number, number];
  /** Días de entrenamiento recomendados como máximo para este enfoque. */
  maxDays: number;
  /** Máximo de ejercicios por día. */
  maxExercises: number;
  /** Semanas de acumulación antes de una descarga. */
  mesocycleWeeks: number;
}

export function approachOf(health: Pick<HealthProfile, 'training_approach'>): Approach {
  const a = health.training_approach;
  return a === 'alta_intensidad' || a === 'alto_volumen' ? a : 'equilibrado';
}

/**
 * Decide el programa. Las personas principiantes o con precauciones nunca reciben alta
 * intensidad (llegar al fallo con técnica nueva no aporta y sube el riesgo).
 */
export function programmeFor(i: ProgrammeInput): Programme {
  let approach = i.approach;
  if (approach === 'alta_intensidad' && (i.beginner || i.cautious)) approach = 'equilibrado';
  if (approach === 'alto_volumen' && (i.beginner || i.cautious)) approach = 'equilibrado';

  // Base según nivel (Schoenfeld 2017: ≥10 series/semana rinden más; principiantes crecen con menos).
  let weeklySets: [number, number] = i.beginner ? [6, 10] : i.rank >= 2 ? [12, 18] : [10, 14];
  let maxSetsPerExercise = i.beginner ? 3 : 4;
  let rir: [number, number] = i.beginner || i.cautious ? [2, 3] : i.rank >= 2 ? [0, 2] : [1, 2];
  let maxExercises = 10;
  let maxDays = 6;
  let mesocycleWeeks = i.beginner ? 8 : 5;

  if (approach === 'alta_intensidad') {
    // Mentzer / Androulakis-Korakakis: dosis mínima efectiva, series duras y mucha recuperación.
    weeklySets = [4, 8];
    maxSetsPerExercise = 2;
    rir = [0, 1];
    maxExercises = 7;
    maxDays = 3;
    mesocycleWeeks = 6;
  } else if (approach === 'alto_volumen') {
    weeklySets = [Math.min(weeklySets[0] + 4, 16), Math.min(weeklySets[1] + 4, 22)];
    maxSetsPerExercise = 5;
    maxExercises = 11;
  }

  // Recuperación: dormir poco, estrés alto o déficit calórico recortan el volumen tolerable.
  let cut = 0;
  if (i.poorSleep) cut += 2;
  if (i.highStress) cut += 2;
  if (i.nutrition === 'deficit') cut += 1;
  if (i.nutrition === 'superavit' && !i.beginner) cut -= 1;
  if (cut !== 0) weeklySets = [Math.max(4, weeklySets[0] - cut), Math.max(6, weeklySets[1] - cut)];

  // Poco tiempo: priorizar compuestos y acotar ejercicios (Iversen 2021).
  if (i.minutes <= 30) maxExercises = Math.min(maxExercises, 5);
  else if (i.minutes <= 45) maxExercises = Math.min(maxExercises, 7);

  return { approach, weeklySets, maxSetsPerExercise, rir, maxDays, maxExercises, mesocycleWeeks };
}

/** Rango de series semanales útiles por músculo (orientativo: Israetel MEV a MAV; Schoenfeld 2017). */
const BASE_RANGE: Record<string, [number, number]> = {
  chest: [8, 16],
  lats: [8, 16],
  'middle back': [6, 14],
  shoulders: [8, 16],
  biceps: [6, 14],
  triceps: [6, 14],
  quadriceps: [8, 14],
  hamstrings: [6, 12],
  glutes: [6, 14],
  calves: [6, 12],
  abdominals: [6, 14],
};

export function weeklyRange(muscle: string, programme: Programme): [number, number] | null {
  const base = BASE_RANGE[muscle];
  if (!base) return null;
  // Escala el rango base (pensado para un intermedio: 10 a 14 series) al programa de la persona.
  const lo = Math.max(3, Math.round((base[0] * programme.weeklySets[0]) / 10));
  const hi = Math.max(lo + 2, Math.round((base[1] * programme.weeklySets[1]) / 14));
  return [lo, hi];
}

export const MUSCLE_LABEL_ES: Record<string, string> = {
  chest: 'Pecho',
  lats: 'Dorsales',
  'middle back': 'Espalda media',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Pantorrillas',
  abdominals: 'Abdomen',
};

export const TRACKED_MUSCLES = Object.keys(MUSCLE_LABEL_ES);

/** Proteína diaria (g): 1,6 a 2,2 g/kg (Morton 2018); en déficit 2,0 a 2,4 g/kg (Helms 2014). */
export function proteinTarget(weightKg: number | null, nutrition: string | null | undefined): [number, number] | null {
  if (!weightKg || weightKg < 30) return null;
  const [lo, hi] = nutrition === 'deficit' ? [2.0, 2.4] : [1.6, 2.2];
  return [Math.round(weightKg * lo), Math.round(weightKg * hi)];
}

/** Ejercicios que cargan el músculo en posición alargada (Maeo, Wolf, Nippard): se prefieren. */
export const LENGTHENED_BIAS =
  /overhead.*(tricep|extension)|incline.*curl|seated leg curl|romanian|stiff|preacher|fly|flye|butterfly|crossover|pulldown|pullover|hack squat|leg press|split squat|lunge|full squat|front squat|hip thrust|glute bridge/i;

/** Series, reps y descanso base según tipo de ejercicio y objetivo (Schoenfeld 2016, 2017, 2021). */
export interface Scheme {
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
}

export function scheme(opts: {
  compound: boolean;
  goal: string;
  styles: string[];
  programme: Programme;
  beginner: boolean;
  rank: number;
}): Scheme {
  const { compound, goal, styles, programme, beginner } = opts;
  const strength = styles.includes('fuerza') || goal === 'fuerza';
  const cap = programme.maxSetsPerExercise;
  const baseSets = programme.approach === 'alta_intensidad' ? 2 : programme.approach === 'alto_volumen' ? 4 : 3;
  const sets = Math.min(cap, baseSets);
  let s: Scheme;

  if (strength) {
    // Fuerza: cargas altas y descansos largos (ACSM 2009; Schoenfeld 2021).
    s = compound
      ? {
          sets: Math.min(cap, programme.approach === 'alta_intensidad' ? 2 : 4),
          reps_min: beginner ? 6 : 3,
          reps_max: beginner ? 8 : 6,
          rest_seconds: 180,
        }
      : { sets: Math.min(cap, 3), reps_min: 8, reps_max: 12, rest_seconds: 90 };
  } else if (programme.approach === 'alta_intensidad') {
    s = compound
      ? { sets, reps_min: 6, reps_max: 10, rest_seconds: 150 }
      : { sets, reps_min: 8, reps_max: 12, rest_seconds: 120 };
  } else if (compound) {
    // Compuestos: carga moderada-alta y 2 a 3 min de descanso (Schoenfeld 2016).
    s = { sets, reps_min: 6, reps_max: 10, rest_seconds: beginner ? 120 : 150 };
  } else {
    // Aislados y máquinas: rango más alto, menos fatiga sistémica (Schoenfeld 2017 JSCR).
    s = { sets, reps_min: 10, reps_max: 15, rest_seconds: 75 };
  }
  // Principiantes: técnica primero (ACSM 2009: 8 a 12 reps para empezar).
  if (beginner && !strength)
    s = { ...s, reps_min: 8, reps_max: Math.max(s.reps_max, 12), rest_seconds: Math.max(s.rest_seconds, 90) };
  return s;
}
