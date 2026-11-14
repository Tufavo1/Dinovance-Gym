import { CALISTHENICS_GEAR, requiredGear } from '../equipment';
import {
  BODY_AREA_OPTIONS,
  FOCUS_OPTIONS,
  FREQUENCY_GROUPS,
  GOAL_OPTIONS,
  labelOf,
  type AreaMuscle,
  type Exercise,
  type ExerciseContraindication,
  type HealthProfile,
  type InjuryRecord,
} from '../models';
import { LENGTHENED_BIAS, proteinTarget, weeklyRange } from '../evidence/programming';
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
  LOWER_DAY_KEYS,
  MINOR_MUSCLES,
  MUSCLE_ES,
  MUST_COVER_LOWER,
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
import { FREQUENCY_MUSCLES, bigGroupFrequency } from '../training/benchmarks';
import { muscleName, patternName, volumeKeyName } from '../anatomy/muscles';

/**
 * Generador de rutinas por REGLAS (sin IA y sin azar): los mismos datos dan siempre la misma rutina.
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
  /** Peso corporal (kg), para recomendar la proteína diaria. */
  weightKg?: number | null;
  /** Ya no se usa: el generador es determinista sin azar. Se conserva por compatibilidad. */
  seed: string;
  /** Ejercicios de la rutina que se está reemplazando (para variar lo que nunca se entrenó). */
  previous?: string[];
  /** Lo que dicen los registros reales de la persona (nunca de otra). Sin historial se omite. */
  history?: TrainingHistory;
}

/** Resumen del historial de entrenamiento de UNA persona, para que la rutina lo tenga en cuenta. */
export interface TrainingHistory {
  /** Ejercicios que la persona ya registró (sabe hacerlos y tienen progresión en curso). */
  performed: string[];
  /** Ejercicios con estancamiento detectado: conviene rotar a una variante equivalente. */
  stalled: string[];
  /** Horas desde la última vez que se trabajó cada clave de volumen como músculo principal. */
  hoursSince: Record<string, number>;
  /** Series directas por clave de volumen en los últimos 7 días. */
  weeklySets: Record<string, number>;
}

export interface GeneratedExercise {
  exercise_id: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
  /** RIR objetivo de las series de trabajo. */
  rir_min?: number | null;
  rir_max?: number | null;
  /** Tempo, solo cuando es relevante para el ejercicio. */
  tempo?: string | null;
  /** Por qué se eligió este ejercicio (reglas y datos concretos). */
  rationale?: string | null;
}

export interface GeneratedDay {
  day_index: number;
  name: string;
  estimated_minutes: number;
  /** Objetivo de la sesión. */
  objective?: string;
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
const GYMS = new Set(['smartfit', 'otro_gimnasio']);

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
  const p = buildAthleteProfile(input.health, input.injuries, input.age, input.gender ?? null, input.weightKg ?? null);
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
  const timed = r.reps_min === 1 && r.reps_max === 1;
  const strength = ex.category !== 'stretching' && ex.category !== 'cardio';
  const item: GeneratedExercise = {
    exercise_id: ex.id,
    ...r,
    notes: [extra, r.notes].filter(Boolean).join('. ') || null,
    rir_min: strength && !timed ? p.programme.rir[0] : null,
    rir_max: strength && !timed ? p.programme.rir[1] : null,
    tempo: strength && !timed ? tempoFor(ex) : null,
    rationale: null,
  };
  return { item, minutes: estimateMinutes(ex, r, p) };
}

/**
 * Tempo solo donde aporta: aislados de recorrido largo, aductores y pantorrillas, en los que el
 * error típico es rebotar o soltar la bajada. En el resto no se prescribe (no cambia el resultado).
 */
function tempoFor(ex: Exercise): string | null {
  const key = ex.primary_muscles[0];
  if (key === 'calves') return 'pausa 1 s abajo';
  if (key === 'adductors' || key === 'abductors') return 'bajada 2-3 s';
  if (ex.mechanic === 'isolation' && LENGTHENED_BIAS.test(ex.name)) return 'bajada 2-3 s';
  return null;
}

/** Equipo del ejercicio en palabras, para la justificación. */
const EQUIPMENT_ES: Record<string, string> = {
  barbell: 'barra',
  dumbbell: 'mancuernas',
  cable: 'polea',
  machine: 'máquina',
  kettlebells: 'kettlebell',
  bands: 'banda elástica',
  'e-z curl bar': 'barra EZ',
  'exercise ball': 'pelota',
  'medicine ball': 'balón medicinal',
  'body only': 'peso corporal',
};

/**
 * Justificación de un ejercicio: solo afirma lo que consta en su ficha (músculos, patrón, equipo,
 * nivel) y en el perfil o historial de la persona.
 */
export function rationaleFor(
  ex: Exercise,
  ctx: { slot?: string[]; p: AthleteProfile; history?: TrainingHistory; extra?: string },
): string {
  const parts: string[] = [];
  const main = (ex.muscles ?? []).filter((x) => x.role === 'principal').map((x) => muscleName(x.code));
  const secondary = (ex.muscles ?? []).filter((x) => x.role === 'secundario').map((x) => muscleName(x.code));
  const target = ctx.slot?.find((k) => ex.primary_muscles.includes(k)) ?? ex.primary_muscles[0];
  if (ctx.extra) parts.push(ctx.extra);
  if (target) parts.push(`Trabajo directo de ${volumeKeyName(target).toLowerCase()}`);
  if (ex.movement_pattern) parts.push(`patrón: ${patternName(ex.movement_pattern).toLowerCase()}`);
  let text = parts.join('; ') + '.';
  if (main.length) text += ` Músculos principales: ${main.join(', ')}.`;
  if (secondary.length) text += ` Secundarios: ${secondary.slice(0, 4).join(', ')}.`;
  const why: string[] = [];
  why.push(
    ex.mechanic === 'compound' ? 'compuesto' : ex.mechanic === 'isolation' ? 'aislamiento' : 'tipo no informado',
  );
  const eq = EQUIPMENT_ES[ex.equipment ?? 'body only'];
  if (eq) why.push(`con ${eq}, que marcaste como disponible`);
  if (ctx.p.beginner && (ex.equipment === 'machine' || ex.equipment === 'cable'))
    why.push('guiado, adecuado a tu nivel');
  if (LENGTHENED_BIAS.test(ex.name)) why.push('carga el músculo en posición alargada');
  if (ctx.history?.performed.includes(ex.id)) why.push('ya lo tienes registrado: continúa tu progresión');
  text += ` Elegido por: ${why.join('; ')}.`;
  text +=
    ex.review_status === 'verificado' ? ' Ficha verificada.' : ' Ficha pendiente de revisión (datos del dataset).';
  return text.slice(0, 600);
}

export interface Alternative {
  exercise: Exercise;
  item: GeneratedExercise;
  /** Justificación biomecánica de por qué sirve como reemplazo. */
  why?: string;
}

/**
 * Alternativas para reemplazar un ejercicio: mismo motor primario y mismo patrón de movimiento
 * (ver substitutionMatch), compatibles con el equipamiento, el nivel, las lesiones y las
 * preferencias de la persona, y sin repetir ejercicios de la rutina. Si no hay ninguna
 * equivalente, devuelve una lista vacía: no se ofrece "algo parecido".
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
  const strength = original.category !== 'stretching' && original.category !== 'cardio';
  const scored = list
    .filter((e) => !skip.has(e.id))
    .map((e) => ({ e, match: strength ? substitutionMatch(original, e) : looseMatch(original, e) }))
    .filter((x): x is { e: Exercise; match: SubstitutionMatch } => x.match !== null)
    .map(({ e, match }) => {
      let score = match.score;
      if (STAPLES.has(e.name)) score += 1.5;
      if (KNOWN_NAMES.has(e.name)) score += 0.5;
      if (e.review_status === 'verificado') score += 0.5;
      const bodyOnly = !e.equipment || e.equipment === 'body only';
      if (bodyOnly && !ctx.bodyweightOnly && ctx.gear.size > 2 && !e.primary_muscles.includes('abdominals')) {
        score -= 1;
      }
      return { e, score, match };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, count);

  return scored.map(({ e, match }) => {
    const item = itemFor(e, ctx.p, ctx.exerciseNote).item;
    item.rationale = rationaleFor(e, {
      p: ctx.p,
      extra: `Sustituye a ${original.name_es ?? original.name}: ${match.why}`,
    });
    return { exercise: e, item, why: match.why };
  });
}

export interface SubstitutionMatch {
  score: number;
  /** Justificación biomecánica de la equivalencia. */
  why: string;
}

/** Músculos principales detallados de un ejercicio (códigos), o las claves gruesas si no hay ficha. */
function mainCodes(ex: Exercise): string[] {
  const codes = (ex.muscles ?? []).filter((m) => m.role === 'principal').map((m) => m.code);
  return codes.length ? codes : ex.primary_muscles;
}

/**
 * ¿Puede `candidate` reemplazar a `original`? Solo si hay una equivalencia biomecánica:
 * el MISMO motor primario y, además, el mismo patrón de movimiento o (si falta el patrón de alguno)
 * el mismo tipo de ejercicio (compuesto/aislamiento). Trabajar "la misma zona" no basta: una
 * prensa no reemplaza a la máquina de aductores aunque ambas sean de pierna.
 */
export function substitutionMatch(original: Exercise, candidate: Exercise): SubstitutionMatch | null {
  const key = original.primary_muscles[0];
  if (!key || candidate.primary_muscles[0] !== key) return null;
  const samePattern =
    !!original.movement_pattern &&
    !!candidate.movement_pattern &&
    original.movement_pattern === candidate.movement_pattern;
  const patternUnknown = !original.movement_pattern || !candidate.movement_pattern;
  if (!samePattern && !(patternUnknown && original.mechanic === candidate.mechanic)) return null;

  const a = new Set(mainCodes(original));
  const shared = mainCodes(candidate).filter((c) => a.has(c));
  const secA = new Set(original.secondary_muscles);
  const sharedSecondary = candidate.secondary_muscles.filter((k) => secA.has(k)).length;

  let score = samePattern ? 4 : 1.5;
  score += Math.min(2, shared.length);
  score += Math.min(1, sharedSecondary * 0.25);
  if (candidate.mechanic === original.mechanic) score += 1;
  if (candidate.level === original.level) score += 0.5;

  const reasons = [`mismo músculo principal (${volumeKeyName(key).toLowerCase()})`];
  reasons.push(
    samePattern
      ? `mismo patrón de movimiento (${patternName(original.movement_pattern).toLowerCase()})`
      : 'patrón pendiente de revisión en alguno de los dos; coincide el tipo de ejercicio',
  );
  if (candidate.equipment !== original.equipment) {
    reasons.push(`con ${EQUIPMENT_ES[candidate.equipment ?? 'body only'] ?? 'otro equipo'}`);
  }
  return { score, why: reasons.join(', ') + '.' };
}

/** Estiramientos y cardio: basta con que trabajen el mismo músculo o sean el mismo tipo de cardio. */
function looseMatch(original: Exercise, candidate: Exercise): SubstitutionMatch | null {
  if (original.category === 'cardio') return { score: 1, why: 'otra opción de cardio disponible en tu lugar.' };
  return candidate.primary_muscles.some((m) => original.primary_muscles.includes(m))
    ? { score: 1, why: 'estira el mismo grupo muscular.' }
    : null;
}

/** Datos que faltan para generar una rutina segura. Si la lista no está vacía, se piden: no se adivinan. */
export function missingGeneratorData(
  input: Pick<GeneratorInput, 'health' | 'age' | 'place' | 'gear'> & { gearConfirmed: boolean },
): string[] {
  const h = input.health;
  const missing: string[] = [];
  if (!h.experience) missing.push('tu experiencia entrenando');
  if (!h.goal) missing.push('tu objetivo principal');
  if (!h.days_per_week) missing.push('cuántos días por semana puedes entrenar');
  if (!h.session_minutes) missing.push('cuánto dura cada sesión');
  if (!h.last_trained) missing.push('cuándo entrenaste por última vez');
  if (input.age === null) missing.push('tu fecha de nacimiento (edad)');
  if (!input.place) missing.push('el lugar donde entrenas');
  if (!input.gearConfirmed) missing.push('el equipamiento disponible en ese lugar');
  return missing;
}

/** Ids de ejercicios que sirven a esta persona (equipo, nivel, salud y preferencias). */
export function allowedExerciseIds(input: GeneratorInput): Set<string> {
  const ctx = buildContext(input);
  return new Set([...ctx.mainPool, ...ctx.stretchPool, ...ctx.cardioPool].map((e) => e.id));
}

/** Prescripción recomendada para un ejercicio que la persona agrega a mano. */
export function prescriptionFor(input: GeneratorInput, ex: Exercise): { item: GeneratedExercise; minutes: number } {
  const ctx = buildContext(input);
  return itemFor(ex, ctx.p, ctx.exerciseNote);
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
      if (LENGTHENED_BIAS.test(e.name)) score += 0.8;
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
  const performed = new Set(input.history?.performed ?? []);
  const stalled = new Set(input.history?.stalled ?? []);
  const previous = new Set(input.previous ?? []);
  const exById = new Map(input.exercises.map((e) => [e.id, e]));
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
      // Cada lugar de la plantilla lo ocupa un ejercicio cuyo MOTOR PRIMARIO es ese músculo: una prensa
      // (cuádriceps y glúteo) no cuenta como el ejercicio de isquiotibiales o glúteos del día.
      if (!slot.includes(ex.primary_muscles[0])) continue;
      if (ex.category === 'plyometrics' && !allowPlyo) continue;
      if (dayPatterns.has(patternOf(ex.name, ex.id))) continue;
      // Sin azar: la elección la deciden las reglas y, a igualdad de puntaje, el orden alfabético.
      let score = 0;
      if (!used.has(ex.id)) score += 1.5;
      // Al regenerar, lo que nunca se llegó a entrenar de la rutina anterior cede su lugar a una
      // alternativa equivalente (variedad); lo que ya tiene registros se conserva (progresión).
      if (previous.has(ex.id) && !performed.has(ex.id)) score -= 0.4;
      if (STAPLES.has(ex.name)) score += 4;
      // Ficha revisada a mano: se sabe con certeza qué trabaja.
      if (ex.review_status === 'verificado') score += 0.7;
      // Historial propio: se conserva lo que ya progresa y se rota lo que está estancado.
      if (performed.has(ex.id)) score += 0.6;
      if (stalled.has(ex.id)) score -= 3;
      if (KNOWN_NAMES.has(ex.name)) score += 0.5;
      // Tensión en posición alargada (Maeo, Wolf, Nippard): mejor estímulo por serie.
      if (LENGTHENED_BIAS.test(ex.name)) score += 0.8;
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
      if (score > bestScore || (score === bestScore && best !== null && ex.name < best.name)) {
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
      let score = 0;
      if (!used.has(ex.id)) score += 1;
      if (ex.primary_muscles.some((m) => muscles.has(m))) score += 2;
      if (score > bestScore || (score === bestScore && best !== null && ex.name < best.name)) {
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
  ): { name: string; items: GeneratedExercise[]; minutes: number; raw: number; main: number; compounds: number } => {
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

    for (let i = 0; i < slots.length && items.length < p.programme.maxExercises; i++) {
      const slot = slots[i];
      const ex = pick(slot, i, dayUsed, dayPatterns, plyo < 2, tpl.force);
      if (!ex) {
        slot.forEach((m) => unavailable.add(m));
        continue;
      }
      const { item, minutes: m } = toItem(ex);
      if (items.length >= MIN_EXERCISES && spent + m > budget) break;
      item.rationale = rationaleFor(ex, { slot, p, history: input.history });
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

    return { name: tpl.name, items, minutes: Math.round(minutes / 5) * 5, raw: minutes, main, compounds };
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
  let week = buildWeek(splitFor(p.daysPerWeek, p.rank, bigGroupFrequency(p.frequency.target)));
  // Un día sin ningún ejercicio compuesto (solo aislados) tampoco sirve como sesión principal.
  const thin = [...week.built.values()].some((d) => d.main < MIN_EXERCISES || d.compounds === 0);
  const isFullBody = week.split.every((k) => k.startsWith('FULL'));
  if (thin && !isFullBody) {
    week = buildWeek(Array.from({ length: p.daysPerWeek }, (_, i) => (i % 2 === 0 ? 'FULL_A' : 'FULL_B')));
    notes.add('Por tu lesión: cuerpo completo, con ejercicios seguros.');
  }

  // ---- Aductores, abductores y pantorrillas: al menos un ejercicio directo por semana ----
  // Si el tiempo los dejó fuera, entran en un día de tren inferior: se agregan si caben y, si no,
  // reemplazan al último ejercicio de un músculo que ese día ya tiene otro ejercicio (redundante).
  const coverageNotes: string[] = [];
  const lowerDays = [...new Set(week.split)].filter((k) => LOWER_DAY_KEYS.has(k)).map((k) => week.built.get(k)!);
  const weekHasLower = lowerDays.some((d) =>
    d.items.some((it) =>
      ['quadriceps', 'hamstrings', 'glutes'].includes(exById.get(it.exercise_id)?.primary_muscles[0] ?? ''),
    ),
  );
  if (weekHasLower && !stretchOnly) {
    for (const key of MUST_COVER_LOWER) {
      if (trainedMuscles.has(key)) continue;
      const candidates = mainPool
        .filter((e) => e.primary_muscles[0] === key && e.category !== 'plyometrics')
        .map((e) => ({
          e,
          score:
            (STAPLES.has(e.name) ? 4 : 0) +
            (e.review_status === 'verificado' ? 1 : 0) +
            (performed.has(e.id) ? 0.6 : 0) -
            (stalled.has(e.id) ? 3 : 0) +
            (p.beginner && (e.equipment === 'machine' || e.equipment === 'cable') ? 0.6 : 0),
        }))
        .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
      const chosen = candidates[0]?.e;
      if (!chosen) {
        const indirect = [...new Set(week.split)]
          .flatMap((k) => week.built.get(k)!.items)
          .map((it) => exById.get(it.exercise_id))
          .filter((e): e is Exercise => !!e && e.secondary_muscles.includes(key));
        coverageNotes.push(
          indirect.length > 0
            ? `${volumeKeyName(key)}: sin ejercicio directo posible con tu equipo; trabajo indirecto en ${indirect.length} ejercicio(s).`
            : `${volumeKeyName(key)}: no hay ejercicio posible con tu equipo y limitaciones.`,
        );
        continue;
      }
      const { item, minutes: full } = toItem(chosen);
      item.rationale = rationaleFor(chosen, {
        slot: [key],
        p,
        history: input.history,
        extra: `Regla de cobertura: ${volumeKeyName(key).toLowerCase()} con al menos un ejercicio directo por semana`,
      });
      // Día de tren inferior con menos ejercicios accesorios ya insertados y menos carga de trabajo.
      const covered = (d: (typeof lowerDays)[number]) =>
        d.items.filter((it) => MUST_COVER_LOWER.includes(exById.get(it.exercise_id)?.primary_muscles[0] ?? '')).length;
      const day = [...lowerDays].sort((a, b) => covered(a) - covered(b) || a.raw - b.raw)[0];
      const room = day.main < p.programme.maxExercises;
      let m = full;
      let fits = room && day.raw + m <= p.minutes + 3;
      // Si no cabe con todas sus series, entra con 2 (dosis mínima) antes que quedar fuera.
      // Aductores (prioridad de la persona) puede alargar la sesión hasta 8 minutos antes que
      // desplazar a un ejercicio principal; los demás grupos, no.
      const slack = key === 'adductors' ? 8 : 3;
      if (!fits && room && item.sets > 2) {
        const short = estimateMinutes(chosen, { ...item, sets: 2 }, p);
        if (day.raw + short <= p.minutes + slack) {
          item.sets = 2;
          m = short;
          fits = true;
          const over = Math.round(day.raw + short - p.minutes);
          coverageNotes.push(
            over > 3
              ? `${volumeKeyName(key)}: 2 series; la sesión se alarga unos ${over} min para no quitar un ejercicio principal.`
              : `${volumeKeyName(key)}: 2 series para que quepa en tu tiempo.`,
          );
        }
      }
      if (fits) {
        day.items.splice(day.main, 0, item);
        day.main += 1;
        day.raw += m;
      } else {
        const mainItems = day.items.slice(0, day.main);
        const keyOf = (i: number) => exById.get(mainItems[i].exercise_id)?.primary_muscles[0] ?? '';
        const count = new Map<string, number>();
        for (let i = 0; i < mainItems.length; i++) count.set(keyOf(i), (count.get(keyOf(i)) ?? 0) + 1);
        // Solo se reemplaza un ejercicio REDUNDANTE: su músculo ya tiene otro ejercicio ese mismo día.
        // Nunca los dos básicos del inicio ni otro ejercicio de cobertura.
        let idx = -1;
        for (let i = mainItems.length - 1; i >= 2; i--) {
          if (!MUST_COVER_LOWER.includes(keyOf(i)) && (count.get(keyOf(i)) ?? 0) > 1) {
            idx = i;
            break;
          }
        }
        // Aductores (prioridad de la persona): si no hay redundantes, cede su lugar el último ejercicio
        // cuyo músculo también se entrena otro día de la semana. Los demás grupos no desplazan a nadie.
        if (idx < 0 && key === 'adductors') {
          const elsewhere = (k: string) =>
            [...new Set(week.split)].some(
              (dk) =>
                week.built.get(dk) !== day &&
                week.built.get(dk)!.items.some((it) => exById.get(it.exercise_id)?.primary_muscles[0] === k),
            );
          for (let i = mainItems.length - 1; i >= 2; i--) {
            if (!MUST_COVER_LOWER.includes(keyOf(i)) && elsewhere(keyOf(i))) {
              idx = i;
              break;
            }
          }
          for (let i = mainItems.length - 1; idx < 0 && i >= 2; i--) if (!MUST_COVER_LOWER.includes(keyOf(i))) idx = i;
        }
        if (idx < 0) {
          coverageNotes.push(
            `${volumeKeyName(key)}: no cupo en la sesión sin quitar un ejercicio principal; con más tiempo por sesión se incluye.`,
          );
          continue;
        }
        const outItem = day.items[idx];
        const out = exById.get(outItem.exercise_id);
        if (out) day.raw += m - estimateMinutes(out, outItem, p);
        day.items[idx] = item;
        coverageNotes.push(
          `${volumeKeyName(key)}: entra en lugar de ${out ? (out.name_es ?? out.name) : 'otro ejercicio'} para no dejar el grupo sin trabajo directo.`,
        );
      }
      trainedMuscles.add(key);
      used.add(chosen.id);
    }
  }

  // ---- Ajuste de volumen semanal por músculo (Schoenfeld 2017; Israetel MEV a MRV) ----
  const exMap = new Map(input.exercises.map((e) => [e.id, e]));
  const isTimed = (it: GeneratedExercise) => it.reps_min === 1 && it.reps_max === 1;
  const weeklySetsOf = () => {
    const tot = new Map<string, number>();
    for (const key of week.split) {
      for (const it of week.built.get(key)!.items) {
        const m = exMap.get(it.exercise_id)?.primary_muscles[0];
        if (m && !isTimed(it)) tot.set(m, (tot.get(m) ?? 0) + it.sets);
      }
    }
    return tot;
  };
  const lowerBound = (m: string) => weeklyRange(m, p.programme)?.[0] ?? 0;
  const upperBound = (m: string) => weeklyRange(m, p.programme)?.[1] ?? 99;
  for (let guard = 0; guard < 40; guard++) {
    const now = weeklySetsOf();
    const lacking = [...now.entries()].find(([m, n]) => n < lowerBound(m));
    if (!lacking) break;
    let done = false;
    for (const day of new Set(week.split.map((k) => week.built.get(k)!))) {
      const it = day.items.find((x) => {
        const ex = exMap.get(x.exercise_id);
        return ex?.primary_muscles[0] === lacking[0] && !isTimed(x) && x.sets < p.programme.maxSetsPerExercise;
      });
      if (!it) continue;
      const extra = (it.reps_max * 3.5 + it.rest_seconds) / 60;
      if (day.raw + extra > p.minutes) continue;
      it.sets += 1;
      day.raw += extra;
      done = true;
      break;
    }
    if (!done) break;
  }
  for (let guard = 0; guard < 40; guard++) {
    const now = weeklySetsOf();
    const over = [...now.entries()].find(([m, n]) => n > upperBound(m));
    if (!over) break;
    let done = false;
    for (const day of new Set(week.split.map((k) => week.built.get(k)!))) {
      const it = day.items.find(
        (x) => exMap.get(x.exercise_id)?.primary_muscles[0] === over[0] && !isTimed(x) && x.sets > 2,
      );
      if (!it) continue;
      it.sets -= 1;
      day.raw -= (it.reps_max * 3.5 + it.rest_seconds) / 60;
      done = true;
      break;
    }
    if (!done) break;
  }
  for (const d of week.built.values()) d.minutes = Math.round(d.raw / 5) * 5;

  // ---- Marcas de fuerza y frecuencia pedida ----
  if (p.strength) {
    notes.add(
      `Tus marcas indican nivel ${['principiante', 'intermedio', 'avanzado'][p.strength.rank]}: las cargas parten de ahí.`,
    );
  }
  for (const g of p.frequency.raised) {
    notes.add(`${labelOf(FREQUENCY_GROUPS, g)}: subimos de 1× a 2× por semana, rinde más.`);
  }
  const shortOf: string[] = [];
  for (const [g, want] of Object.entries(p.frequency.target)) {
    const muscles = FREQUENCY_MUSCLES[g] ?? [];
    const got = week.split.filter((k) =>
      week.built
        .get(k)!
        .items.some((it) => !isTimed(it) && muscles.includes(exMap.get(it.exercise_id)?.primary_muscles[0] ?? '')),
    ).length;
    if (got < want) shortOf.push(`${labelOf(FREQUENCY_GROUPS, g).toLowerCase()} ${got}× (pediste ${want}×)`);
  }
  if (shortOf.length > 0) notes.add(`Con tus ${p.daysPerWeek} días quedó: ${shortOf.join(', ')}.`);

  /** Claves de volumen con trabajo directo en un día. */
  const directKeysOf = (key: string): string[] => [
    ...new Set(
      week.built
        .get(key)!
        .items.filter((it) => !isTimed(it))
        .map((it) => exMap.get(it.exercise_id)?.primary_muscles[0])
        .filter((k): k is string => !!k),
    ),
  ];

  const days: GeneratedDay[] = week.split.map((key, d) => {
    const day = week.built.get(key)!;
    const keys = directKeysOf(key);
    return {
      day_index: d + 1,
      name: `Día ${d + 1} · ${day.name}`,
      estimated_minutes: day.minutes,
      objective: keys.length
        ? `${labelOf(GOAL_OPTIONS, p.goal)}: trabajo directo de ${keys.map((k) => volumeKeyName(k).toLowerCase()).join(', ')}.`
        : `${labelOf(GOAL_OPTIONS, p.goal)}.`,
      exercises: day.items.map((e) => ({ ...e })),
    };
  });

  // ---- Recuperación entre sesiones consecutivas ----
  const allFullBody = week.split.every((k) => k.startsWith('FULL'));
  if (allFullBody && week.split.length > 1) {
    notes.add(
      'Cuerpo completo: cada sesión repite grupos musculares, deja al menos un día de descanso entre sesiones.',
    );
  }
  for (let d = 0; !allFullBody && d + 1 < week.split.length; d++) {
    const a = new Set(directKeysOf(week.split[d]));
    const shared = directKeysOf(week.split[d + 1]).filter((k) => a.has(k) && k !== 'abdominals');
    if (shared.length > 0) {
      notes.add(
        `Día ${d + 1} y Día ${d + 2} comparten ${shared.map((k) => volumeKeyName(k).toLowerCase()).join(', ')}: deja al menos un día de descanso entre ellos.`,
      );
    }
  }
  // Con historial: avisa si el primer día repite un grupo entrenado hace menos de 48 h.
  if (input.history && days.length > 0) {
    const recent = directKeysOf(week.split[0]).filter((k) => (input.history!.hoursSince[k] ?? Infinity) < 48);
    if (recent.length > 0) {
      const alt = week.split.findIndex((k) =>
        directKeysOf(k).every((m) => (input.history!.hoursSince[m] ?? Infinity) >= 48),
      );
      notes.add(
        `Según tus registros entrenaste ${recent.map((k) => volumeKeyName(k).toLowerCase()).join(', ')} hace menos de 48 h: ${
          alt > 0 ? `empieza por el Día ${alt + 1}` : 'espera un día antes de empezar'
        }.`,
      );
    }
  }
  for (const n of coverageNotes) notes.add(n);

  // ---- Avisos para la persona (lo más importante primero) ----
  const labelArea = (a: string) => labelOf(BODY_AREA_OPTIONS, a).toLowerCase();

  if (p.pregnant) {
    notes.add('Embarazo: sin impacto ni presión abdominal. Que tu médico la apruebe.');
  } else if (p.postpartum) {
    notes.add('Posparto: sin abdomen intenso ni impacto. Pide el visto bueno médico.');
  }
  if (input.health.has_medical_condition) {
    notes.add('Condición médica: consulta a tu médico antes de empezar.');
  } else if (p.senior) {
    notes.add('Ajustada a tu edad: sin impacto fuerte.');
  }
  if (p.activeInjuryAreas.size > 0) {
    notes.add(`Sin ejercicios que carguen: ${[...p.activeInjuryAreas].map(labelArea).join(', ')}.`);
  }
  if (p.recoveredSurgeries > 0) {
    notes.add('Cirugías previas: empieza con cargas bajas.');
  }
  if (p.longLayoff) {
    notes.add('Más de 6 meses sin entrenar: partes como principiante.');
  } else if (p.midLayoff) {
    notes.add('Hace un tiempo sin entrenar: empiezas suave.');
  } else if (goals.includes('retomar')) {
    notes.add('Retomas: ejercicios básicos y poco peso.');
  }
  if (p.starterVolume) {
    notes.add('Primeras 2 semanas: 2 series. Luego 3.');
  }
  if (p.poorSleep) {
    notes.add('Duermes poco: menos series. Dormir 7-8 h ayuda mucho.');
  }
  if (p.sedentary && p.beginner) {
    notes.add('Camina a diario y sube la intensidad de a poco.');
  }
  if (!stretchOnly) {
    const [r0, r1] = p.programme.rir;
    notes.add(
      r0 === 0
        ? `Termina cada serie cerca del fallo (máx. ${r1} reps en reserva).`
        : `Termina cada serie con ${r0}-${r1} reps en reserva; la técnica va primero.`,
    );
    notes.add('Calienta: 5 min de cardio suave y 1 serie liviana.');
    notes.add('Cuando completes todas las reps, sube un poco el peso.');
    const weeks = p.programme.mesocycleWeeks;
    notes.add(`Semana ${weeks + 1}: descarga con la mitad de series.`);
  }
  if (p.programme.approach === 'alta_intensidad') {
    notes.add('Pocas series muy exigentes y descansos largos entre días.');
    if (input.health.days_per_week && input.health.days_per_week > p.programme.maxDays) {
      notes.add(`Con este enfoque bastan ${p.programme.maxDays} días.`);
    }
  } else if (p.programme.approach === 'alto_volumen') {
    notes.add('Alto volumen: si no te recuperas, baja una serie.');
  }
  if (p.highStress) {
    notes.add('Estrés alto: menos series para que te recuperes.');
  }
  const protein = proteinTarget(input.weightKg ?? null, input.health.nutrition_phase);
  if (protein) {
    notes.add(`Proteína al día: ${protein[0]}-${protein[1]} g.`);
  }
  if (wantsCardio && !stretchOnly) {
    notes.add('Cardio después de las pesas, a ritmo moderado.');
  }
  if (styles.includes('no_se')) {
    notes.add('Rutina básica de musculación para partir.');
  }
  if (styles.includes('halterofilia')) {
    notes.add(
      gear.has('plataforma')
        ? 'Halterofilia: aprende la técnica con un entrenador.'
        : 'Sin plataforma: solo fuerza base, no levantamientos olímpicos.',
    );
  }
  if (goals.includes('postura')) {
    notes.add('Más espalda, abdomen y estiramientos para tu postura.');
  }
  if (genderFocus.length > 0) {
    notes.add(`Más trabajo en: ${genderFocus.map((a) => labelOf(FOCUS_OPTIONS, a).toLowerCase()).join(', ')}.`);
  } else if (focusAreas.size > 0) {
    notes.add(`Más trabajo en: ${[...focusAreas].map((a) => labelOf(FOCUS_OPTIONS, a).toLowerCase()).join(', ')}.`);
  }
  if (wantsCardio && cardioPool.length === 0) {
    notes.add('Cardio: 15-20 min de caminata rápida al final.');
  }
  if (GYMS.has(input.place)) {
    notes.add('Si falta una máquina, pide un reemplazo al profesor.');
  }
  if (gear.size === 0 && !stretchOnly) {
    notes.add('Sin equipo: ejercicios con tu peso. Unas bandas ayudan mucho.');
  }
  const missing = [...unavailable].filter((m) => !trainedMuscles.has(m) && !MINOR_MUSCLES.has(m));
  if (missing.length > 0) {
    notes.add(`Sin ejercicios seguros para: ${missing.map((m) => MUSCLE_ES[m] ?? m).join(', ')}.`);
  }
  if (days.every((d) => d.exercises.length === 0)) {
    notes.add('No se pudo armar la rutina. Revisa tu equipo y lesiones.');
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
