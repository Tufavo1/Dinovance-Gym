import type { Exercise } from '../models';

interface Item {
  exercise_id: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
}

/** Minutos aproximados de un día (calentamiento + series, descansos y cambios de máquina). */
export function estimateMinutesFor(items: Item[], byId: Map<string, Exercise>): number {
  let min = 5;
  for (const it of items) {
    const ex = byId.get(it.exercise_id);
    if (ex?.category === 'stretching') {
      min += 1;
    } else if (ex?.category === 'cardio') {
      const m = /(\d+)\s*minutos/.exec(it.notes ?? '');
      min += m ? Number(m[1]) : 10;
    } else {
      const work = it.reps_min === 1 && it.reps_max === 1 ? 35 : it.reps_max * 3.5;
      min += (it.sets * (work + it.rest_seconds)) / 60 + 1.5;
    }
  }
  return Math.round(min / 5) * 5;
}
