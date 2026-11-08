import { requiredGear, CALISTHENICS_GEAR } from './equipment';
import {
  BODY_AREA_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  labelOf,
  type AreaMuscle,
  type Exercise,
  type ExerciseContraindication,
  type HealthProfile,
  type InjuryRecord,
} from './models';

/**
 * Generador de rutinas por REGLAS (sin IA). Todo es determinista para un mismo "seed":
 * nivel, modalidad, objetivo, equipamiento del lugar y lesiones deciden qué ejercicios entran.
 * Las reglas de lesiones son conservadoras y NO reemplazan a un profesional de la salud.
 */

export interface GeneratorInput {
  exercises: Exercise[];
  areaMuscles: AreaMuscle[];
  manualContra: ExerciseContraindication[];
  health: HealthProfile;
  injuries: InjuryRecord[];
  place: string;
  gear: string[];
  age: number | null;
  seed: string;
}

export interface GeneratedExercise {
  exercise_id: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
}

export interface GeneratedDay {
  day_index: number;
  name: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedRoutine {
  name: string;
  goal: string;
  days_per_week: number;
  place: string;
  notes: string[];
  days: GeneratedDay[];
}

const LEVEL_RANK: Record<string, number> = {
  nunca: 0,
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

/** Categorías del dataset que corresponden a cada modalidad. */
const STYLE_CATS: Record<string, string[]> = {
  no_se: ['strength'],
  musculacion: ['strength'],
  hipertrofia: ['strength'],
  fuerza: ['powerlifting', 'strength'],
  halterofilia: ['olympic weightlifting', 'strength'],
  gimnasia: ['strength'],
  funcional: ['strength', 'plyometrics'],
  cardio: ['cardio', 'strength'],
  movilidad: ['stretching'],
  otro: ['strength'],
};

/**
 * Ejercicios fundamentales y conocidos (nombres exactos del dataset). Tienen prioridad al
 * elegir, para que la rutina esté hecha de lo básico y no de variantes raras.
 */
const STAPLES = new Set([
  // Piernas y glúteos
  'Barbell Squat', 'Barbell Full Squat', 'Goblet Squat', 'Dumbbell Squat', 'Bodyweight Squat',
  'Smith Machine Squat', 'Leg Press', 'Hack Squat', 'Barbell Lunge', 'Dumbbell Lunges',
  'Dumbbell Step Ups', 'Split Squat with Dumbbells', 'Romanian Deadlift', 'Stiff-Legged Dumbbell Deadlift',
  'Barbell Deadlift', 'Leg Extensions', 'Seated Leg Curl', 'Lying Leg Curls', 'Standing Calf Raises',
  'Seated Calf Raise', 'Barbell Hip Thrust', 'Barbell Glute Bridge', 'Butt Lift (Bridge)',
  'Thigh Abductor', 'Thigh Adductor',
  // Pecho, hombro, tríceps
  'Barbell Bench Press - Medium Grip', 'Dumbbell Bench Press', 'Barbell Incline Bench Press - Medium Grip',
  'Incline Dumbbell Press', 'Pushups', 'Push-Up Wide', 'Leverage Chest Press', 'Butterfly', 'Cable Crossover',
  'Dumbbell Flyes', 'Seated Dumbbell Press', 'Standing Military Press', 'Dumbbell Shoulder Press',
  'Side Lateral Raise', 'Cable Shoulder Press', 'Leverage Shoulder Press', 'Machine Shoulder (Military) Press',
  'Triceps Pushdown', 'Triceps Pushdown - Rope Attachment', 'Dips - Triceps Version', 'Bench Dips',
  'Cable Rope Overhead Triceps Extension', 'Close-Grip Barbell Bench Press', 'Face Pull', 'Front Dumbbell Raise',
  // Espalda y bíceps
  'Pullups', 'Chin-Up', 'Wide-Grip Lat Pulldown', 'Close-Grip Front Lat Pulldown', 'Seated Cable Rows',
  'Bent Over Barbell Row', 'One-Arm Dumbbell Row', 'Leverage Iso Row', 'Leverage High Row', 'Inverted Row',
  'Straight-Arm Pulldown', 'Reverse Flyes', 'Cable Rear Delt Fly', 'Barbell Shrug', 'Dumbbell Shrug',
  'Barbell Curl', 'Dumbbell Bicep Curl', 'Hammer Curls', 'Alternate Hammer Curl', 'Preacher Curl',
  'Standing Biceps Cable Curl',
  // Core
  'Plank', 'Crunches', 'Cable Crunch', 'Reverse Crunch', 'Flat Bench Lying Leg Raise', 'Dead Bug',
  'Side Bridge', 'Pallof Press', 'Air Bike', 'Russian Twist', 'Ab Crunch Machine', 'Mountain Climbers',
]);

/** Categorías que se evitan con condición médica o edad avanzada. */
const HIGH_RISK_CATS = new Set(['plyometrics', 'olympic weightlifting', 'powerlifting', 'strongman']);

/** Categorías que se bloquean por zona lesionada. */
const AREA_BLOCKED_CATS: Record<string, string[]> = {
  espalda_baja: ['olympic weightlifting', 'powerlifting', 'strongman'],
  rodilla: ['plyometrics', 'olympic weightlifting', 'strongman'],
  tobillo: ['plyometrics', 'olympic weightlifting', 'strongman'],
  cadera: ['plyometrics', 'olympic weightlifting', 'strongman'],
  hombro: ['olympic weightlifting', 'strongman'],
  muneca: ['olympic weightlifting', 'strongman'],
  codo: ['strongman'],
  cuello: ['olympic weightlifting', 'strongman'],
};

/** Movimientos que cargan la zona, más allá del músculo principal. */
const AREA_NAME_RULES: Record<string, RegExp> = {
  hombro: /overhead|behind the neck|snatch|jerk|military|arnold|upright row|push press|handstand|\bdips?\b/i,
  espalda_baja:
    /deadlift|good morning|bent over|bent-over|t-bar|long bar|hyperextension|back extension|clean|snatch|superman|stiff|romanian|sit-up|situp|barbell.*(row|lunge|squat)|walking lunge|hip thrust|glute bridge/i,
  rodilla: /squat|lunge|jump|leg extension|leg press|hack|step-up|sprint|pistol|box|hop/i,
  cadera: /squat|lunge|deadlift|hip|jump|sprint|abduct|adduct|good morning/i,
  tobillo: /jump|sprint|calf|hop|skip|run|jog|box|lunge/i,
  muneca: /push-up|pushup|handstand|clean|snatch|wrist|plank|front squat/i,
  codo: /skull|french|extension|\bdips?\b|chin|close-grip|preacher/i,
  cuello: /neck|shrug|behind the neck|bridge|headstand/i,
  abdomen: /sit-up|situp|crunch|plank|leg raise|twist|woodchop/i,
};

type Slot = string[];

const TEMPLATES: Record<string, { name: string; slots: Slot[] }> = {
  FULL_A: {
    name: 'Cuerpo completo A',
    slots: [
      ['quadriceps'],
      ['chest'],
      ['lats'],
      ['shoulders'],
      ['hamstrings'],
      ['abdominals'],
      ['biceps'],
      ['triceps'],
      ['calves'],
    ],
  },
  FULL_B: {
    name: 'Cuerpo completo B',
    slots: [
      ['hamstrings', 'glutes'],
      ['shoulders'],
      ['middle back', 'lats'],
      ['chest'],
      ['quadriceps'],
      ['abdominals'],
      ['triceps'],
      ['biceps'],
      ['calves'],
    ],
  },
  PUSH: {
    name: 'Empuje (pecho, hombro, tríceps)',
    slots: [
      ['chest'],
      ['shoulders'],
      ['chest'],
      ['triceps'],
      ['shoulders'],
      ['triceps'],
      ['abdominals'],
      ['chest'],
      ['shoulders'],
    ],
  },
  PULL: {
    name: 'Tirón (espalda, bíceps)',
    slots: [
      ['lats'],
      ['middle back'],
      ['lats'],
      ['biceps'],
      ['traps', 'middle back'],
      ['biceps'],
      ['forearms', 'abdominals'],
      ['lats'],
      ['biceps'],
    ],
  },
  LEGS: {
    name: 'Piernas',
    slots: [
      ['quadriceps'],
      ['hamstrings'],
      ['glutes'],
      ['quadriceps'],
      ['calves'],
      ['abductors', 'adductors'],
      ['abdominals'],
      ['hamstrings'],
      ['calves'],
    ],
  },
  UPPER: {
    name: 'Tren superior',
    slots: [
      ['chest'],
      ['lats'],
      ['shoulders'],
      ['middle back'],
      ['biceps'],
      ['triceps'],
      ['chest', 'shoulders'],
      ['lats'],
      ['abdominals'],
    ],
  },
  LOWER: {
    name: 'Tren inferior',
    slots: [
      ['quadriceps'],
      ['hamstrings'],
      ['glutes'],
      ['calves'],
      ['quadriceps'],
      ['abdominals'],
      ['hamstrings'],
      ['abductors', 'adductors'],
      ['calves'],
    ],
  },
};

/** Músculos que se trabajan extra cuando la persona pide priorizar una zona. */
const FOCUS_SLOTS: Record<string, string[]> = {
  pecho: ['chest'],
  espalda: ['lats', 'middle back'],
  hombros: ['shoulders'],
  brazos: ['biceps', 'triceps'],
  abdomen: ['abdominals'],
  gluteos: ['glutes'],
  piernas: ['quadriceps', 'hamstrings'],
};

function splitFor(days: number, rank: number): string[] {
  switch (days) {
    case 2:
      return ['FULL_A', 'FULL_B'];
    case 3:
      return rank === 0 ? ['FULL_A', 'FULL_B', 'FULL_A'] : ['PUSH', 'PULL', 'LEGS'];
    case 4:
      return ['UPPER', 'LOWER', 'UPPER', 'LOWER'];
    case 5:
      return ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER'];
    default:
      return ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS'];
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

interface Prescription {
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
}

function prescribe(ex: Exercise, goal: string, styles: string[], beginner: boolean): Prescription {
  const cat = ex.category;
  if (cat === 'stretching')
    return { sets: 2, reps_min: 1, reps_max: 1, rest_seconds: 15, notes: 'Mantén la posición 30 segundos' };
  if (cat === 'cardio')
    return { sets: 1, reps_min: 1, reps_max: 1, rest_seconds: 0, notes: '15 a 20 minutos a ritmo moderado' };
  if (cat === 'plyometrics') return { sets: 3, reps_min: 6, reps_max: 10, rest_seconds: 60, notes: null };
  if (cat === 'olympic weightlifting')
    return {
      sets: 5,
      reps_min: 2,
      reps_max: 3,
      rest_seconds: 120,
      notes: 'Usa cargas ligeras y prioriza la técnica',
    };

  const compound = ex.mechanic === 'compound';
  const strengthFocus = styles.includes('fuerza') || goal === 'fuerza';
  const hypertrophy = styles.includes('hipertrofia') || goal === 'ganar_musculo';

  let p: Prescription;
  if (strengthFocus) {
    p = compound
      ? { sets: 4, reps_min: 3, reps_max: 6, rest_seconds: 150, notes: null }
      : { sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, notes: null };
  } else if (hypertrophy) {
    p = compound
      ? { sets: styles.includes('hipertrofia') ? 4 : 3, reps_min: 6, reps_max: 10, rest_seconds: 90, notes: null }
      : { sets: 3, reps_min: 10, reps_max: 15, rest_seconds: 60, notes: null };
  } else if (goal === 'perder_grasa' || goal === 'resistencia' || goal === 'tonificar') {
    p = { sets: 3, reps_min: 12, reps_max: 15, rest_seconds: 60, notes: null };
  } else {
    p = { sets: 3, reps_min: 10, reps_max: 12, rest_seconds: 75, notes: null };
  }

  if (beginner) {
    p = { ...p, sets: Math.min(p.sets, 3), rest_seconds: Math.max(p.rest_seconds, 60) };
    if (strengthFocus && compound) p = { ...p, reps_min: 5, reps_max: 8, rest_seconds: 120 };
  }
  return p;
}

export function generateRoutine(input: GeneratorInput): GeneratedRoutine {
  const { health, exercises, place } = input;
  const notes = new Set<string>();
  const rng = mulberry32(hash(input.seed));

  const rank = LEVEL_RANK[health.experience ?? ''] ?? 0;
  const allGoals = [health.goal ?? 'salud_general', ...(health.secondary_goals ?? [])];
  const retomar = allGoals.includes('retomar');
  const beginner = rank === 0 || retomar;
  const cautious = health.has_medical_condition || (input.age !== null && input.age >= 60);
  const maxRank = retomar ? 0 : cautious ? Math.min(rank, 1) : rank;
  const styles = health.training_styles?.length ? health.training_styles : ['no_se'];
  const goal = health.goal ?? 'salud_general';
  const daysPerWeek = clamp(health.days_per_week ?? 3, 2, 6);
  const minutes = health.session_minutes ?? 60;

  // ---- Equipamiento efectivo ----
  const bodyweightOnly =
    styles.includes('gimnasia') && styles.every((s) => s === 'gimnasia' || s === 'movilidad');
  const gearSet = new Set(
    bodyweightOnly ? input.gear.filter((g) => CALISTHENICS_GEAR.includes(g)) : input.gear,
  );

  // ---- Categorías a usar ----
  const cats = new Set<string>();
  for (const s of styles) for (const c of STYLE_CATS[s] ?? ['strength']) cats.add(c);
  const mainCats = new Set([...cats].filter((c) => c !== 'stretching' && c !== 'cardio'));
  const stretchOnly = mainCats.size === 0;
  if (stretchOnly) mainCats.add('stretching');
  // Para rendir en un deporte se permite algo de trabajo explosivo (si la salud lo permite).
  if (allGoals.includes('deporte') && !cautious && !stretchOnly) mainCats.add('plyometrics');
  const preferredCats = new Set<string>();
  if (styles.includes('fuerza')) preferredCats.add('powerlifting');
  if (styles.includes('halterofilia')) preferredCats.add('olympic weightlifting');

  // ---- Lesiones activas ----
  const activeInjuries = input.injuries.filter((i) => i.status === 'activa');
  const recoveredSurgeries = input.injuries.filter((i) => i.status !== 'activa' && i.kind === 'cirugia');
  const injuryAreas = new Set(activeInjuries.map((i) => i.body_area));
  const allAreas = new Set(input.injuries.map((i) => i.body_area));

  const isExcludedByInjury = (ex: Exercise): boolean => {
    const name = ex.name.toLowerCase();
    for (const inj of activeInjuries) {
      const rows = input.areaMuscles.filter((a) => a.area === inj.body_area);
      const high = new Set(rows.filter((r) => r.risk === 'alto').map((r) => r.muscle));
      const mid = new Set(rows.filter((r) => r.risk === 'medio').map((r) => r.muscle));

      if (ex.primary_muscles.some((m) => high.has(m))) return true;
      if (ex.secondary_muscles.some((m) => high.has(m))) return true;
      if (inj.kind === 'cirugia' && ex.primary_muscles.some((m) => mid.has(m))) return true;
      if (ex.category && AREA_BLOCKED_CATS[inj.body_area]?.includes(ex.category)) return true;
      const rule = AREA_NAME_RULES[inj.body_area];
      if (rule && rule.test(name)) return true;
    }
    // Ajustes manuales: "evitar" siempre; "precaución" solo con lesión activa en esa zona.
    for (const c of input.manualContra) {
      if (c.exercise_id !== ex.id) continue;
      if (c.severity === 'evitar' && allAreas.has(c.body_area)) return true;
      if (c.severity === 'precaucion' && injuryAreas.has(c.body_area)) return true;
    }
    return false;
  };

  // ---- Elegibilidad base ----
  const eligible = (ex: Exercise): boolean => {
    const need = requiredGear(ex);
    if (!need || !need.every((g) => gearSet.has(g))) return false;
    if ((LEVEL_RANK[ex.level ?? 'intermediate'] ?? 1) > maxRank) return false;
    if (cautious && ex.category && HIGH_RISK_CATS.has(ex.category)) return false;
    return !isExcludedByInjury(ex);
  };

  const pool = exercises.filter(eligible);
  const mainPool = pool.filter((e) => e.category && mainCats.has(e.category));
  const stretchPool = pool.filter((e) => e.category === 'stretching');
  const cardioPool = pool.filter((e) => e.category === 'cardio');

  // ---- Estructura de la semana ----
  const split = splitFor(daysPerWeek, rank);
  const count = clamp(Math.floor(minutes / 8), 4, 9);
  const used = new Set<string>();
  const missing = new Set<string>();
  const wantsCardio =
    styles.includes('cardio') || allGoals.includes('perder_grasa') || allGoals.includes('resistencia');
  const wantsMobility =
    styles.includes('movilidad') || allGoals.includes('movilidad') || allGoals.includes('postura');

  // Zonas a priorizar: las pedidas por la persona y, si busca mejorar postura, espalda y abdomen.
  const focusAreas = new Set(health.focus_areas ?? []);
  if (allGoals.includes('postura')) {
    focusAreas.add('espalda');
    focusAreas.add('abdomen');
  }
  const focusSlots = [...focusAreas].map((a) => FOCUS_SLOTS[a]).filter((s): s is string[] => !!s);

  const pick = (slot: Slot, index: number, dayUsed: Set<string>, allowPlyo: boolean): Exercise | null => {
    const wantCompound = index < 4;
    let best: Exercise | null = null;
    let bestScore = -Infinity;
    for (const ex of mainPool) {
      if (dayUsed.has(ex.id)) continue;
      if (!ex.primary_muscles.some((m) => slot.includes(m))) continue;
      if (ex.category === 'plyometrics' && !allowPlyo) continue;
      let score = rng() * 0.9;
      if (!used.has(ex.id)) score += 2;
      if (STAPLES.has(ex.name)) score += 4;
      // Con pesas disponibles, el peso corporal queda para el core y los estilos de calistenia.
      const bodyOnly = !ex.equipment || ex.equipment === 'body only';
      if (bodyOnly && !bodyweightOnly && gearSet.size > 2 && !slot.includes('abdominals')) score -= 2.5;
      if (styles.includes('fuerza') && ex.equipment === 'barbell' && ex.mechanic === 'compound') score += 1.5;
      if ((ex.mechanic === 'compound') === wantCompound) score += 1;
      if (ex.category && preferredCats.has(ex.category)) score += 1.5;
      if (score > bestScore) {
        best = ex;
        bestScore = score;
      }
    }
    return best;
  };

  const pickFrom = (list: Exercise[], muscles: Set<string>, dayUsed: Set<string>): Exercise | null => {
    let best: Exercise | null = null;
    let bestScore = -Infinity;
    for (const ex of list) {
      if (dayUsed.has(ex.id)) continue;
      let score = rng();
      if (!used.has(ex.id)) score += 1;
      if (ex.primary_muscles.some((m) => muscles.has(m))) score += 2;
      if (score > bestScore) {
        best = ex;
        bestScore = score;
      }
    }
    return best;
  };

  const toItem = (ex: Exercise): GeneratedExercise => ({
    exercise_id: ex.id,
    ...prescribe(ex, goal, styles, beginner),
  });

  const days: GeneratedDay[] = [];
  split.forEach((key, d) => {
    const tpl = TEMPLATES[key];
    const dayUsed = new Set<string>();
    const items: GeneratedExercise[] = [];
    const muscles = new Set<string>();
    let plyoCount = 0;

    // Zonas priorizadas: se agregan ejercicios extra solo en los días que trabajan esos músculos.
    const dayMuscles = new Set(tpl.slots.flat());
    const extra = focusSlots.filter((s) => s.some((m) => dayMuscles.has(m))).slice(0, 2);
    const daySlots = [...tpl.slots.slice(0, 4), ...extra, ...tpl.slots.slice(4)];
    const target = Math.min(10, count + extra.length);

    for (let i = 0; i < daySlots.length && items.length < target; i++) {
      const ex = pick(daySlots[i], i, dayUsed, plyoCount < 2);
      if (!ex) {
        missing.add(daySlots[i][0]);
        continue;
      }
      if (ex.category === 'plyometrics') plyoCount++;
      dayUsed.add(ex.id);
      used.add(ex.id);
      ex.primary_muscles.forEach((m) => muscles.add(m));
      items.push(toItem(ex));
    }

    if (wantsCardio && cardioPool.length > 0) {
      const c = pickFrom(cardioPool, muscles, dayUsed);
      if (c) {
        dayUsed.add(c.id);
        used.add(c.id);
        items.push(toItem(c));
      }
    }

    if (!stretchOnly && stretchPool.length > 0) {
      const stretches = wantsMobility ? 4 : 2;
      for (let s = 0; s < stretches; s++) {
        const st = pickFrom(stretchPool, muscles, dayUsed);
        if (!st) break;
        dayUsed.add(st.id);
        used.add(st.id);
        items.push(toItem(st));
      }
    }

    days.push({ day_index: d + 1, name: `Día ${d + 1} · ${tpl.name}`, exercises: items });
  });

  // ---- Avisos para la persona ----
  const labelArea = (a: string) => labelOf(BODY_AREA_OPTIONS, a).toLowerCase();

  if (styles.includes('no_se')) {
    notes.add('Como no elegiste una modalidad, armamos una rutina de musculación básica para partir.');
  }
  if (health.has_medical_condition) {
    notes.add('Indicaste una condición médica: consulta a tu médico antes de empezar y evita ejercicios de alta intensidad.');
  } else if (cautious) {
    notes.add('Ajustamos la rutina para tu edad evitando ejercicios de alto impacto y técnica muy exigente.');
  }
  if (injuryAreas.size > 0) {
    notes.add(
      `Excluimos ejercicios que cargan: ${[...injuryAreas].map(labelArea).join(', ')}. Igual consulta a tu kinesiólogo o médico.`,
    );
  }
  if (recoveredSurgeries.length > 0) {
    notes.add('Tienes cirugías ya recuperadas: parte con cargas bajas y avanza de a poco.');
  }
  if (styles.includes('halterofilia')) {
    if (!gearSet.has('plataforma')) {
      notes.add(
        'Elegiste halterofilia, pero este lugar no tiene plataforma de halterofilia. Incluimos fuerza base; los levantamientos olímpicos requieren plataforma y un entrenador.',
      );
    } else if (beginner) {
      notes.add('La halterofilia requiere mucha técnica: te recomendamos aprender con un entrenador antes de cargar peso.');
    }
  }
  if (styles.includes('fuerza') && beginner) {
    notes.add('Para fuerza máxima, parte con cargas moderadas y aprende bien la técnica antes de subir el peso.');
  }
  if (retomar) {
    notes.add(
      'Como retomas el ejercicio, usamos ejercicios básicos con cargas bajas. Sube el peso de a poco y detente si sientes dolor.',
    );
  }
  if (allGoals.includes('postura')) {
    notes.add('Reforzamos espalda y abdomen y sumamos estiramientos para ayudar a tu postura.');
  }
  if (focusAreas.size > 0) {
    notes.add(
      `Dimos más trabajo a: ${[...focusAreas].map((a) => labelOf(FOCUS_OPTIONS, a).toLowerCase()).join(', ')}.`,
    );
  }
  if (wantsCardio && cardioPool.length === 0) {
    notes.add('Para cardio en este lugar, suma caminata o trote de 15 a 20 minutos al final de cada sesión.');
  }
  if (place === 'smartfit' || place === 'otro_gimnasio') {
    notes.add(
      'Las máquinas varían según la sede. Si alguna no existe, pide a un instructor de sala un reemplazo equivalente.',
    );
  }
  if (gearSet.size === 0) {
    notes.add('No marcaste equipamiento para este lugar: usamos solo ejercicios con peso corporal.');
  }
  if (missing.size > 0) {
    notes.add(
      `Con tu equipamiento y tus lesiones no encontramos ejercicios para algunos grupos (${[...missing].join(', ')}). Un entrenador puede sugerirte alternativas.`,
    );
  }
  if (items0(days) === 0) {
    notes.add('No se pudo armar la rutina con los datos actuales. Revisa el equipamiento y tus lesiones.');
  }

  return {
    name: `Rutina ${labelOf(GOAL_OPTIONS, goal).toLowerCase()} · ${daysPerWeek} días`,
    goal,
    days_per_week: daysPerWeek,
    place,
    notes: [...notes],
    days,
  };
}

function items0(days: GeneratedDay[]): number {
  return days.reduce((n, d) => n + d.exercises.length, 0);
}
