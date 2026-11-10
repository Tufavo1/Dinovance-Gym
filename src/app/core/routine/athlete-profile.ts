import type { HealthProfile, InjuryRecord } from '../models';
import { approachOf, programmeFor, type Programme } from '../evidence/programming';
import { LEVEL_RANK } from './rules';
import type { StrengthMarks } from '../models';
import {
  assessStrength,
  planFrequency,
  sanitizeFrequency,
  sanitizeMarks,
  type FrequencyPlan,
  type StrengthAssessment,
} from '../training/benchmarks';
import { STRENGTH_LIFTS } from '../models';

/**
 * Perfil del atleta: se calcula PRIMERO a partir del historial, la salud y los hábitos, y
 * decide con qué nivel, volumen y precauciones parte la rutina. El objetivo y la modalidad se
 * aplican después, siempre dentro de estos límites.
 */
export interface AthleteProfile {
  /** Nivel declarado (0 principiante, 1 intermedio, 2 avanzado). */
  rank: number;
  /** Nivel máximo de dificultad permitido para los ejercicios. */
  maxRank: number;
  /** Trabaja con volumen y cargas de principiante. */
  beginner: boolean;
  /** Vuelve tras una pausa larga o lo pidió explícitamente. */
  returning: boolean;
  /** Pausa entre 1 y 6 meses (solo limita la dificultad). */
  midLayoff: boolean;
  /** Pausa de más de 6 meses con experiencia previa. */
  longLayoff: boolean;
  /** Condición médica, embarazo, posparto o 60+ años: sin alto impacto ni técnica compleja. */
  cautious: boolean;
  pregnant: boolean;
  postpartum: boolean;
  senior: boolean;
  poorSleep: boolean;
  sedentary: boolean;
  /** Primeras semanas con menos series (sedentario y principiante). */
  starterVolume: boolean;
  /** Tiene base deportiva aunque nunca haya hecho pesas. */
  athleticBase: boolean;
  gender: string | null;
  goals: string[];
  goal: string;
  styles: string[];
  daysPerWeek: number;
  minutes: number;
  activeInjuryAreas: Set<string>;
  allInjuryAreas: Set<string>;
  recoveredSurgeries: number;
  /** Lesión activa en rodilla o tobillo: el cardio debe ser de bajo impacto. */
  lowerLimbInjury: boolean;
  highStress: boolean;
  nutrition: string;
  /** Programación basada en evidencia (volumen, RIR, series máximas). */
  programme: Programme;
  /** Marcas de fuerza válidas (PR) que dio la persona. */
  marks: StrengthMarks;
  /** Nivel de fuerza deducido de las marcas (solo informativo: no cambia el nivel declarado). */
  strength: StrengthAssessment | null;
  /** Frecuencia semanal pedida por grupo muscular, ya ajustada a la evidencia. */
  frequency: FrequencyPlan;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function buildAthleteProfile(
  health: HealthProfile,
  injuries: InjuryRecord[],
  age: number | null,
  gender: string | null,
  weightKg: number | null = null,
): AthleteProfile {
  const rank = LEVEL_RANK[health.experience ?? ''] ?? 0;
  const goal = health.goal ?? 'salud_general';
  const goals = [goal, ...(health.secondary_goals ?? [])];

  const layoff = health.last_trained ?? null;
  const longLayoff = layoff === 'mas_6_meses' && rank > 0;
  const midLayoff = layoff === 'entre_1_y_6_meses' && rank > 1;
  const pregnant = health.pregnancy_status === 'embarazada';
  const postpartum = health.pregnancy_status === 'posparto';
  const senior = age !== null && age >= 60;
  const returning = goals.includes('retomar') || longLayoff;
  const beginner = rank === 0 || returning;
  const cautious = !!health.has_medical_condition || pregnant || postpartum || senior;

  let maxRank = rank;
  if (returning || pregnant) maxRank = 0;
  else if (midLayoff || cautious) maxRank = Math.min(rank, 1);

  const sedentary = health.activity_level === 'sedentario';
  const past = health.past_activities ?? [];
  const athleticBase =
    rank === 0 && past.some((a) => a !== 'ninguna' && a !== 'clases') && health.activity_level !== 'sedentario';

  const active = injuries.filter((i) => i.status === 'activa');
  const activeInjuryAreas = new Set(active.map((i) => i.body_area));

  const poorSleep = health.sleep_hours === 'menos_5' || health.sleep_hours === 'entre_5_y_6';
  const highStress = health.stress_level === 'alto';
  const daysPerWeek = clamp(health.days_per_week ?? 3, 2, 6);
  const minutes = clamp(health.session_minutes ?? 60, 20, 120);
  const styles = health.training_styles?.length ? health.training_styles : ['no_se'];
  const programme = programmeFor({
    rank,
    beginner,
    cautious,
    poorSleep,
    highStress,
    approach: approachOf(health),
    nutrition: health.nutrition_phase ?? 'no_se',
    goal,
    styles,
    minutes,
    daysPerWeek,
  });

  const marks = sanitizeMarks(
    health.strength_marks,
    STRENGTH_LIFTS.map((l) => l.value),
  );
  const frequency = planFrequency(sanitizeFrequency(health.muscle_frequency), programme.approach === 'alta_intensidad');

  return {
    marks,
    strength: assessStrength(marks, weightKg, gender),
    frequency,
    rank,
    maxRank,
    beginner,
    returning,
    midLayoff,
    longLayoff,
    cautious,
    pregnant,
    postpartum,
    senior,
    poorSleep,
    highStress,
    nutrition: health.nutrition_phase ?? 'no_se',
    programme,
    sedentary,
    starterVolume: beginner && sedentary && !athleticBase,
    athleticBase,
    gender,
    goals,
    goal,
    styles,
    daysPerWeek: Math.min(daysPerWeek, programme.maxDays),
    minutes,
    activeInjuryAreas,
    allInjuryAreas: new Set(injuries.map((i) => i.body_area)),
    recoveredSurgeries: injuries.filter((i) => i.status !== 'activa' && i.kind === 'cirugia').length,
    lowerLimbInjury: activeInjuryAreas.has('rodilla') || activeInjuryAreas.has('tobillo'),
  };
}
