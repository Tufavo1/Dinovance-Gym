import { isMass, toKg, type LoadUnit } from '../progression/load-units';
import { summarize, type ExerciseSession } from '../progression/progression';
import { e1rm } from '../training/strength-math';

/** Un punto de la evolución de un ejercicio: una sesión real. */
export interface SeriesPoint {
  date: string;
  unit: LoadUnit;
  /** Carga de trabajo de la sesión, en su unidad. */
  load: number;
  /** Repeticiones de cada serie con esa carga. */
  reps: number[];
  totalReps: number;
  /** 1RM estimado (kg) de la mejor serie. Solo con cargas en kg o lb; null en niveles o placas. */
  e1rmKg: number | null;
}

/**
 * Evolución de un ejercicio dentro de un rango de fechas. Solo incluye sesiones con carga y
 * repeticiones registradas, y solo las de la unidad pedida: nunca mezcla kilos con niveles.
 */
export function exerciseSeries(
  sessions: ExerciseSession[],
  unit: LoadUnit,
  from: Date | null,
  to: Date | null,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const s of sessions) {
    if (s.unit !== unit) continue;
    const t = new Date(s.date).getTime();
    if (from && t < from.getTime()) continue;
    if (to && t > to.getTime()) continue;
    const sum = summarize(s);
    if (!sum) continue;
    let best: number | null = null;
    if (isMass(unit)) {
      for (let i = 0; i < sum.reps.length; i++) {
        // Con más de 12 repeticiones la estimación de 1RM deja de ser fiable.
        if (sum.reps[i] > 12) continue;
        const kg = toKg(sum.load, unit);
        if (kg === null || kg <= 0) continue;
        best = Math.max(best ?? 0, e1rm(kg, sum.reps[i], sum.rir[i] ?? 0));
      }
    }
    out.push({
      date: s.date,
      unit,
      load: sum.load,
      reps: sum.reps,
      totalReps: sum.reps.reduce((a, b) => a + b, 0),
      e1rmKg: best === null ? null : Math.round(best * 10) / 10,
    });
  }
  return out;
}

/** Unidades en las que hay sesiones registradas, la más reciente primero. */
export function unitsOf(sessions: ExerciseSession[]): LoadUnit[] {
  const seen: LoadUnit[] = [];
  for (const s of [...sessions].reverse()) if (summarize(s) && !seen.includes(s.unit)) seen.push(s.unit);
  return seen;
}

/** Puntos "x,y" de una línea para un SVG de 100 × 28, o cadena vacía si hay menos de 2 valores. */
export function sparkPoints(values: number[]): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => `${((i / (values.length - 1)) * 100).toFixed(1)},${(26 - ((v - min) / span) * 24).toFixed(1)}`)
    .join(' ');
}
