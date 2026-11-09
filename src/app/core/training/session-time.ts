/** Tiempos reales de la sesión, para mostrar el resumen y analizar la duración de las rutinas. */

export interface TimedSet {
  exercise_id: string;
  duration_s?: number | null;
  rest_s?: number | null;
}

export interface ExerciseTime {
  exercise_id: string;
  sets: number;
  workS: number;
  restS: number;
  totalS: number;
}

/** Tiempo por ejercicio (trabajo + descanso real), en el orden en que se hicieron. */
export function exerciseTimes(sets: TimedSet[]): ExerciseTime[] {
  const map = new Map<string, ExerciseTime>();
  for (const s of sets) {
    const t = map.get(s.exercise_id) ?? { exercise_id: s.exercise_id, sets: 0, workS: 0, restS: 0, totalS: 0 };
    const work = Math.max(0, s.duration_s ?? 0);
    const rest = Math.max(0, s.rest_s ?? 0);
    t.sets += 1;
    t.workS += work;
    t.restS += rest;
    t.totalS += work + rest;
    map.set(s.exercise_id, t);
  }
  return [...map.values()];
}

/** Segundos entre dos marcas de tiempo (ms), acotados a 0..3600. */
export function secondsBetween(fromMs: number | null, toMs: number): number {
  if (fromMs === null) return 0;
  return Math.min(3600, Math.max(0, Math.round((toMs - fromMs) / 1000)));
}

/** mm:ss (o h:mm:ss) para cronómetros. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
