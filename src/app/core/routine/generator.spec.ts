import { PLACE_PRESETS } from '../equipment';
import type { AreaMuscle, Exercise, HealthProfile, InjuryRecord } from '../models';
import {
  findAlternatives,
  generateRoutine,
  missingGeneratorData,
  substitutionMatch,
  type GeneratorInput,
} from './generator';

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
  ex('Thigh Adductor', {
    primary_muscles: ['adductors'],
    mechanic: 'isolation',
    movement_pattern: 'aduccion_cadera',
    review_status: 'verificado',
  }),
  ex('Cable Hip Adduction', {
    primary_muscles: ['adductors'],
    mechanic: 'isolation',
    equipment: 'cable',
    movement_pattern: 'aduccion_cadera',
    review_status: 'verificado',
  }),
  ex('Side Lying Hip Adduction', {
    primary_muscles: ['adductors'],
    mechanic: 'isolation',
    equipment: 'body only',
    movement_pattern: 'aduccion_cadera',
    review_status: 'verificado',
  }),
  ex('Thigh Abductor', {
    primary_muscles: ['abductors'],
    mechanic: 'isolation',
    movement_pattern: 'abduccion_cadera',
    review_status: 'verificado',
  }),
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
    expect(r.notes.join(' ')).toContain('Más de 6 meses');
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

  it('principiante: nunca menos de 6 repeticiones (técnica primero)', () => {
    const r = run({ goal: 'fuerza', training_styles: ['fuerza'] });
    for (const e of r.days.flatMap((d) => d.exercises)) {
      if (e.reps_max > 1) expect(e.reps_min).toBeGreaterThanOrEqual(6);
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
    const r = run({ experience: 'intermedio', days_per_week: 5 }, { injuries });
    expect(r.days.every((d) => d.name.includes('Cuerpo completo'))).toBe(true);
    const names = allIds(r).map(nameOf);
    expect(names).not.toContain('Leverage Shoulder Press');
    expect(names).not.toContain('Plank');
    expect(r.notes.join(' ')).toContain('cuerpo completo');
  });

  it('cada músculo grande se entrena al menos 2 veces por semana con 3 días (Schoenfeld 2016)', () => {
    const r = run({ experience: 'intermedio', days_per_week: 3 });
    expect(r.days.every((d) => d.name.includes('Cuerpo completo'))).toBe(true);
  });

  it('el volumen semanal por músculo respeta el rango del programa', () => {
    const r = run({ experience: 'intermedio', days_per_week: 4, session_minutes: 90 });
    const sets = new Map<string, number>();
    for (const e of r.days.flatMap((d) => d.exercises)) {
      const ex = CATALOG.find((c) => c.id === e.exercise_id)!;
      if (ex.category !== 'strength' || e.reps_max === 1) continue;
      sets.set(ex.primary_muscles[0], (sets.get(ex.primary_muscles[0]) ?? 0) + e.sets);
    }
    expect(sets.get('chest') ?? 0).toBeGreaterThanOrEqual(8);
    expect(sets.get('chest') ?? 0).toBeLessThanOrEqual(16);
  });

  it('alta intensidad: pocas series y máximo 3 días, solo con experiencia', () => {
    const r = run({ experience: 'intermedio', days_per_week: 5, training_approach: 'alta_intensidad' });
    expect(r.days).toHaveLength(3);
    for (const e of r.days.flatMap((d) => d.exercises)) if (e.reps_max > 1) expect(e.sets).toBeLessThanOrEqual(2);
    expect(r.notes.join(' ')).toContain('muy exigentes');
    // Un principiante no recibe alta intensidad.
    const b = run({ experience: 'principiante', days_per_week: 5, training_approach: 'alta_intensidad' });
    expect(b.days).toHaveLength(5);
  });

  it('recomienda proteína según el peso y la fase nutricional', () => {
    const r = run({ nutrition_phase: 'deficit' }, { weightKg: 80 });
    expect(r.notes.join(' ')).toContain('160-192 g');
  });

  it('nunca propone ejercicios marcados como "no me gusta"', () => {
    const hack = CATALOG.find((e) => e.name === 'Hack Squat')!.id;
    expect(allIds(run({}, { avoid: [hack] }))).not.toContain(hack);
  });

  it('busca alternativas equivalentes, seguras y sin repetir la rutina', () => {
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
    const alts = findAlternatives(input(), id('Hack Squat'), []);
    const names = alts.map((a) => a.exercise.name);
    expect(names).toContain('Leg Press');
    expect(names).not.toContain('Hack Squat');
    // Un aislado de cuádriceps no reemplaza a un compuesto: trabajar la misma zona no basta.
    expect(names).not.toContain('Leg Extensions');
    for (const a of alts) expect(a.exercise.primary_muscles[0]).toBe('quadriceps');
    expect(alts[0].item.sets).toBeGreaterThan(0);
    expect(alts[0].why).toContain('mismo músculo principal');

    // No repite lo que ya está en la rutina.
    expect(findAlternatives(input(), id('Hack Squat'), [id('Leg Press')]).map((a) => a.exercise.name)).not.toContain(
      'Leg Press',
    );

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

describe('aductores y cobertura del tren inferior', () => {
  const byName = (n: string) => CATALOG.find((e) => e.name === n)!;
  const primaryKeys = (r: ReturnType<typeof run>) =>
    new Set(allIds(r).map((id) => CATALOG.find((e) => e.id === id)!.primary_muscles[0]));

  it('incluye trabajo directo de aductores todas las semanas, con cualquier disponibilidad', () => {
    for (const experience of ['principiante', 'intermedio', 'avanzado']) {
      for (const days of [2, 3, 4, 5, 6]) {
        for (const minutes of [30, 45, 60, 90]) {
          const keys = primaryKeys(run({ days_per_week: days, session_minutes: minutes, experience }));
          expect(keys, `${experience} / ${days} días / ${minutes} min`).toContain('adductors');
        }
      }
    }
  });

  it('abductores y pantorrillas entran si caben; si no, la rutina lo avisa', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const minutes of [45, 60, 90]) {
        const r = run({ days_per_week: days, session_minutes: minutes, experience: 'intermedio' });
        const keys = primaryKeys(r);
        for (const [key, label] of [
          ['abductors', 'Abductores'],
          ['calves', 'Pantorrillas'],
        ]) {
          const explained = r.notes.some((n) => n.startsWith(`${label}: no cupo`));
          expect(keys.has(key) || explained, `${key} / ${days} días / ${minutes} min`).toBe(true);
        }
      }
    }
  });

  it('sin máquinas ni poleas usa la alternativa de aductores que sí se puede hacer', () => {
    const r = run({}, { gear: ['mancuernas', 'banco'] });
    const names = allIds(r).map(nameOf);
    expect(names).toContain('Side Lying Hip Adduction');
    expect(names).not.toContain('Thigh Adductor');
  });

  it('si no existe ningún ejercicio de aductores posible, lo dice en vez de callarlo', () => {
    const catalog = CATALOG.filter((e) => e.primary_muscles[0] !== 'adductors');
    const r = run({}, { exercises: catalog });
    expect(r.notes.join(' ')).toMatch(/Aductores: (sin ejercicio directo posible|no hay ejercicio posible)/);
  });

  it('con lesión activa de cadera no fuerza aductores', () => {
    const hip: InjuryRecord[] = [
      { id: 'c', body_area: 'cadera', kind: 'lesion', status: 'activa', year: null, description: null },
    ];
    const r = run(
      {},
      { injuries: hip, areaMuscles: [...AREA_MUSCLES, { area: 'cadera', muscle: 'adductors', risk: 'alto' }] },
    );
    expect(primaryKeys(r)).not.toContain('adductors');
  });

  it('la máquina de aductores solo se sustituye por otra aducción de cadera', () => {
    const adductor = byName('Thigh Adductor');
    expect(substitutionMatch(adductor, byName('Cable Hip Adduction'))?.why).toContain('aducción de cadera');
    expect(substitutionMatch(adductor, byName('Leg Press'))).toBeNull();
    expect(substitutionMatch(adductor, byName('Thigh Abductor'))).toBeNull();
    const alts = findAlternatives(
      {
        exercises: CATALOG,
        areaMuscles: AREA_MUSCLES,
        manualContra: [],
        health: health(),
        injuries: [],
        place: 'smartfit',
        gear: PLACE_PRESETS['smartfit'],
        age: 30,
        seed: 'x',
      },
      adductor.id,
      [],
    );
    expect(alts.map((a) => a.exercise.name).sort()).toEqual(['Cable Hip Adduction', 'Side Lying Hip Adduction']);
  });
});

describe('explicación y uso del historial', () => {
  it('cada ejercicio de fuerza trae su justificación y su RIR; cada día, su objetivo', () => {
    const r = run();
    for (const d of r.days) {
      expect(d.objective).toBeTruthy();
      for (const e of d.exercises) {
        const cat = CATALOG.find((x) => x.id === e.exercise_id)!.category;
        if (cat !== 'strength') continue;
        expect(e.rationale, nameOf(e.exercise_id)).toMatch(/Trabajo directo de/);
        if (e.reps_max > 1) expect(e.rir_min).not.toBeNull();
      }
    }
  });

  it('no depende del azar: otra semilla da la misma rutina', () => {
    expect(allIds(run({}, { seed: 'a' }))).toEqual(allIds(run({}, { seed: 'b' })));
  });

  it('rota un ejercicio estancado por una variante equivalente', () => {
    const hack = CATALOG.find((e) => e.name === 'Hack Squat')!.id;
    const base = allIds(run());
    expect(base).toContain(hack);
    const history = { performed: [hack], stalled: [hack], hoursSince: {}, weeklySets: {} };
    expect(allIds(run({}, { history }))).not.toContain(hack);
  });

  it('avisa si el primer día repite un grupo entrenado hace menos de 48 h', () => {
    const history = { performed: [], stalled: [], hoursSince: { quadriceps: 20 }, weeklySets: {} };
    expect(run({}, { history }).notes.join(' ')).toMatch(/hace menos de 48 h/);
  });

  it('pide los datos que faltan en vez de suponerlos', () => {
    const h = health({ days_per_week: null, session_minutes: null });
    const missing = missingGeneratorData({ health: h, age: null, place: 'casa', gear: [], gearConfirmed: false });
    expect(missing).toEqual([
      'cuántos días por semana puedes entrenar',
      'cuánto dura cada sesión',
      'tu fecha de nacimiento (edad)',
      'el equipamiento disponible en ese lugar',
    ]);
    expect(missingGeneratorData({ health: health(), age: 30, place: 'casa', gear: [], gearConfirmed: true })).toEqual(
      [],
    );
  });
});
