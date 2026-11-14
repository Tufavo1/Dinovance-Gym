import type { Exercise } from '../models';
import { DEFAULT_LOAD_SETTINGS, type LoadUnit } from '../progression/load-units';
import {
  buildWeeklyReport,
  mondayOfWeek,
  pendingWeeks,
  type PlannedExercise,
  type ReportSet,
  type ReportWorkout,
  type WeeklyReportInput,
} from './weekly-report';

function ex(id: string, o: Partial<Exercise>): Exercise {
  return {
    id,
    name: id,
    name_es: id,
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
  };
}

const EXERCISES = new Map(
  [
    ex('press', {
      primary_muscles: ['chest'],
      secondary_muscles: ['triceps', 'shoulders'],
      movement_pattern: 'empuje_horizontal',
    }),
    ex('remo', {
      primary_muscles: ['middle back'],
      secondary_muscles: ['biceps'],
      movement_pattern: 'traccion_horizontal',
    }),
    ex('prensa', {
      primary_muscles: ['quadriceps', 'glutes'],
      secondary_muscles: ['adductors'],
      movement_pattern: 'dominante_rodilla',
    }),
    ex('aductor', { primary_muscles: ['adductors'], mechanic: 'isolation', movement_pattern: 'aduccion_cadera' }),
    ex('estiramiento', { category: 'stretching', primary_muscles: ['hamstrings'] }),
  ].map((e) => [e.id, e]),
);

/** Lunes 2 de marzo de 2026. */
const WEEK = new Date(2026, 2, 2);
const day = (offset: number, hour = 18) => new Date(2026, 2, 2 + offset, hour).toISOString();

let seq = 0;
function workout(offset: number, o: Partial<ReportWorkout> = {}): ReportWorkout {
  const start = day(offset);
  return {
    id: `w${++seq}`,
    started_at: start,
    finished_at: new Date(new Date(start).getTime() + 60 * 60000).toISOString(),
    session_rpe: 7,
    paused_s: 0,
    ended_early: false,
    exercises_planned: 4,
    exercises_done: 4,
    readiness: null,
    fatigue: null,
    discomfort_areas: [],
    discomfort_note: null,
    ...o,
  };
}

function sets(
  w: ReportWorkout,
  exerciseId: string,
  load: number | null,
  reps: number[],
  rir: number | null = 2,
  unit: LoadUnit = 'kg',
): ReportSet[] {
  return reps.map((r, i) => ({
    workout_id: w.id,
    exercise_id: exerciseId,
    set_number: i + 1,
    reps: r,
    load_value: load,
    load_unit: unit,
    rir,
  }));
}

const PLAN = new Map<string, PlannedExercise>([
  ['press', { exercise_id: 'press', sets: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 3 }],
]);

function input(o: Partial<WeeklyReportInput>): WeeklyReportInput {
  return {
    weekStart: WEEK,
    workouts: [],
    sets: [],
    exercises: EXERCISES,
    plannedSessions: 3,
    plan: PLAN,
    settings: new Map(),
    weeklyRange: (k) => (k === 'chest' ? [6, 12] : null),
    defaultRir: [2, 3],
    ...o,
  };
}

describe('informe semanal', () => {
  it('sin entrenamientos lo dice y no inventa progreso', () => {
    const r = buildWeeklyReport(input({}));
    expect(r.hasData).toBe(false);
    expect(r.sessions.done).toBe(0);
    expect(r.exercises).toHaveLength(0);
    expect(r.improved).toHaveLength(0);
    expect(r.summary).toMatch(/No hay entrenamientos registrados/);
  });

  it('solo cuenta entrenamientos terminados y de esa semana', () => {
    const inWeek = workout(1);
    const unfinished = workout(2, { finished_at: null });
    const lastWeek = workout(-3);
    const nextWeek = workout(8);
    const r = buildWeeklyReport(
      input({
        workouts: [inWeek, unfinished, lastWeek, nextWeek],
        sets: [...sets(inWeek, 'press', 30, [10, 9, 8]), ...sets(unfinished, 'press', 30, [12, 12, 12])],
      }),
    );
    expect(r.sessions.done).toBe(1);
    expect(r.sessions.adherencePct).toBe(33);
    expect(r.exercises[0].reps).toEqual([10, 9, 8]);
  });

  it('cuenta volumen directo e indirecto por grupo muscular', () => {
    const w = workout(0);
    const r = buildWeeklyReport(
      input({
        workouts: [w],
        sets: [
          ...sets(w, 'press', 30, [10, 9, 8]),
          ...sets(w, 'prensa', 80, [10, 10]),
          ...sets(w, 'estiramiento', null, [1]),
        ],
      }),
    );
    const of = (k: string) => r.muscles.find((m) => m.key === k)!;
    expect(of('chest')).toMatchObject({ directSets: 3, indirectSets: 0, weighted: 3, status: 'bajo' });
    expect(of('triceps')).toMatchObject({ directSets: 0, indirectSets: 3, weighted: 1.5 });
    expect(of('adductors')).toMatchObject({ directSets: 0, indirectSets: 2, weighted: 1 });
    expect(r.muscles.find((m) => m.key === 'hamstrings')).toBeUndefined();
    // Entrenó tren inferior sin aductores directos: se avisa.
    expect(r.imbalances.join(' ')).toMatch(/Aductores: sin trabajo directo esta semana \(solo 2 series indirectas\)/);
  });

  it('compara cada ejercicio con su sesión anterior real', () => {
    const before = workout(-7);
    const now = workout(0);
    const r = buildWeeklyReport(
      input({
        workouts: [before, now],
        sets: [
          ...sets(before, 'press', 30, [10, 9, 8]),
          ...sets(now, 'press', 30, [11, 10, 9]),
          ...sets(before, 'remo', 40, [12, 12, 12]),
          ...sets(now, 'remo', 40, [10, 10, 9]),
          ...sets(now, 'aductor', 5, [15, 14, 12], 2, 'nivel'),
        ],
      }),
    );
    const of = (id: string) => r.exercises.find((e) => e.exercise_id === id)!;
    expect(of('press').trend).toBe('mejoro');
    expect(of('press').planned).toBe('Plan 3 × 8-12; hecho 3 × 11, 10, 9.');
    expect(of('remo').trend).toBe('empeoro');
    expect(of('aductor').trend).toBe('nuevo');
    expect(of('aductor').unit).toBe('nivel');
    expect(r.improved).toHaveLength(1);
    expect(r.worsened).toHaveLength(1);
  });

  it('recomienda subir solo con el criterio cumplido, y lo frena si hay fatiga o molestias declaradas', () => {
    const before = workout(-7);
    const now = workout(0);
    const data = [...sets(before, 'press', 30, [12, 12, 11]), ...sets(now, 'press', 30, [12, 12, 12])];
    const ok = buildWeeklyReport(input({ workouts: [before, now], sets: data }));
    expect(ok.exercises[0].advice.action).toBe('subir');
    expect(ok.recommendations.join(' ')).toContain('32,5 kg');

    const tired = buildWeeklyReport(
      input({ workouts: [before, { ...now, fatigue: 5, readiness: 2, discomfort_areas: ['hombro'] }], sets: data }),
    );
    const text = tired.recommendations.join(' ');
    expect(text).toMatch(/Fatiga alta declarada/);
    expect(text).toMatch(/Molestia declarada en hombro/);
    expect(text).toMatch(/conviene mantener 30 kg una semana más/);
  });

  it('detecta estancamiento y aumentos bruscos de volumen', () => {
    const a = workout(-14);
    const b = workout(-7);
    const c = workout(0);
    const c2 = workout(2);
    const r = buildWeeklyReport(
      input({
        workouts: [a, b, c, c2],
        sets: [
          ...sets(a, 'press', 30, [10, 9, 8, 8]),
          ...sets(b, 'press', 30, [10, 9, 8, 8]),
          ...sets(c, 'press', 30, [10, 9, 8, 8, 8]),
          ...sets(c2, 'press', 30, [10, 9, 8, 8, 8]),
        ],
      }),
    );
    expect(r.stalled).toHaveLength(1);
    expect(r.routineChanges[0].change).toMatch(/variante equivalente/);
    expect(r.volumeSpikes.join(' ')).toMatch(/Pecho: 10 series esta semana frente a 4 de promedio/);
  });

  it('declara lo que no pudo analizar', () => {
    const w = workout(0);
    const r = buildWeeklyReport(
      input({
        workouts: [w],
        sets: sets(w, 'press', 30, [10, 9, 8], null),
        plannedSessions: null,
        settings: new Map([['press', DEFAULT_LOAD_SETTINGS]]),
      }),
    );
    const notes = r.dataNotes.join(' ');
    expect(notes).toMatch(/No hay una rutina activa/);
    expect(notes).toMatch(/No hay semanas anteriores con registros/);
    expect(notes).toMatch(/No declaraste recuperación ni fatiga/);
    expect(notes).toMatch(/No hay RIR registrado/);
    expect(r.sessions.adherencePct).toBeNull();
  });

  it('genera informes solo de semanas ya terminadas y sin informe', () => {
    const now = new Date(2026, 2, 11); // miércoles
    const dates = [day(-14), day(-7), day(-6), day(0), day(8)];
    const pending = pendingWeeks(dates, new Set(['2026-02-16']), now);
    expect(pending.map((d) => d.getDate())).toEqual([23, 2]);
    expect(mondayOfWeek(now).getDate()).toBe(9);
  });
});
