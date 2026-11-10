import type { Exercise } from '../models';
import { scheme } from '../evidence/programming';
import type { AthleteProfile } from './athlete-profile';

export interface Prescription {
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
}

/** Minutos de cardio al final de la sesión según el objetivo. */
export function cardioMinutes(p: AthleteProfile): number {
  if (p.goals.includes('perder_grasa') || p.goals.includes('resistencia')) {
    return p.beginner ? 15 : 20;
  }
  return 10;
}

function cardioNote(ex: Exercise, p: AthleteProfile): string {
  const min = cardioMinutes(p);
  if (ex.name === 'Walking, Treadmill') {
    return `${min} minutos caminando con inclinación (8 a 12 %) a 5-6 km/h`;
  }
  if (ex.name === 'Stairmaster' || ex.name === 'Step Mill') {
    return `${min} minutos a ritmo constante, sin apoyarte en las barandas`;
  }
  return `${min} minutos a ritmo moderado: puedes hablar, pero no cantar`;
}

/** Series, repeticiones y descanso de un ejercicio según el perfil y el objetivo. */
export function prescribe(ex: Exercise, p: AthleteProfile): Prescription {
  const cat = ex.category;
  if (cat === 'stretching') {
    return { sets: 1, reps_min: 1, reps_max: 1, rest_seconds: 0, notes: 'Mantén 30 segundos por lado, sin rebotes' };
  }
  if (cat === 'cardio') {
    return { sets: 1, reps_min: 1, reps_max: 1, rest_seconds: 0, notes: cardioNote(ex, p) };
  }
  if (cat === 'plyometrics') {
    return { sets: 3, reps_min: 6, reps_max: 8, rest_seconds: 90, notes: 'Aterriza suave y con control' };
  }
  if (cat === 'olympic weightlifting') {
    return { sets: 5, reps_min: 2, reps_max: 3, rest_seconds: 120, notes: 'Cargas ligeras: prioriza la técnica' };
  }

  const compound = ex.mechanic === 'compound';
  // Series, repeticiones y descanso según la evidencia (ver evidence/programming.ts).
  let r: Prescription = {
    ...scheme({
      compound,
      goal: p.goal,
      styles: p.styles,
      programme: p.programme,
      beginner: p.beginner,
      rank: p.rank,
    }),
    notes: null,
  };

  // Abdomen: más repeticiones y descanso corto, sin importar el objetivo.
  if (ex.primary_muscles.includes('abdominals')) {
    r = { ...r, sets: Math.min(r.sets, 3), reps_min: 12, reps_max: 20, rest_seconds: 60 };
  }

  // Pantorrillas: responden mejor a más repeticiones y recorrido completo.
  if (ex.primary_muscles.includes('calves'))
    r = { ...r, reps_min: 10, reps_max: 20, rest_seconds: Math.min(r.rest_seconds, 90) };

  // Primeras semanas con poco hábito: 2 series por ejercicio y vuelven a 3 después (ACSM 2009).
  if (p.starterVolume) r = { ...r, sets: Math.min(r.sets, 2) };
  if (p.poorSleep && r.sets > 3) r = { ...r, sets: 3 };

  // Abdominales estáticos (plancha) se miden en segundos.
  if (/plank|bridge/i.test(ex.name) && ex.primary_muscles.includes('abdominals')) {
    r = { ...r, reps_min: 1, reps_max: 1, notes: p.beginner ? 'Mantén 20 a 30 segundos' : 'Mantén 30 a 45 segundos' };
  }
  return r;
}

/** Minutos aproximados que toma un ejercicio (trabajo + descanso + cambio de máquina). */
export function estimateMinutes(ex: Exercise, r: Prescription, p: AthleteProfile): number {
  if (ex.category === 'stretching') return 1;
  if (ex.category === 'cardio') return cardioMinutes(p);
  const workSeconds = r.reps_min === 1 && r.reps_max === 1 ? 35 : r.reps_max * 3.5;
  return (r.sets * (workSeconds + r.rest_seconds)) / 60 + 1.5;
}
