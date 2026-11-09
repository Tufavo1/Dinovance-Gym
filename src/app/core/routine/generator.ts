import { CALISTHENICS_GEAR, requiredGear } from '../equipment';
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
} from '../models';
import { buildAthleteProfile, type AthleteProfile } from './athlete-profile';
import { KNOWN_NAMES } from './exercise-names';
import { cardioMinutes, estimateMinutes, prescribe } from './prescription';
import {
  AREA_BLOCKED_CATS,
  AREA_NAME_RULES,
  COOLDOWN_STRETCHES,
  FOCUS_SLOTS,
  GYM_CARDIO,
  HIGH_RISK_CATS,
  LEVEL_RANK,
  LOW_IMPACT_CARDIO,
  MAIN_LIFTS,
  MINOR_MUSCLES,
  MUSCLE_ES,
  NOT_FOR_ROUTINE,
  OUTDOOR_CARDIO,
  POSTPARTUM_AVOID,
  PREGNANCY_AVOID,
  STAPLES,
  STYLE_CATS,
  TEMPLATES,
  patternOf,
  splitFor,
  type Slot,
} from './rules';

/**
 * Generador de rutinas por REGLAS (sin IA), determinista para un mismo "seed".
 *
 * Orden de decisión:
 *  1. Perfil del atleta (historial, salud, hábitos)  -> nivel, volumen y precauciones.
 *  2. Lugar y equipamiento                            -> qué ejercicios son posibles.
 *  3. Lesiones / embarazo                             -> qué ejercicios se descartan.
 *  4. Objetivo, modalidad, zonas y género             -> qué se elige y cómo se prescribe.
 *  5. Tiempo disponible                               -> cuántos ejercicios caben.
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
  gender?: string | null;
  /** Ejercicios que la persona marcó como "no me gusta": nunca se proponen. */
  avoid?: string[];
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
  estimated_minutes: number;
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

const WARMUP_MINUTES = 5;
const MIN_EXERCISES = 4;
const MAX_EXERCISES = 10;
const GYMS = new Set(['smartfit', 'otro_gimnasio']);

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

const isPullUp = (name: string) => /^(pullups|chin-up)$/i.test(name);

/**
 * Equipo que exige un ejercicio, ajustado a lo que hay en el lugar. Algunas máquinas de
 * gimnasio (hip thrust, dominadas asistidas) no existen en el dataset y se resuelven aquí.
 */
function gearFor(ex: Exercise, gear: Set<string>, p: AthleteProfile): string[] | null {
  if (ex.name === 'Barbell Hip Thrust' && gear.has('hip_thrust')) return ['hip_thrust'];
  if (isPullUp(ex.name)) {
    // Una dominada completa es difícil: los principiantes solo la hacen con asistencia.
    if (gear.has('dominadas_asistidas')) return ['dominadas_asistidas'];
    return p.maxRank >= 1 ? ['barra_dominadas'] : null;
  }
  return requiredGear(ex);
}

/** Ajustes de un ejercicio según el equipo disponible (categoría, nivel y nota). */
function adapt(ex: Exercise, gear: Set<string>): { ex: Exercise; note: string | null } {
  if (ex.name === 'Barbell Hip Thrust' && gear.has('hip_thrust')) {
    return {
      ex: { ...ex, category: 'strength', level: 'beginner' },
      note: 'En la máquina de hip thrust',
    };
  }
  if (isPullUp(ex.name) && gear.has('dominadas_asistidas')) {
    return {
      ex: { ...ex, level: 'beginner' },
      note: 'En la máquina asistida: elige un contrapeso que te permita hacer las repeticiones',
    };
  }
  return { ex, note: null };
}

/**
 * Contexto común: perfil del atleta, equipo efectivo y ejercicios posibles (ya filtrados por
 * equipamiento, nivel, salud y preferencias). Lo usan el generador y la búsqueda de alternativas.
 */
function buildContext(input: GeneratorInput) {
  // ---- 1. Perfil del atleta ----
  const p = buildAthleteProfile(input.health, input.injuries, input.age, input.gender ?? null);
  const { goals, styles } = p;

  // ---- 2. Equipamiento efectivo ----
  const bodyweightOnly = styles.includes('gimnasia') && styles.every((s) => s === 'gimnasia' || s === 'movilidad');
  const gear = new Set(bodyweightOnly ? input.gear.filter((g) => CALISTHENICS_GEAR.includes(g)) : input.gear);

  // ---- Categorías según la modalidad ----
  const cats = new Set<string>();
  for (const s of styles) for (const c of STYLE_CATS[s] ?? ['strength']) cats.add(c);
  const mainCats = new Set([...cats].filter((c) => c !== 'stretching' && c !== 'cardio'));
  const stretchOnly = mainCats.size === 0;
  if (stretchOnly) mainCats.add('stretching');
  if (goals.includes('deporte') && !p.cautious && !stretchOnly) mainCats.add('plyometrics');
  const preferredCats = new Set<string>();
  if (styles.includes('fuerza')) preferredCats.add('powerlifting');
  if (styles.includes('halterofilia')) preferredCats.add('olympic weightlifting');

  // ---- 3. Exclusiones por salud ----
  const activeInjuries = input.injuries.filter((i) => i.status === 'activa');
  const isExcludedByHealth = (ex: Exercise): boolean => {
    const name = ex.name.toLowerCase();
    if (p.pregnant && PREGNANCY_AVOID.test(name)) return true;
    if (p.postpartum && POSTPARTUM_AVOID.test(name)) return true;
    for (const inj of activeInjuries) {
      const rows = input.areaMuscles.filter((a) => a.area === inj.body_area);
      const high = new Set(rows.filter((r) => r.risk === 'alto').map((r) => r.muscle));
      const mid = new Set(rows.filter((r) => r.risk === 'medio').map((r) => r.muscle));
      if (ex.category !== 'cardio' && ex.category !== 'stretching') {
        if (ex.primary_muscles.some((m) => high.has(m))) return true;
        if (ex.secondary_muscles.some((m) => high.has(m))) return true;
        if (inj.kind === 'cirugia' && ex.primary_muscles.some((m) => mid.has(m))) return true;
      }
      if (ex.category && AREA_BLOCKED_CATS[inj.body_area]?.includes(ex.category)) return true;
      if (AREA_NAME_RULES[inj.body_area]?.test(name)) return true;
    }
    for (const c of input.manualContra) {
      if (c.exercise_id !== ex.id) continue;
      if (c.severity === 'evitar' && p.allInjuryAreas.has(c.body_area)) return true;
      if (c.severity === 'precaucion' && p.activeInjuryAreas.has(c.body_area)) return true;
    }
    return false;
  };

  // ---- Pool de ejercicios posibles ----
  const avoid = new Set(input.avoid ?? []);
  const exerciseNote = new Map<string, string>();
  const pool: Exercise[] = [];
  for (const raw of input.exercises) {
    if (NOT_FOR_ROUTINE.test(raw.name)) continue;
    const need = gearFor(raw, gear, p);
    if (!need || !need.every((g) => gear.has(g))) continue;
    const { ex, note } = adapt(raw, gear);
    if ((LEVEL_RANK[ex.level ?? 'intermediate'] ?? 1) > p.maxRank) continue;
    if (p.cautious && ex.category && HIGH_RISK_CATS.has(ex.category)) continue;
    if (isExcludedByHealth(ex)) continue;
    if (avoid.has(ex.id)) continue;
    if (note) exerciseNote.set(ex.id, note);
    pool.push(ex);
  }

  const mainPool = pool.filter((e) => e.category && mainCats.has(e.category));
  const stretchPool = pool.filter(
    (e) => e.category === 'stretching' && (COOLDOWN_STRETCHES.has(e.name) || stretchOnly),
  );
  const cardioNames = GYMS.has(input.place) ? GYM_CARDIO : OUTDOOR_CARDIO;
  const cardioPool = pool
    .filter((e) => e.category === 'cardio' && cardioNames.includes(e.name))
    .filter(
      (e) =>
        !(p.lowerLimbInjury || p.pregnant || p.senior) ||
        LOW_IMPACT_CARDIO.has(e.name) ||
        e.name === 'Trail Running/Walking',
    );

  return {
    p,
    goals,
    styles,
    gear,
    bodyweightOnly,
    mainCats,
    stretchOnly,
    preferredCats,
    exerciseNote,
    mainPool,
    stretchPool,
    cardioPool,
  };
}

/** Prescripción + nota de máquina para un ejercicio, con su duración estimada. */
function itemFor(ex: Exercise, p: AthleteProfile, exerciseNote: Map<string, string>) {
  const r = prescribe(ex, p);
  const extra = exerciseNote.get(ex.id);
  return {
    item: { exercise_id: ex.id, ...r, notes: [extra, r.notes].filter(Boolean).join('. ') || null },
    minutes: estimateMinutes(ex, r, p),
  };
}

export interface Alternative {
  exercise: Exercise;
  item: GeneratedExercise;
}

/**
 * Alternativas seguras para reemplazar un ejercicio: trabajan el mismo músculo principal,
 * respetan equipamiento, nivel, lesiones y preferencias, y no repiten ejercicios de la rutina.
 */
export function findAlternatives(
  input: GeneratorInput,
  exerciseId: string,
  exclude: Iterable<string>,
  count = 4,
): Alternative[] {
  const original = input.exercises.find((e) => e.id === exerciseId);
  if (!original) return [];
  const ctx = buildContext(input);
  const skip = new Set([exerciseId, ...exclude]);
  const list =
    original.category === 'stretching'
      ? ctx.stretchPool
      : original.category === 'cardio'
        ? ctx.cardioPool
        : ctx.mainPool;
  const main = original.primary_muscles[0];
  const pattern = patternOf(original.name, original.id);

  return list
    .filter((e) => !skip.has(e.id) && e.primary_muscles.some((m) => original.primary_muscles.includes(m)))
    .map((e) => {
      let score = 0;
      if (STAPLES.has(e.name)) score += 3;
      if (KNOWN_NAMES.has(e.name)) score += 1;
      if (e.primary_muscles[0] === main) score += 1.5;
      if (e.mechanic === original.mechanic) score += 1;
      // Mismo patrón con otro equipo (ej: press en máquina -> press con mancuernas) es un buen cambio.
      if (patternOf(e.name, e.id) === pattern && e.equipment !== original.equipment) score += 0.5;
      const bodyOnly = !e.equipment || e.equipment === 'body only';
      if (bodyOnly && !ctx.bodyweightOnly && ctx.gear.size > 2 && !e.primary_muscles.includes('abdominals')) {
        score -= 2;
      }
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, count)
    .map(({ e }) => ({ exercise: e, item: itemFor(e, ctx.p, ctx.exerciseNote).item }));
}

export interface MuscleOption {
  exercise: Exercise;
  /** Prescripción recomendada según el perfil (la persona puede cambiarla). */
  item: GeneratedExercise;
  /** Entre los 3 mejores para este músculo. */
  recommended: boolean;
}

/**
 * Todos los ejercicios que le sirven a la persona para un músculo (equipo, nivel, salud y
 * preferencias), con los recomendados primero. Se usa para crear rutinas a mano.
 */
export function exercisesForMuscle(input: GeneratorInput, muscle: string): MuscleOption[] {
  const ctx = buildContext(input);
  return ctx.mainPool
    .filter((e) => e.primary_muscles.includes(muscle))
    .map((e) => {
      let score = 0;
      if (STAPLES.has(e.name)) score += 3;
      if (KNOWN_NAMES.has(e.name)) score += 1;
      if (e.primary_muscles[0] === muscle) score += 1;
      if (ctx.p.beginner && (e.equipment === 'machine' || e.equipment === 'cable')) score += 0.6;
      if (e.mechanic === 'compound') score += 0.5;
      const bodyOnly = !e.equipment || e.equipment === 'body only';
      if (
        bodyOnly &&
        !ctx.bodyweightOnly &&
        ctx.gear.size > 2 &&
        muscle !== 'abdominals' &&
        !ctx.exerciseNote.has(e.id)
      ) {
        score -= 2;
      }
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .map(({ e }, i) => ({ exercise: e, item: itemFor(e, ctx.p, ctx.exerciseNote).item, recommended: i < 3 }));
}

export function generateRoutine(input: GeneratorInput): GeneratedRoutine {
  const notes = new Set<string>();
  const rng = mulberry32(hash(input.seed));
  const {
    p,
    goals,
    styles,
    gear,
    bodyweightOnly,
    stretchOnly,
    preferredCats,
    exerciseNote,
    mainPool,
    stretchPool,
    cardioPool,
  } = buildContext(input);

  // ---- 4. Objetivo, zonas y género ----
  const wantsCardio = styles.includes('cardio') || goals.includes('perder_grasa') || goals.includes('resistencia');
  const wantsMobility = styles.includes('movilidad') || goals.includes('movilidad') || goals.includes('postura');

  const focusAreas = new Set(input.health.focus_areas ?? []);
  if (goals.includes('postura')) {
    focusAreas.add('espalda');
    focusAreas.add('abdomen');
  }
  let genderFocus: string[] = [];
  if (focusAreas.size === 0 && !goals.includes('postura')) {
    if (p.gender === 'femenino') genderFocus = ['gluteos'];
    else if (p.gender === 'masculino') genderFocus = ['pecho', 'espalda'];
    genderFocus.forEach((a) => focusAreas.add(a));
  }
  const focusSlots = [...focusAreas].map((a) => FOCUS_SLOTS[a]).filter((s): s is string[] => !!s);

  const used = new Set<string>();
  const trainedMuscles = new Set<string>();
  /** Músculos para los que no existe ningún ejercicio posible (no por falta de tiempo). */
  const unavailable = new Set<string>();

  const pick = (
    slot: Slot,
    index: number,
    dayUsed: Set<string>,
    dayPatterns: Set<string>,
    allowPlyo: boolean,
    force: 'push' | 'pull' | undefined,
  ) => {
    const wantCompound = index < 4;
    let best: Exercise | null = null;
    let bestScore = -Infinity;
    for (const ex of mainPool) {
      if (dayUsed.has(ex.id)) continue;
      if (!ex.primary_muscles.some((m) => slot.includes(m))) continue;
      if (ex.category === 'plyometrics' && !allowPlyo) continue;
      if (dayPatterns.has(patternOf(ex.name, ex.id))) continue;
      let score = rng() * 0.9;
      if (!used.has(ex.id)) score += 1.5;
      if (STAPLES.has(ex.name)) score += 4;
      if (KNOWN_NAMES.has(ex.name)) score += 0.5;
      // Con pesas disponibles, el peso corporal queda para el core y la calistenia.
      const bodyOnly = !ex.equipment || ex.equipment === 'body only';
      if (bodyOnly && !bodyweightOnly && gear.size > 2 && !slot.includes('abdominals') && !exerciseNote.has(ex.id)) {
        score -= 2.5;
      }
      // Principiantes: máquinas y poleas son más seguras para aprender.
      if (p.beginner && (ex.equipment === 'machine' || ex.equipment === 'cable')) score += 0.6;
      if (styles.includes('fuerza') && ex.equipment === 'barbell' && ex.mechanic === 'compound') score += 1.5;
      if ((ex.mechanic === 'compound') === wantCompound) score += 1;
      // Los básicos (sentadilla, press, jalón, remo...) van al inicio de la sesión.
      if (index < 2 && MAIN_LIFTS.has(patternOf(ex.name, ex.id))) score += 1;
      // En días de empuje o tirón se respeta el tipo de movimiento.
      if (force && ex.force_type) score += ex.force_type === force ? 1.5 : ex.force_type === 'static' ? 0 : -3;
      if (ex.category && preferredCats.has(ex.category)) score += 1.5;
      // Intermedios y avanzados: aprovechar ejercicios de su nivel.
      if (p.maxRank > 0 && (LEVEL_RANK[ex.level ?? ''] ?? 0) === p.maxRank) score += 0.8;
      if (score > bestScore) {
        best = ex;
        bestScore = score;
      }
    }
    return best;
  };

  const pickFrom = (list: Exercise[], muscles: Set<string>, dayUsed: Set<string>) => {
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

  const toItem = (ex: Exercise) => itemFor(ex, p, exerciseNote);

  // ---- 5. Construcción de los días (los días con la misma plantilla repiten ejercicios) ----
  const cardioReserve = wantsCardio && cardioPool.length > 0 ? cardioMinutes(p) : 0;
  const stretchCount = stretchOnly ? 0 : wantsMobility ? 4 : 2;
  const budget = Math.max(15, p.minutes - WARMUP_MINUTES - cardioReserve - stretchCount);

  const buildDay = (
    key: string,
  ): { name: string; items: GeneratedExercise[]; minutes: number; main: number; compounds: number } => {
    const tpl = TEMPLATES[key];
    const dayUsed = new Set<string>();
    const dayPatterns = new Set<string>();
    const muscles = new Set<string>();
    const items: GeneratedExercise[] = [];
    let minutes = WARMUP_MINUTES;
    let spent = 0;
    let plyo = 0;
    let compounds = 0;

    const dayMuscles = new Set(tpl.slots.flat());
    const dayHas = (m: string) =>
      dayMuscles.has(m) || (m === 'glutes' && (dayMuscles.has('hamstrings') || dayMuscles.has('quadriceps')));
    // Las zonas que eligió la persona suman hasta 2 ejercicios; el énfasis por género, solo 1.
    const extra = focusSlots.filter((s) => s.some(dayHas)).slice(0, genderFocus.length > 0 ? 1 : 2);
    const slots = [...tpl.slots.slice(0, 4), ...extra, ...tpl.slots.slice(4)];

    for (let i = 0; i < slots.length && items.length < MAX_EXERCISES; i++) {
      const slot = slots[i];
      const ex = pick(slot, i, dayUsed, dayPatterns, plyo < 2, tpl.force);
      if (!ex) {
        slot.forEach((m) => unavailable.add(m));
        continue;
      }
      const { item, minutes: m } = toItem(ex);
      if (items.length >= MIN_EXERCISES && spent + m > budget) break;
      if (ex.category === 'plyometrics') plyo++;
      if (ex.mechanic === 'compound' && !ex.primary_muscles.includes('abdominals')) compounds++;
      dayUsed.add(ex.id);
      dayPatterns.add(patternOf(ex.name, ex.id));
      used.add(ex.id);
      ex.primary_muscles.forEach((mu) => {
        muscles.add(mu);
        trainedMuscles.add(mu);
      });
      items.push(item);
      spent += m;
    }
    minutes += spent;
    const main = items.length;

    if (wantsCardio && cardioPool.length > 0) {
      const c = pickFrom(cardioPool, new Set(), dayUsed);
      if (c) {
        dayUsed.add(c.id);
        const { item, minutes: m } = toItem(c);
        items.push(item);
        minutes += m;
      }
    }

    for (let s = 0; s < stretchCount; s++) {
      const st = pickFrom(stretchPool, muscles, dayUsed);
      if (!st) break;
      dayUsed.add(st.id);
      const { item, minutes: m } = toItem(st);
      items.push(item);
      minutes += m;
    }

    return { name: tpl.name, items, minutes: Math.round(minutes / 5) * 5, main, compounds };
  };

  const buildWeek = (split: string[]) => {
    used.clear();
    trainedMuscles.clear();
    unavailable.clear();
    const built = new Map<string, ReturnType<typeof buildDay>>();
    for (const key of split) if (!built.has(key)) built.set(key, buildDay(key));
    return { split, built };
  };

  // Si una lesión deja algún día dividido casi vacío (por ejemplo "empuje" con el hombro
  // lesionado), se usa cuerpo completo: reparte lo que sí se puede hacer en todos los días.
  let week = buildWeek(splitFor(p.daysPerWeek, p.rank));
  // Un día sin ningún ejercicio compuesto (solo aislados) tampoco sirve como sesión principal.
  const thin = [...week.built.values()].some((d) => d.main < MIN_EXERCISES || d.compounds === 0);
  const isFullBody = week.split.every((k) => k.startsWith('FULL'));
  if (thin && !isFullBody) {
    week = buildWeek(Array.from({ length: p.daysPerWeek }, (_, i) => (i % 2 === 0 ? 'FULL_A' : 'FULL_B')));
    notes.add('Por tu lesión, la rutina es de cuerpo completo: así cada día tiene suficientes ejercicios seguros.');
  }

  const days: GeneratedDay[] = week.split.map((key, d) => {
    const day = week.built.get(key)!;
    return {
      day_index: d + 1,
      name: `Día ${d + 1} · ${day.name}`,
      estimated_minutes: day.minutes,
      exercises: day.items.map((e) => ({ ...e })),
    };
  });

  // ---- Avisos para la persona (lo más importante primero) ----
  const labelArea = (a: string) => labelOf(BODY_AREA_OPTIONS, a).toLowerCase();

  if (p.pregnant) {
    notes.add(
      'Estás embarazada: evitamos ejercicios boca arriba/abajo, impacto y presión abdominal. Tu matrona o médico debe aprobar esta rutina.',
    );
  } else if (p.postpartum) {
    notes.add(
      'Tuviste un bebé hace poco: evitamos el abdomen intenso y el impacto. Pide autorización a tu médico o matrona antes de empezar.',
    );
  }
  if (input.health.has_medical_condition) {
    notes.add('Indicaste una condición médica: consulta a tu médico antes de empezar y evita la alta intensidad.');
  } else if (p.senior) {
    notes.add('Ajustamos la rutina a tu edad: sin alto impacto ni técnica muy exigente.');
  }
  if (p.activeInjuryAreas.size > 0) {
    notes.add(
      `Excluimos ejercicios que cargan: ${[...p.activeInjuryAreas].map(labelArea).join(', ')}. Igual consulta a tu kinesiólogo o médico.`,
    );
  }
  if (p.recoveredSurgeries > 0) {
    notes.add('Tienes cirugías ya recuperadas: parte con cargas bajas y avanza de a poco.');
  }
  if (p.longLayoff) {
    notes.add('Llevas más de 6 meses sin entrenar: partimos como principiante y subirás de nivel de a poco.');
  } else if (p.midLayoff) {
    notes.add('Pasó un tiempo desde que entrenaste: limitamos la dificultad al inicio.');
  } else if (goals.includes('retomar')) {
    notes.add('Como retomas el ejercicio, usamos ejercicios básicos con cargas bajas. Detente si sientes dolor.');
  }
  if (p.starterVolume) {
    notes.add('Las primeras 2 semanas hacemos 2 series por ejercicio para que tu cuerpo se adapte. Luego sube a 3.');
  }
  if (p.poorSleep) {
    notes.add('Duermes poco: bajamos un poco el volumen. Dormir 7 a 8 horas mejora mucho tus resultados.');
  }
  if (p.sedentary && p.beginner) {
    notes.add('Vienes de una vida sedentaria: suma caminatas diarias y aumenta la intensidad gradualmente.');
  }
  if (p.beginner) {
    notes.add(
      'Elige un peso con el que termines cada serie sintiendo que podrías hacer 2 o 3 repeticiones más. La técnica va primero.',
    );
  }
  if (!stretchOnly) {
    notes.add('Antes de empezar: 5 minutos de cardio suave y 1 serie liviana del primer ejercicio.');
    notes.add('Cuando logres el máximo de repeticiones en todas las series, sube un poco el peso la siguiente vez.');
  }
  if (styles.includes('no_se')) {
    notes.add('Como no elegiste una modalidad, armamos una rutina de musculación básica para partir.');
  }
  if (styles.includes('halterofilia')) {
    notes.add(
      gear.has('plataforma')
        ? 'La halterofilia requiere mucha técnica: aprende con un entrenador antes de cargar peso.'
        : 'Elegiste halterofilia, pero este lugar no tiene plataforma. Incluimos fuerza base; los levantamientos olímpicos requieren plataforma y entrenador.',
    );
  }
  if (goals.includes('postura')) {
    notes.add('Reforzamos espalda y abdomen y sumamos estiramientos para ayudar a tu postura.');
  }
  if (genderFocus.length > 0) {
    notes.add(
      `Como no elegiste una zona a priorizar, dimos un poco más de trabajo a: ${genderFocus.map((a) => labelOf(FOCUS_OPTIONS, a).toLowerCase()).join(', ')}. Puedes cambiarlo en "Mis respuestas".`,
    );
  } else if (focusAreas.size > 0) {
    notes.add(
      `Dimos más trabajo a: ${[...focusAreas].map((a) => labelOf(FOCUS_OPTIONS, a).toLowerCase()).join(', ')}.`,
    );
  }
  if (wantsCardio && cardioPool.length === 0) {
    notes.add('Para cardio en este lugar, suma 15 a 20 minutos de caminata rápida al final de cada sesión.');
  }
  if (GYMS.has(input.place)) {
    notes.add('Si alguna máquina no está disponible en tu sede, pide al profesor de sala un reemplazo equivalente.');
  }
  if (gear.size === 0 && !stretchOnly) {
    notes.add(
      'No hay equipamiento en este lugar: usamos ejercicios con tu peso corporal. Unas bandas elásticas te darían muchas más opciones, sobre todo para la espalda.',
    );
  }
  const missing = [...unavailable].filter((m) => !trainedMuscles.has(m) && !MINOR_MUSCLES.has(m));
  if (missing.length > 0) {
    notes.add(
      `Con tu equipamiento y tu salud no encontramos ejercicios seguros para: ${missing.map((m) => MUSCLE_ES[m] ?? m).join(', ')}. Un profesor puede sugerirte alternativas.`,
    );
  }
  if (days.every((d) => d.exercises.length === 0)) {
    notes.add('No se pudo armar la rutina con los datos actuales. Revisa el equipamiento y tus lesiones.');
  }

  return {
    name: `Rutina ${labelOf(GOAL_OPTIONS, p.goal).toLowerCase()} · ${p.daysPerWeek} días`,
    goal: p.goal,
    days_per_week: p.daysPerWeek,
    place: input.place,
    notes: [...notes],
    days,
  };
}
