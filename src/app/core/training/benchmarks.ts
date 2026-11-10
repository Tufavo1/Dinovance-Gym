import type { StrengthMark, StrengthMarks } from '../models';
import { e1rm } from './strength-math';

/**
 * Marcas de fuerza de la persona (PR) y lo que se deduce de ellas.
 *
 * - RM estimado: Brzycki hasta 10 repeticiones (LeSuer 1997). Con más de 12 repeticiones la
 *   estimación deja de ser confiable y la marca no se usa para calcular cargas.
 * - Nivel: se compara el RM por kilo de peso corporal con las tablas de estándares de fuerza
 *   más usadas (Rippetoe y Kilgore; ExRx). Son referencias prácticas, no un diagnóstico.
 */

export const MAX_RELIABLE_REPS = 12;

/** Lo mínimo para considerar una marca real. */
const KG_RANGE: [number, number] = [5, 600];
const REPS_RANGE: [number, number] = [1, 60];

/** Limpia lo que viene de la base o del formulario: solo levantamientos conocidos y números válidos. */
export function sanitizeMarks(raw: unknown, allowed: string[]): StrengthMarks {
  const out: StrengthMarks = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of allowed) {
    const m = (raw as Record<string, unknown>)[key] as Partial<StrengthMark> | undefined;
    if (!m || typeof m !== 'object') continue;
    const reps = Number(m.reps);
    if (!Number.isFinite(reps) || reps < REPS_RANGE[0] || reps > REPS_RANGE[1]) continue;
    if (m.kg === undefined || m.kg === null) {
      out[key] = { reps: Math.round(reps) };
      continue;
    }
    const kg = Number(m.kg);
    if (!Number.isFinite(kg) || kg < KG_RANGE[0] || kg > KG_RANGE[1]) continue;
    out[key] = { kg: Math.round(kg * 2) / 2, reps: Math.round(reps) };
  }
  return out;
}

/** RM estimado (kg) de una marca con peso. Null si no hay peso o si hizo demasiadas repeticiones. */
export function markE1rm(m: StrengthMark | undefined): number | null {
  if (!m || m.kg === undefined || m.reps > MAX_RELIABLE_REPS) return null;
  return e1rm(m.kg, m.reps, 0);
}

/** RM por kilo de peso corporal a partir del cual cada nivel empieza (hombres; mujeres ×0,65). */
const STANDARDS: Record<string, { intermediate: number; advanced: number }> = {
  sentadilla: { intermediate: 1.0, advanced: 2.0 },
  press_pecho: { intermediate: 0.75, advanced: 1.5 },
  bisagra: { intermediate: 1.25, advanced: 2.25 },
  press_hombro: { intermediate: 0.5, advanced: 1.0 },
  remo: { intermediate: 0.7, advanced: 1.1 },
};
const FEMALE = 0.65;

const BODYWEIGHT_STANDARDS: Record<string, { intermediate: number; advanced: number }> = {
  dominadas: { intermediate: 5, advanced: 12 },
  flexiones: { intermediate: 15, advanced: 35 },
};

export interface StrengthAssessment {
  /** 0 principiante, 1 intermedio, 2 avanzado según las marcas. */
  rank: number;
  /** Cuántas marcas se usaron. */
  used: number;
}

/** Nivel de fuerza deducido de las marcas. Null si no hay ninguna utilizable. */
export function assessStrength(
  marks: StrengthMarks | null | undefined,
  bodyweightKg: number | null,
  gender: string | null,
): StrengthAssessment | null {
  if (!marks) return null;
  const sex = gender === 'femenino' ? FEMALE : 1;
  const ranks: number[] = [];
  for (const [lift, std] of Object.entries(STANDARDS)) {
    const rm = markE1rm(marks[lift]);
    if (rm === null || !bodyweightKg) continue;
    const ratio = rm / bodyweightKg / sex;
    ranks.push(ratio >= std.advanced ? 2 : ratio >= std.intermediate ? 1 : 0);
  }
  for (const [lift, std] of Object.entries(BODYWEIGHT_STANDARDS)) {
    const reps = marks[lift]?.reps;
    if (reps === undefined) continue;
    const r = reps / (gender === 'femenino' ? 2 : 1);
    ranks.push(r >= std.advanced ? 2 : r >= std.intermediate ? 1 : 0);
  }
  if (ranks.length === 0) return null;
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  return { rank: Math.min(2, Math.max(0, Math.round(mean))), used: ranks.length };
}

/** Qué levantamientos con marca informan la carga de cada patrón de movimiento. */
export const LIFT_GROUPS: Record<string, string[]> = {
  sentadilla: ['sentadilla', 'bisagra'],
  prensa: ['sentadilla', 'bisagra'],
  zancada: ['sentadilla', 'bisagra'],
  bisagra: ['bisagra', 'sentadilla'],
  puente_gluteo: ['bisagra', 'sentadilla'],
  extension_cuadriceps: ['sentadilla'],
  curl_femoral: ['bisagra'],
  press_pecho: ['press_pecho'],
  press_inclinado: ['press_pecho'],
  aperturas: ['press_pecho'],
  press_hombro: ['press_hombro', 'press_pecho'],
  elevacion_lateral: ['press_hombro'],
  jalon: ['remo'],
  remo: ['remo'],
};

// ---------- Frecuencia por grupo muscular ----------

export const FREQUENCY_MUSCLES: Record<string, string[]> = {
  pecho: ['chest'],
  espalda: ['lats', 'middle back'],
  hombros: ['shoulders'],
  brazos: ['biceps', 'triceps'],
  piernas: ['quadriceps', 'hamstrings', 'calves'],
  gluteos: ['glutes'],
  abdomen: ['abdominals'],
};

/** Solo valores de 1 a 4 de los grupos conocidos. */
export function sanitizeFrequency(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(FREQUENCY_MUSCLES)) {
    const n = Number((raw as Record<string, unknown>)[key]);
    if (Number.isInteger(n) && n >= 1 && n <= 4) out[key] = n;
  }
  return out;
}

export interface FrequencyPlan {
  /** Frecuencia que se usará por grupo (la pedida, con el mínimo de 2 salvo enfoque de dosis mínima). */
  target: Record<string, number>;
  /** Grupos que pidieron 1 vez y se subieron a 2. */
  raised: string[];
}

/**
 * La evidencia (Schoenfeld 2016, 2019) muestra que entrenar un músculo 2 veces por semana
 * rinde igual o más que 1 vez; por eso 1 se sube a 2, salvo en el enfoque de dosis mínima.
 */
export function planFrequency(pref: Record<string, number>, minimalDose: boolean): FrequencyPlan {
  const target: Record<string, number> = {};
  const raised: string[] = [];
  for (const [g, n] of Object.entries(pref)) {
    if (n < 2 && !minimalDose) {
      target[g] = 2;
      raised.push(g);
    } else target[g] = n;
  }
  return { target, raised };
}

/** Frecuencia media pedida en los grupos grandes (los que definen la distribución semanal). */
export function bigGroupFrequency(target: Record<string, number>): number | null {
  const vals = ['pecho', 'espalda', 'hombros', 'piernas', 'gluteos']
    .map((g) => target[g])
    .filter((n) => n !== undefined);
  return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
}
