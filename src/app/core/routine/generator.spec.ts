import { PLACE_PRESETS } from '../equipment';
import type { AreaMuscle, Exercise, HealthProfile, InjuryRecord } from '../models';
import { findAlternatives, generateRoutine, type GeneratorInput } from './generator';

let seq = 0;
function ex(name: string, o: Partial<Exercise> = {}): Exercise {
  return {
    id: `ex${++seq}`,
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
  };
}

/** Catálogo pequeño con lo justo para cubrir cada plantilla. */
const CATALOG: Exercise[] = [
  ex('Hack Squat', { primary_muscles: ['quadriceps'] }),
  ex('Leg Press', { primary_muscles: ['quadriceps'] }),
  ex('Barbell Full Squat', { primary_muscles: ['quadriceps'], equipment: 'barbell', level: 'intermediate' }),
  ex('Leg Extensions', { primary_muscles: ['quadriceps'], mechanic: 'isolation' }),
  ex('Leverage Chest Press', { primary_muscles: ['chest'], secondary_muscles: ['shoulders', 'triceps'] }),
  ex('Dumbbell Bench Press', { primary_muscles: ['chest'], secondary_muscles: ['shoulders'], equipment: 'dumbbell' }),
  ex('Butterfly', { primary_muscles: ['chest'], mechanic: 'isolation' }),
  ex('Wide-Grip Lat Pulldown', { primary_muscles: ['lats'], equipment: 'cable', force_type: 'pull' }),
  ex('Leverage Iso Row', { primary_muscles: ['lats'], force_type: 'pull' }),
  ex('Seated Cable Rows', { primary_muscles: ['middle back'], equipment: 'cable', force_type: 'pull' }),
  ex('Pullups', { primary_muscles: ['lats'], equipment: 'body only', force_type: 'pull' }),
  ex('Seated Leg Curl', { primary_muscles: ['hamstrings'], mechanic: 'isolation', force_type: 'pull' }),
  ex('Stiff-Legged Dumbbell Deadlift', { primary_muscles: ['hamstrings'], equipment: 'dumbbell', force_type: 'pull' }),
  ex('Barbell Hip Thrust', {
    primary_muscles: ['glutes'],
    equipment: 'barbell',
    category: 'powerlifting',
    level: 'intermediate',
  }),
  ex('Leverage Shoulder Press', { primary_muscles: ['shoulders'] }),
  ex('Side Lateral Raise', { primary_muscles: ['shoulders'], equipment: 'dumbbell', mechanic: 'isolation' }),
  ex('Cable Crunch', {
    primary_muscles: ['abdominals'],
    equipment: 'cable',
    mechanic: 'isolation',
    force_type: 'pull',
  }),
  ex('Crunches', {
    primary_muscles: ['abdominals'],
    equipment: 'body only',
    mechanic: 'isolation',
    force_type: 'pull',
  }),
  ex('Plank', { primary_muscles: ['abdominals'], equipment: 'body only', mechanic: 'isolation', force_type: 'static' }),
  ex('Hammer Curls', { primary_muscles: ['biceps'], equipment: 'dumbbell', mechanic: 'isolation', force_type: 'pull' }),
  ex('Alternate Hammer Curl', {
    primary_muscles: ['biceps'],
    equipment: 'dumbbell',
    mechanic: 'isolation',
    force_type: 'pull',
  }),
  ex('Triceps Pushdown', { primary_muscles: ['triceps'], equipment: 'cable', mechanic: 'isolation' }),
  ex('Standing Calf Raises', { primary_muscles: ['calves'], mechanic: 'isolation' }),
  ex('Seated Calf Raise', { primary_muscles: ['calves'], mechanic: 'isolation' }),
  ex('Prone Manual Hamstring', { primary_muscles: ['hamstrings'], equipment: null, force_type: 'static' }),
  ex('Hamstring Stretch', { category: 'stretching', primary_muscles: ['hamstrings'], equipment: null, mechanic: null }),
  ex("Child's Pose", { category: 'stretching', primary_muscles: ['lower back'], equipment: null, mechanic: null }),
  ex('Walking, Treadmill', { category: 'cardio', primary_muscles: ['quadriceps'], mechanic: null }),
  ex('Stairmaster', { category: 'cardio', primary_muscles: ['quadriceps'], mechanic: null }),
];

const AREA_MUSCLES: AreaMuscle[] = [
  { area: 'rodilla', muscle: 'quadriceps', risk: 'alto' },
  { area: 'rodilla', muscle: 'hamstrings', risk: 'medio' },
  { area: 'hombro', muscle: 'shoulders', risk: 'alto' },
  { area: 'hombro', muscle: 'chest', risk: 'medio' },
];

function health(o: Partial<HealthProfile> = {}): HealthProfile {
  return {
    user_id: 'u1',
    experience: 'principiante',
    days_per_week: 3,
    session_minutes: 60,
    places: ['smartfit'],
    goal: 'ganar_musculo',
    secondary_goals: [],
    focus_areas: [],
    goal_detail: null,
    sports: [],
    training_styles: ['musculacion'],
    training_styles_other: null,
    place_equipment: {},
    last_trained: 'actualmente',
    past_activities: [],
    activity_level: 'activo',
    sleep_hours: 'entre_7_y_8',
    pregnancy_status: 'no',
    has_medical_condition: false,
    medical_notes: null,
    consent_health_data: true,
    consent_at: null,
    ...o,
  };
}

function run(h: Partial<HealthProfile> = {}, o: Partial<GeneratorInput> = {}) {
  return generateRoutine({
    exercises: CATALOG,
    areaMuscles: AREA_MUSCLES,
    manualContra: [],
    health: health(h),
    injuries: [],
    place: 'smartfit',
    gear: PLACE_PRESETS['smartfit'],
    age: 30,
    gender: null,
    seed: 'test',
    ...o,
  });
}

const nameOf = (id: string) => CATALOG.find((e) => e.id === id)!.name;
const allIds = (r: ReturnType<typeof run>) => r.days.flatMap((d) => d.exercises.map((e) => e.exercise_id));

describe('generateRoutine', () => {
  it('repite los mismos ejercicios en los días con la misma plantilla (progresión)', () => {
    const r = run();
    expect(r.days).toHaveLength(3);
    expect(r.days[0].name).toContain('Cuerpo completo A');
    expect(r.days[2].exercises.map((e) => e.exercise_id)).toEqual(r.days[0].exercises.map((e) => e.exercise_id));
  });

  it('nunca incluye ejercicios que requieren compañero', () => {
    expect(allIds(run()).map(nameOf)).not.toContain('Prone Manual Hamstring');
  });

  it('no repite el mismo patrón de movimiento en un día', () => {
    for (const day of run({ experience: 'intermedio', days_per_week: 5 }).days) {
      const names = day.exercises.map((e) => nameOf(e.exercise_id));
      expect(names.includes('Hammer Curls') && names.includes('Alternate Hammer Curl')).toBe(false);
      expect(names.includes('Standing Calf Raises') && names.includes('Seated Calf Raise')).toBe(false);
    }
  });

  it('con lesión activa de rodilla excluye los ejercicios de cuádriceps', () => {
    const injuries: InjuryRecord[] = [
      { id: 'i1', body_area: 'rodilla', kind: 'lesion', status: 'activa', year: null, description: null },
    ];
    const names = allIds(run({}, { injuries })).map(nameOf);
    expect(names).not.toContain('Hack Squat');
    expect(names).not.toContain('Leg Press');
    expect(names).not.toContain('Stairmaster');
  });

  it('en embarazo evita crunch, plancha y peso muerto', () => {
    const names = allIds(run({ pregnancy_status: 'embarazada' })).map(nameOf);
    for (const n of ['Crunches', 'Cable Crunch', 'Plank', 'Stiff-Legged Dumbbell Deadlift']) {
      expect(names).not.toContain(n);
    }
  });

  it('usa la máquina de hip thrust de Smart Fit aunque la persona sea principiante', () => {
    const r = run({ focus_areas: ['gluteos'] });
    const item = r.days.flatMap((d) => d.exercises).find((e) => nameOf(e.exercise_id) === 'Barbell Hip Thrust');
    expect(item).toBeDefined();
    expect(item!.notes).toContain('hip thrust');
  });

  it('un principiante solo hace dominadas si hay máquina asistida', () => {
    const withAssist = allIds(run({}, { gear: [...PLACE_PRESETS['smartfit']] })).map(nameOf);
    const noAssist = allIds(
      run({}, { gear: PLACE_PRESETS['smartfit'].filter((g) => g !== 'dominadas_asistidas') }),
    ).map(nameOf);
    expect(noAssist).not.toContain('Pullups');
    expect(withAssist.length).toBeGreaterThan(0);
  });

  it('tras más de 6 meses sin entrenar, un intermedio vuelve a ejercicios de principiante', () => {
    const r = run({ experience: 'intermedio', last_trained: 'mas_6_meses' });
    // El hip thrust en máquina se permite a principiantes aunque el dataset lo marque intermedio.
    const levels = allIds(r)
      .filter((id) => nameOf(id) !== 'Barbell Hip Thrust')
      .map((id) => CATALOG.find((e) => e.id === id)!.level);
    expect(levels).not.toContain('intermediate');
    expect(r.notes.join(' ')).toContain('más de 6 meses');
  });

  it('una sesión corta tiene menos ejercicios que una larga', () => {
    const short = run({ session_minutes: 30 }).days[0].exercises.length;
    const long = run({ session_minutes: 90 }).days[0].exercises.length;
    expect(short).toBeLessThan(long);
  });

  it('prescribe estiramientos y cardio por tiempo, no por repeticiones', () => {
    const r = run({ goal: 'perder_grasa' });
    const items = r.days[0].exercises;
    const stretch = items.find((e) => nameOf(e.exercise_id) === 'Hamstring Stretch');
    const cardio = items.find(
      (e) => nameOf(e.exercise_id).includes('Treadmill') || nameOf(e.exercise_id) === 'Stairmaster',
    );
    expect(stretch?.notes).toContain('30 segundos');
    expect(cardio?.notes).toContain('minutos');
  });

  it('principiante: nunca menos de 8 repeticiones', () => {
    const r = run({ goal: 'fuerza', training_styles: ['fuerza'] });
    for (const e of r.days.flatMap((d) => d.exercises)) {
      if (e.reps_max > 1) expect(e.reps_min).toBeGreaterThanOrEqual(8);
    }
  });

  it('informa la duración estimada de cada día dentro del tiempo disponible', () => {
    for (const d of run({ session_minutes: 45 }).days) {
      expect(d.estimated_minutes).toBeGreaterThan(0);
      expect(d.estimated_minutes).toBeLessThanOrEqual(55);
    }
  });

  it('si una lesión deja un día dividido casi vacío, cambia a cuerpo completo', () => {
    const injuries: InjuryRecord[] = [
      { id: 'i2', body_area: 'hombro', kind: 'lesion', status: 'activa', year: null, description: null },
    ];
    const r = run({ experience: 'intermedio' }, { injuries });
    expect(r.days.every((d) => d.name.includes('Cuerpo completo'))).toBe(true);
    const names = allIds(r).map(nameOf);
    expect(names).not.toContain('Leverage Shoulder Press');
    expect(names).not.toContain('Plank');
    expect(r.notes.join(' ')).toContain('cuerpo completo');
  });

  it('nunca propone ejercicios marcados como "no me gusta"', () => {
    const hack = CATALOG.find((e) => e.name === 'Hack Squat')!.id;
    expect(allIds(run({}, { avoid: [hack] }))).not.toContain(hack);
  });

  it('busca alternativas del mismo músculo, seguras y sin repetir la rutina', () => {
    const input = (o: Partial<GeneratorInput> = {}): GeneratorInput => ({
      exercises: CATALOG,
      areaMuscles: AREA_MUSCLES,
      manualContra: [],
      health: health(),
      injuries: [],
      place: 'smartfit',
      gear: PLACE_PRESETS['smartfit'],
      age: 30,
      gender: null,
      seed: 'x',
      ...o,
    });
    const id = (n: string) => CATALOG.find((e) => e.name === n)!.id;
    const alts = findAlternatives(input(), id('Hack Squat'), [id('Leg Press')]);
    const names = alts.map((a) => a.exercise.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain('Hack Squat');
    expect(names).not.toContain('Leg Press');
    for (const a of alts) expect(a.exercise.primary_muscles).toContain('quadriceps');
    expect(alts[0].item.sets).toBeGreaterThan(0);

    // Con la rodilla lesionada no hay alternativas de cuádriceps.
    const knee: InjuryRecord[] = [
      { id: 'k', body_area: 'rodilla', kind: 'lesion', status: 'activa', year: null, description: null },
    ];
    expect(findAlternatives(input({ injuries: knee }), id('Leg Extensions'), [])).toHaveLength(0);

    // Lo que no le gusta tampoco aparece como alternativa.
    const avoided = findAlternatives(input({ avoid: [id('Leg Press')] }), id('Hack Squat'), []);
    expect(avoided.map((a) => a.exercise.name)).not.toContain('Leg Press');
  });
});
