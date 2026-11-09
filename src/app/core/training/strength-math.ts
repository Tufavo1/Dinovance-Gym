/**
 * Matemática de fuerza basada en evidencia, sin tests de 1RM real:
 *
 * - Escala RPE basada en RIR (Zourdos et al., 2016; Tuchscherer): RPE = 10 − RIR.
 * - e1RM con las repeticiones totales posibles (realizadas + RIR):
 *     Brzycki  (≤ 10 reps):  peso / (1.0278 − 0.0278 × reps)
 *     Epley    (> 10 reps):  peso × (1 + reps / 30)
 * - %1RM por repeticiones al fallo (tabla de conversión de fuerza, interpolada).
 * - Métricas de la sesión: tonelaje, series efectivas (RIR ≤ 3 / RPE ≥ 7) e INOL.
 */

/** RPE equivalente a un RIR (0 = al fallo = RPE 10). */
export function rpeFromRir(rir: number): number {
  return Math.max(1, 10 - rir);
}

/** Repeticiones al fallo → % del 1RM. */
const PCT_TABLE: [number, number][] = [
  [1, 100],
  [2, 95],
  [3, 92],
  [4, 89],
  [5, 86],
  [6, 83],
  [8, 78],
  [10, 74],
  [12, 70],
  [15, 65],
];

/** % del 1RM que se puede mover para hacer `reps` repeticiones al fallo (interpolado). */
export function pctOf1RM(reps: number): number {
  if (reps <= 1) return 100;
  for (let i = 1; i < PCT_TABLE.length; i++) {
    const [r1, p1] = PCT_TABLE[i - 1];
    const [r2, p2] = PCT_TABLE[i];
    if (reps <= r2) return p1 + ((p2 - p1) * (reps - r1)) / (r2 - r1);
  }
  // Más allá de 15 repeticiones: ~1,5 % menos por repetición, con un piso razonable.
  const [rLast, pLast] = PCT_TABLE[PCT_TABLE.length - 1];
  return Math.max(40, pLast - 1.5 * (reps - rLast));
}

/** 1RM estimado a partir de una serie (repeticiones totales = realizadas + RIR). */
export function e1rm(weightKg: number, reps: number, rir = 0): number {
  const total = Math.max(1, reps + Math.max(0, rir));
  if (total <= 10) return weightKg / (1.0278 - 0.0278 * total);
  return weightKg * (1 + total / 30);
}

/** Carga para hacer `reps` repeticiones dejando `rir` en reserva, dado un e1RM. */
export function loadFor(e1rmKg: number, reps: number, rir: number): number {
  return (e1rmKg * pctOf1RM(reps + rir)) / 100;
}

export interface LoggedSet {
  exercise_id: string;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
}

export interface SessionMetrics {
  /** Σ repeticiones × peso (kg). */
  tonnage: number;
  /** Series con RIR ≤ 3 (RPE ≥ 7). */
  effectiveSets: number;
  /** INOL promedio por ejercicio con carga. */
  inol: number | null;
}

/**
 * INOL de un ejercicio = Σ repeticiones / (100 − %1RM), con el %1RM de cada serie respecto
 * del mejor e1RM de la sesión en ese ejercicio.
 */
export function sessionMetrics(sets: LoggedSet[]): SessionMetrics {
  let tonnage = 0;
  let effectiveSets = 0;
  const byExercise = new Map<string, LoggedSet[]>();
  for (const s of sets) {
    if (s.reps && s.weight_kg) tonnage += s.reps * s.weight_kg;
    if (s.rir !== null && s.rir <= 3) effectiveSets++;
    if (s.reps && s.weight_kg) {
      const list = byExercise.get(s.exercise_id) ?? [];
      list.push(s);
      byExercise.set(s.exercise_id, list);
    }
  }

  const inols: number[] = [];
  for (const list of byExercise.values()) {
    const best = Math.max(...list.map((s) => e1rm(s.weight_kg!, s.reps!, s.rir ?? 0)));
    let inol = 0;
    for (const s of list) {
      const pct = Math.min(99, (s.weight_kg! / best) * 100);
      inol += s.reps! / (100 - pct);
    }
    inols.push(inol);
  }
  return {
    tonnage: Math.round(tonnage),
    effectiveSets,
    inol: inols.length ? Math.round((inols.reduce((a, b) => a + b, 0) / inols.length) * 100) / 100 : null,
  };
}

/** Lectura del INOL promedio por ejercicio. */
export function inolLabel(inol: number | null): string {
  if (inol === null) return '';
  if (inol < 0.5) return 'Suave';
  if (inol <= 1) return 'Óptimo';
  return 'Muy exigente';
}
