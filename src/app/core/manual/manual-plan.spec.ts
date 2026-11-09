import type { Exercise, HealthProfile } from '../models';
import { buildAthleteProfile } from '../routine/athlete-profile';
import {
  MAX_EXERCISES_PER_DAY,
  analyzePlan,
  canAdd,
  minutesWith,
  moveMuscle,
  neighborConflict,
  sortDay,
  suggestDay,
  type PlanDay,
  type PlanItem,
} from './manual-plan';

const ex = (name: string, primary: string[], o: Partial<Exercise> = {}): Exercise => ({
  id: name,
  name,
  category: 'strength',
  level: 'beginner',
  force_type: 'push',
  mechanic: 'compound',
  equipment: 'machine',
  primary_muscles: primary,
  secondary_muscles: [],
  instructions: [],
  images: [],
  ...o,
});

const item = (e: Exercise, sets = 3, rest = 90): PlanItem => ({
  exercise: e,
  sets,
  reps_min: 8,
  reps_max: 12,
  rest_seconds: rest,
  notes: null,
  recommended: { sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90 },
});

const press = ex('Leverage Chest Press', ['chest']);
const fly = ex('Butterfly', ['chest'], { mechanic: 'isolation' });
const squat = ex('Barbell Squat', ['quadriceps'], { equipment: 'barbell' });
const deadlift = ex('Barbell Deadlift', ['hamstrings'], { equipment: 'barbell' });
const row = ex('Seated Cable Rows', ['middle back'], { force_type: 'pull' });
const curl = ex('Seated Leg Curl', ['hamstrings'], { mechanic: 'isolation' });
const crunch = ex('Crunches', ['abdominals'], { mechanic: 'isolation' });

const profile = (o: Partial<HealthProfile> = {}) =>
  buildAthleteProfile(
    {
      experience: 'principiante',
      days_per_week: 3,
      session_minutes: 60,
      goal: 'ganar_musculo',
      training_styles: ['musculacion'],
      last_trained: 'actualmente',
      ...o,
    } as HealthProfile,
    [],
    30,
    null,
  );

describe('rutina manual', () => {
  it('avisa si un músculo se entrena en días seguidos y propone otro día', () => {
    const days: PlanDay[] = [[item(press)], [item(fly)], []];
    expect(neighborConflict(days, 1, 'chest')).toBe(0);
    const a = analyzePlan(days, profile());
    const w = a.warnings.find((x) => x.id.startsWith('seguido-chest'));
    expect(w?.level).toBe('alto');
    expect(w?.action?.toDay).toBe(2);
  });

  it('el abdomen se puede entrenar días seguidos', () => {
    const a = analyzePlan([[item(crunch)], [item(crunch)]], profile());
    expect(a.warnings.some((x) => x.id.startsWith('seguido'))).toBe(false);
  });

  it('mover un músculo a otro día resuelve el conflicto', () => {
    const days: PlanDay[] = [[item(press)], [item(fly), item(squat)], []];
    const moved = moveMuscle(days, 1, 2, 'chest');
    expect(moved[1].map((i) => i.exercise.name)).toEqual(['Barbell Squat']);
    expect(moved[2].map((i) => i.exercise.name)).toEqual(['Butterfly']);
    expect(analyzePlan(moved, profile()).warnings.some((x) => x.id.startsWith('seguido-chest'))).toBe(false);
  });

  it('sugiere el día con menos carga y sin conflictos', () => {
    const days: PlanDay[] = [[item(press)], [], [item(squat)], []];
    // El Día 2 queda pegado al de pecho; entre el 3 y el 4 gana el que tiene menos carga.
    expect(suggestDay(days, 'chest')).toBe(3);
    expect(suggestDay([[item(press)], [], [item(squat, 6)], [item(row)]], 'chest')).toBe(3);
  });

  it('más de 10 series de un músculo en un día es demasiado', () => {
    const a = analyzePlan([[item(press, 6), item(fly, 6)], [], []], profile());
    expect(a.warnings.some((x) => x.id.startsWith('sesion-chest'))).toBe(true);
  });

  it('ordena primero los ejercicios grandes', () => {
    const day = [item(crunch), item(fly), item(press)];
    expect(sortDay(day).map((i) => i.exercise.name)).toEqual(['Leverage Chest Press', 'Butterfly', 'Crunches']);
    expect(analyzePlan([day], profile()).warnings.find((x) => x.id === 'orden-0')?.action?.kind).toBe('sort');
  });

  it('avisa por exceso de tiempo y por mucha carga lumbar en principiantes', () => {
    const long = Array.from({ length: 12 }, (_, k) => item(ex(`Máquina ${k}`, ['chest']), 4, 180));
    expect(analyzePlan([long], profile({ session_minutes: 45 })).warnings.some((x) => x.id === 'tiempo-0')).toBe(true);
    expect(analyzePlan([[item(squat), item(deadlift)]], profile()).warnings.some((x) => x.id === 'lumbar-0')).toBe(
      true,
    );
  });

  it('detecta desequilibrio empuje/tirón y la falta de piernas', () => {
    const a = analyzePlan([[item(press, 4), item(fly, 4)], [], []], profile());
    expect(a.warnings.some((x) => x.id === 'empuje-tiron')).toBe(true);
    expect(a.warnings.some((x) => x.id === 'sin-piernas')).toBe(true);
  });

  it('no sugiere músculos que la persona no puede entrenar por lesión', () => {
    const days: PlanDay[] = [[item(press), item(row), item(curl)], [], []];
    const blocked = new Set(['quadriceps']);
    const text = analyzePlan(days, profile(), blocked)
      .warnings.map((w) => w.text)
      .join(' ');
    expect(text).not.toContain('cuádriceps');
  });

  it('calcula volumen semanal e intensidad', () => {
    const days: PlanDay[] = [[item(press), item(row), item(squat)], [], [item(fly), item(row), item(curl)]];
    const a = analyzePlan(days, profile());
    expect(a.totalSets).toBe(18);
    expect(a.weekly.find((v) => v.muscle === 'chest')?.sets).toBe(6);
    expect(a.weekly.find((v) => v.muscle === 'chest')?.status).toBe('optimo');
    expect(a.intensity.label).not.toBe('Sin datos');
    expect(a.dayMinutes[0]).toBeGreaterThan(0);
    expect(a.dayMinutes[1]).toBe(0);
  });

  it('limita ejercicios por día y por músculo', () => {
    const chest = Array.from({ length: 4 }, (_, k) => item(ex(`Pecho ${k}`, ['chest'])));
    const r1 = canAdd(chest, ex('Pecho 9', ['chest']));
    expect(r1.ok).toBe(false);
    expect(!r1.ok && r1.reason).toBe('musculo_lleno');
    expect(canAdd(chest, ex('Remo', ['middle back'])).ok).toBe(true);
    expect(canAdd(chest, chest[0].exercise).ok).toBe(false);

    const full = Array.from({ length: MAX_EXERCISES_PER_DAY }, (_, k) => item(ex(`E${k}`, [`m${k}`])));
    const r2 = canAdd(full, ex('Otro', ['calves']));
    expect(!r2.ok && r2.reason).toBe('dia_lleno');
  });

  it('estima los minutos del día al agregar un ejercicio', () => {
    expect(minutesWith([item(press)], item(fly), profile())).toBeGreaterThan(minutesWith([], item(fly), profile()));
  });
});
