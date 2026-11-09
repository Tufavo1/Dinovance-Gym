import type { Exercise } from '../models';
import { adjustAfterSet, adviseLoad, rirTarget, type LoadAthlete, type LoadHistoryEntry } from './load-advisor';
import { e1rm, inolLabel, loadFor, pctOf1RM, rpeFromRir, sessionMetrics } from './strength-math';
import { techniqueCues } from './technique';

const ex = (name: string, o: Partial<Exercise> = {}): Exercise => ({
  id: name,
  name,
  category: 'strength',
  level: 'beginner',
  force_type: 'push',
  mechanic: 'compound',
  equipment: 'machine',
  primary_muscles: ['chest'],
  secondary_muscles: [],
  instructions: [],
  images: [],
  ...o,
});

const man: LoadAthlete = {
  bodyweightKg: 80,
  gender: 'masculino',
  rank: 0,
  beginner: true,
  senior: false,
  cautious: false,
};
const woman: LoadAthlete = { ...man, bodyweightKg: 60, gender: 'femenino' };

const log = (weight: number, reps: number, rir: number | null, n = 1, w = 'w1'): LoadHistoryEntry => ({
  workout_id: w,
  exercise_id: 'x',
  set_number: n,
  reps,
  weight_kg: weight,
  rir,
  created_at: '2026-11-01',
});

describe('matemática de fuerza', () => {
  it('RPE = 10 − RIR', () => {
    expect(rpeFromRir(0)).toBe(10);
    expect(rpeFromRir(2)).toBe(8);
    expect(rpeFromRir(3)).toBe(7);
  });

  it('usa la tabla de %1RM (interpolada)', () => {
    expect(pctOf1RM(1)).toBe(100);
    expect(pctOf1RM(5)).toBe(86);
    expect(pctOf1RM(10)).toBe(74);
    expect(pctOf1RM(7)).toBeCloseTo(80.5, 1);
    expect(pctOf1RM(15)).toBe(65);
  });

  it('e1RM con repeticiones + RIR (Brzycki ≤ 10, Epley > 10)', () => {
    // 8 reps con RIR 2 = 10 repeticiones posibles
    expect(e1rm(100, 8, 2)).toBeCloseTo(100 / (1.0278 - 0.278), 3);
    expect(e1rm(50, 12, 0)).toBeCloseTo(50 * (1 + 12 / 30), 3);
  });

  it('calcula la carga para un rango dejando RIR', () => {
    expect(loadFor(100, 8, 2)).toBeCloseTo(74, 0);
  });

  it('métricas de la sesión: tonelaje, series efectivas e INOL', () => {
    const m = sessionMetrics([
      { exercise_id: 'a', reps: 10, weight_kg: 50, rir: 2 },
      { exercise_id: 'a', reps: 10, weight_kg: 50, rir: 1 },
      { exercise_id: 'a', reps: 8, weight_kg: 50, rir: 0 },
      { exercise_id: 'b', reps: 12, weight_kg: null, rir: 4 },
    ]);
    expect(m.tonnage).toBe(1400);
    expect(m.effectiveSets).toBe(3);
    expect(m.inol).toBeGreaterThan(0.5);
    expect(inolLabel(0.3)).toBe('Suave');
    expect(inolLabel(0.8)).toBe('Óptimo');
    expect(inolLabel(1.4)).toBe('Muy exigente');
  });
});

describe('recomendación de peso', () => {
  const press = ex('Leverage Chest Press');
  const target = { reps_min: 8, reps_max: 12 };

  it('principiantes dejan 2-3 repeticiones en reserva', () => {
    expect(rirTarget(man)).toEqual([2, 3]);
    expect(rirTarget({ beginner: false, cautious: false })).toEqual([1, 2]);
  });

  it('primera vez: estimación conservadora, menor para mujeres en tren superior', () => {
    const m = adviseLoad(press, target, man, []);
    const w = adviseLoad(press, target, woman, []);
    expect(m.kg).toBeGreaterThan(10);
    expect(m.kg).toBeLessThan(40);
    expect(w.kg!).toBeLessThan(m.kg!);
    expect(m.reason).toContain('peso de partida');
  });

  it('barra olímpica: nunca menos de 20 kg', () => {
    const a = adviseLoad(ex('Barbell Curl', { equipment: 'barbell', mechanic: 'isolation' }), target, woman, []);
    expect(a.kg).toBe(20);
  });

  it('peso corporal y ejercicios por tiempo no piden carga', () => {
    expect(adviseLoad(ex('Pushups', { equipment: 'body only' }), target, man, []).mode).toBe('corporal');
    expect(adviseLoad(ex('Hamstring Stretch', { category: 'stretching' }), target, man, []).mode).toBe('tiempo');
  });

  it('con margen la última vez, sube, pero como máximo un escalón o 5 %', () => {
    const a = adviseLoad(press, target, man, [log(40, 12, 4, 1), log(40, 12, 4, 2), log(40, 12, 4, 3)]);
    expect(a.kg).toBeGreaterThan(40);
    expect(a.kg).toBeLessThanOrEqual(42.5);
  });

  it('si llegó al fallo o no alcanzó el mínimo, baja', () => {
    const a = adviseLoad(press, target, man, [log(40, 9, 1, 1), log(40, 7, 0, 2)]);
    expect(a.kg).toBeLessThan(40);
  });

  it('dominadas asistidas: con margen, quita asistencia', () => {
    const pull = ex('Pullups', { equipment: 'body only' });
    const first = adviseLoad(pull, target, man, [], { assisted: true });
    expect(first.mode).toBe('contrapeso');
    const next = adviseLoad(pull, target, man, [log(40, 12, 3)], { assisted: true });
    expect(next.kg).toBe(35);
  });

  it('ajuste en vivo entre series según el RIR', () => {
    expect(adjustAfterSet(0, [2, 3], 'total', 40)).toBe(-2.5);
    expect(adjustAfterSet(5, [2, 3], 'total', 40)).toBe(2.5);
    expect(adjustAfterSet(4, [2, 3], 'total', 40)).toBe(2.5);
    expect(adjustAfterSet(2, [2, 3], 'total', 40)).toBe(0);
    expect(adjustAfterSet(0, [2, 3], 'contrapeso', 40)).toBe(5);
  });
});

describe('técnica', () => {
  it('siempre da 3 claves en español', () => {
    expect(techniqueCues(ex('Barbell Squat'))).toHaveLength(3);
    expect(techniqueCues(ex('Algo raro'))[0]).toContain('controlado');
    expect(techniqueCues(ex('Hamstring Stretch', { category: 'stretching' }))[0]).toContain('nunca dolor');
  });
});
