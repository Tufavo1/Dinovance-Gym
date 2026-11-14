import type { ExerciseSession } from '../progression/progression';
import { goalProgress } from '../tracking.service';
import { exerciseSeries, sparkPoints, unitsOf } from './exercise-series';

const s = (date: string, unit: 'kg' | 'nivel', load: number, reps: number[]): ExerciseSession => ({
  workoutId: date,
  date,
  unit,
  sets: reps.map((r) => ({ reps: r, load, rir: 2 })),
});

const SESSIONS = [
  s('2026-01-05', 'kg', 30, [10, 9, 8]),
  s('2026-01-12', 'kg', 30, [12, 12, 12]),
  s('2026-01-19', 'nivel', 5, [15, 14, 12]),
  s('2026-01-26', 'kg', 32.5, [9, 8, 8]),
];

describe('evolución por ejercicio', () => {
  it('no mezcla kilos con niveles y respeta el filtro de fechas', () => {
    const kg = exerciseSeries(SESSIONS, 'kg', null, null);
    expect(kg.map((p) => p.load)).toEqual([30, 30, 32.5]);
    expect(kg[1].totalReps).toBe(36);
    expect(kg[0].e1rmKg).toBeGreaterThan(30);

    const levels = exerciseSeries(SESSIONS, 'nivel', null, null);
    expect(levels).toHaveLength(1);
    expect(levels[0].e1rmKg).toBeNull();

    const january = exerciseSeries(SESSIONS, 'kg', new Date('2026-01-10'), new Date('2026-01-20'));
    expect(january.map((p) => p.date)).toEqual(['2026-01-12']);
    expect(unitsOf(SESSIONS)).toEqual(['kg', 'nivel']);
  });

  it('dibuja la línea solo con 2 o más puntos', () => {
    expect(sparkPoints([5])).toBe('');
    expect(sparkPoints([1, 2])).toBe('0.0,26.0 100.0,2.0');
  });

  it('el avance de una meta no se calcula sin valor inicial o actual', () => {
    expect(goalProgress(80, 75, 78)).toBe(40);
    expect(goalProgress(30, 40, 45)).toBe(100);
    expect(goalProgress(null, 40, 35)).toBeNull();
    expect(goalProgress(30, 40, null)).toBeNull();
  });
});
