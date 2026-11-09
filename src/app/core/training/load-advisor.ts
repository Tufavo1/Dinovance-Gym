import type { Exercise } from '../models';
import { patternOf } from '../routine/rules';
import { e1rm, loadFor, pctOf1RM } from './strength-math';

/**
 * Recomendación de carga para ENTRENAR (no para competir). Siempre conservadora:
 *
 * - Con historial: e1RM de la mejor serie de la última sesión usando repeticiones + RIR
 *   (Brzycki/Epley) y la tabla de %1RM para el rango de hoy dejando el RIR objetivo.
 *   El salto por sesión se limita (+5 % / +1 escalón) para que la técnica no se pierda.
 * - Primera vez: e1RM estimado desde el peso corporal, sexo, experiencia y edad, con un 10 %
 *   extra de margen. La persona ajusta tras la primera serie según su RIR.
 */

export type LoadMode = 'total' | 'mancuerna' | 'contrapeso' | 'corporal' | 'tiempo';

export interface LoadAdvice {
  kg: number | null;
  mode: LoadMode;
  step: number;
  /** Explicación de una línea. */
  reason: string;
}

export interface LoadHistoryEntry {
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
  created_at: string;
}

export interface LoadAthlete {
  bodyweightKg: number | null;
  gender: string | null;
  rank: number;
  beginner: boolean;
  senior: boolean;
  cautious: boolean;
}

export interface LoadTarget {
  reps_min: number;
  reps_max: number;
}

/** RIR objetivo: principiantes y personas con precauciones dejan más margen. */
export function rirTarget(a: Pick<LoadAthlete, 'beginner' | 'cautious'>): [number, number] {
  return a.beginner || a.cautious ? [2, 3] : [1, 2];
}

const LOWER = new Set([
  'sentadilla',
  'prensa',
  'zancada',
  'bisagra',
  'puente_gluteo',
  'extension_cuadriceps',
  'curl_femoral',
  'abductor',
  'aductor',
  'pantorrilla',
]);

/** Fracción del peso corporal que mueve un hombre principiante para ~10 repeticiones al fallo. */
const RATIOS: Record<string, { total?: number; maquina?: number; mancuerna?: number }> = {
  sentadilla: { total: 0.5, maquina: 0.6, mancuerna: 0.15 },
  prensa: { total: 1.0, maquina: 1.0 },
  zancada: { total: 0.3, mancuerna: 0.1 },
  bisagra: { total: 0.5, mancuerna: 0.15 },
  puente_gluteo: { total: 0.5, maquina: 0.5 },
  extension_cuadriceps: { maquina: 0.3 },
  curl_femoral: { maquina: 0.25 },
  abductor: { maquina: 0.35 },
  aductor: { maquina: 0.3 },
  pantorrilla: { maquina: 0.5, total: 0.4, mancuerna: 0.15 },
  press_pecho: { total: 0.4, maquina: 0.4, mancuerna: 0.12 },
  press_inclinado: { total: 0.33, maquina: 0.33, mancuerna: 0.1 },
  aperturas: { maquina: 0.2, mancuerna: 0.06 },
  press_hombro: { total: 0.25, maquina: 0.25, mancuerna: 0.08 },
  elevacion_lateral: { maquina: 0.05, mancuerna: 0.04 },
  elevacion_frontal: { maquina: 0.05, mancuerna: 0.05 },
  deltoide_posterior: { maquina: 0.1, mancuerna: 0.04 },
  jalon: { maquina: 0.45 },
  remo: { total: 0.4, maquina: 0.4, mancuerna: 0.15 },
  encogimiento: { total: 0.4, maquina: 0.4, mancuerna: 0.15 },
  curl: { total: 0.15, maquina: 0.12, mancuerna: 0.06 },
  curl_martillo: { maquina: 0.12, mancuerna: 0.07 },
  curl_predicador: { total: 0.12, maquina: 0.12, mancuerna: 0.05 },
  pushdown: { maquina: 0.15 },
  extension_triceps: { total: 0.12, maquina: 0.12, mancuerna: 0.06 },
  crunch: { maquina: 0.2 },
};
const DEFAULT_RATIO = { total: 0.2, maquina: 0.2, mancuerna: 0.06 };

const isPullUp = (name: string) => /pull-?ups?|chin-?up/i.test(name);

export function loadModeOf(ex: Exercise, timed: boolean, assisted: boolean): LoadMode {
  if (timed || ex.category === 'stretching' || ex.category === 'cardio') return 'tiempo';
  if (isPullUp(ex.name)) return assisted ? 'contrapeso' : 'corporal';
  if (!ex.equipment || ex.equipment === 'body only') return 'corporal';
  if (ex.equipment === 'dumbbell' || ex.equipment === 'kettlebells') return 'mancuerna';
  return 'total';
}

export function loadStep(mode: LoadMode, kg: number): number {
  if (mode === 'mancuerna') return kg < 10 ? 1 : 2;
  if (mode === 'contrapeso') return 5;
  return 2.5;
}

function roundTo(kg: number, step: number): number {
  return Math.max(step, Math.round(kg / step) * step);
}

export function adviseLoad(
  ex: Exercise,
  target: LoadTarget,
  athlete: LoadAthlete,
  history: LoadHistoryEntry[],
  opts: { timed?: boolean; assisted?: boolean } = {},
): LoadAdvice {
  const mode = loadModeOf(ex, !!opts.timed, !!opts.assisted);
  const bw = athlete.bodyweightKg ?? (athlete.gender === 'femenino' ? 60 : 70);
  const [rirLow] = rirTarget(athlete);

  if (mode === 'tiempo') return { kg: null, mode, step: 0, reason: '' };
  if (mode === 'corporal') {
    return { kg: null, mode, step: 0, reason: 'Con tu peso corporal. Si te sobran muchas, hazlas más lento.' };
  }

  const pattern = patternOf(ex.name, 'otro');
  const lastWorkout = history.find((h) => h.weight_kg !== null && h.reps)?.workout_id;
  const last = history.filter((h) => h.workout_id === lastWorkout && h.weight_kg !== null && h.reps);

  // ---- Contrapeso (dominadas asistidas): menos asistencia = más difícil ----
  if (mode === 'contrapeso') {
    if (last.length > 0) {
      const w = last[0].weight_kg!;
      const minReps = Math.min(...last.map((h) => h.reps!));
      const rir = last[last.length - 1].rir ?? rirLow;
      if (rir <= 0 || minReps < target.reps_min) {
        return { kg: w + 5, mode, step: 5, reason: 'Fue muy exigente: suma 5 kg de asistencia.' };
      }
      if (minReps >= target.reps_max && rir >= rirLow) {
        return { kg: Math.max(0, w - 5), mode, step: 5, reason: 'Lo lograste con margen: quita 5 kg de asistencia.' };
      }
      return { kg: w, mode, step: 5, reason: 'Mantén la asistencia y busca 1 repetición más.' };
    }
    const assist = athlete.beginner ? 0.6 : athlete.rank >= 2 ? 0.25 : 0.4;
    const extra = athlete.gender === 'femenino' ? 0.1 : 0;
    return {
      kg: roundTo(bw * Math.min(0.8, assist + extra), 5),
      mode,
      step: 5,
      reason: 'Asistencia de partida. Si te sobran repeticiones, bájala.',
    };
  }

  // ---- Con historial: e1RM con repeticiones + RIR ----
  if (last.length > 0) {
    const lastWeight = Math.max(...last.map((h) => h.weight_kg!));
    const best = Math.max(...last.map((h) => e1rm(h.weight_kg!, h.reps!, h.rir ?? rirLow)));
    const minReps = Math.min(...last.map((h) => h.reps!));
    const lastRir = last[last.length - 1].rir;
    const step = loadStep(mode, lastWeight);

    let kg = roundTo(loadFor(best, target.reps_max, rirLow), step);
    // Progresión doble: si completó el máximo del rango con el RIR objetivo, sube al menos un escalón.
    const hitTop = minReps >= target.reps_max && (lastRir ?? rirLow) >= rirLow;
    if (hitTop) kg = Math.max(kg, lastWeight + step);
    // Entrenar, no competir: como máximo +5 % (o un escalón) por sesión.
    const maxUp = Math.max(lastWeight + step, roundTo(lastWeight * 1.05, step));
    if (kg > maxUp) kg = maxUp;

    let reason: string;
    if ((lastRir !== null && lastRir <= 0) || minReps < target.reps_min) {
      kg = Math.min(kg, roundTo(lastWeight * 0.92, step));
      reason = 'La última vez llegaste al límite: bajamos un poco para cuidar la técnica.';
    } else if (kg > lastWeight) {
      reason = `Te quedó margen la última vez: sube a ${kg} kg.`;
    } else if (kg < lastWeight) {
      reason = 'Ajustamos a tu rango de hoy dejando repeticiones en reserva.';
    } else {
      reason = 'Mantén el peso y busca 1 repetición más por serie.';
    }
    return { kg, mode, step, reason };
  }

  // ---- Primera vez: e1RM estimado desde el perfil ----
  const r = RATIOS[pattern] ?? DEFAULT_RATIO;
  const kind = mode === 'mancuerna' ? 'mancuerna' : ex.equipment === 'barbell' ? 'total' : 'maquina';
  const ratio = r[kind] ?? r.total ?? r.maquina ?? DEFAULT_RATIO[kind];

  const lower = LOWER.has(pattern);
  const sex =
    athlete.gender === 'femenino' ? (lower ? 0.75 : 0.55) : athlete.gender === 'masculino' ? 1 : lower ? 0.85 : 0.7;
  const level = athlete.beginner ? 1 : athlete.rank >= 2 ? 1.7 : 1.35;
  const age = athlete.senior ? 0.75 : 1;
  const care = athlete.cautious ? 0.85 : 1;

  const tenRm = bw * ratio * sex * level * age * care;
  const estimated1rm = tenRm / (pctOf1RM(10) / 100);
  let kg = loadFor(estimated1rm, target.reps_max, rirLow) * 0.9; // 10 % extra de margen la primera vez

  const step = loadStep(mode, kg);
  kg = roundTo(kg, step);
  if (ex.equipment === 'barbell' && !/smith/i.test(ex.name)) kg = Math.max(20, kg); // barra olímpica
  return {
    kg,
    mode,
    step,
    reason: 'Es un peso de partida: si la 1.ª serie se siente muy fácil o muy difícil, ajústalo.',
  };
}

/**
 * Ajuste en vivo entre series (autorregulación): si el RIR real se aleja del objetivo,
 * sugiere cambiar el peso de la siguiente serie. Devuelve los kg a sumar (negativo = bajar).
 */
export function adjustAfterSet(rir: number, target: [number, number], mode: LoadMode, kg: number): number {
  if (mode === 'tiempo' || mode === 'corporal') return 0;
  const step = loadStep(mode, kg);
  const dir = mode === 'contrapeso' ? -1 : 1;
  if (rir < target[0]) return -dir * step; // más pesado de lo previsto
  if (rir > target[1]) return dir * step; // más liviano de lo previsto
  return 0;
}
