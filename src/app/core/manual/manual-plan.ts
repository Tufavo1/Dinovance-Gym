import type { Exercise } from '../models';
import type { AthleteProfile } from '../routine/athlete-profile';
import { estimateMinutes } from '../routine/prescription';
import { MAIN_LIFTS, MUSCLE_ES, patternOf } from '../routine/rules';

/**
 * Reglas para rutinas creadas a mano. La persona decide todo, pero la app "contradice" con
 * argumentos cuando algo no conviene y propone cómo arreglarlo:
 *
 * - Recuperación: un músculo entrenado fuerte necesita ~48 h (Schoenfeld et al., 2016).
 * - Volumen: 10-20 series semanales por músculo para hipertrofia; más de ~10 por sesión rinde poco.
 * - Equilibrio: empuje/tirón y cuádriceps/isquiotibiales para cuidar postura y rodillas.
 * - Orden: primero los ejercicios grandes (compuestos), cuando hay más energía.
 * - Tiempo: la sesión debe caber en los minutos disponibles.
 */

export interface PlanItem {
  exercise: Exercise;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
  /** Lo recomendado para la persona (para poder volver a ello). */
  recommended: { sets: number; reps_min: number; reps_max: number; rest_seconds: number };
}

export type PlanDay = PlanItem[];

/** Más de 12 ejercicios en un día no es una sesión realista: la calidad de las series cae. */
export const MAX_EXERCISES_PER_DAY = 12;
/** Más de 4 ejercicios para el mismo músculo en un día solo suma fatiga. */
export const MAX_EXERCISES_PER_MUSCLE = 4;

export type AddCheck =
  { ok: true } | { ok: false; reason: 'dia_lleno' | 'musculo_lleno' | 'repetido'; text: string; muscle?: string };

/** ¿Se puede agregar este ejercicio al día? Si no, explica por qué. */
export function canAdd(day: PlanDay, exercise: Exercise): AddCheck {
  if (day.some((it) => it.exercise.id === exercise.id)) {
    return { ok: false, reason: 'repetido', text: 'Ese ejercicio ya está en este día.' };
  }
  if (day.length >= MAX_EXERCISES_PER_DAY) {
    return {
      ok: false,
      reason: 'dia_lleno',
      text: `Este día ya tiene ${MAX_EXERCISES_PER_DAY} ejercicios, el máximo. Con más la sesión se alarga demasiado y la calidad de las series cae. Quita uno o usa otro día.`,
    };
  }
  const muscle = exercise.primary_muscles[0];
  const same = day.filter((it) => isStrength(it.exercise) && it.exercise.primary_muscles[0] === muscle).length;
  if (muscle && isStrength(exercise) && same >= MAX_EXERCISES_PER_MUSCLE) {
    return {
      ok: false,
      reason: 'musculo_lleno',
      muscle,
      text: `Ya tienes ${same} ejercicios de ${label(muscle)} en este día. Más de ${MAX_EXERCISES_PER_MUSCLE} solo suma fatiga: es mejor llevarlo a otro día.`,
    };
  }
  return { ok: true };
}

/** Minutos estimados que tendría el día si se agrega este ejercicio. */
export function minutesWith(day: PlanDay, extra: PlanItem, p: AthleteProfile): number {
  return dayMinutes([...day, extra], p);
}

export type WarningLevel = 'alto' | 'medio' | 'info';

export interface PlanAction {
  kind: 'move' | 'sort';
  label: string;
  day: number;
  toDay?: number;
  muscle?: string;
}

export interface PlanWarning {
  id: string;
  level: WarningLevel;
  /** Día al que se refiere (si es de un día en particular). */
  day?: number;
  text: string;
  action?: PlanAction;
}

export interface MuscleVolume {
  muscle: string;
  label: string;
  sets: number;
  status: 'bajo' | 'optimo' | 'alto';
}

export interface PlanAnalysis {
  warnings: PlanWarning[];
  weekly: MuscleVolume[];
  dayMinutes: number[];
  totalSets: number;
  intensity: { level: 1 | 2 | 3 | 4; label: string; text: string };
}

/** Músculos que se recuperan rápido: se pueden entrenar días seguidos. */
const FAST_RECOVERY = new Set(['abdominals', 'calves', 'forearms']);
/** Grupos principales: se avisa si una rutina los deja fuera. */
const MAJOR = ['chest', 'lats', 'middle back', 'shoulders', 'quadriceps', 'hamstrings', 'glutes'];
const PUSH = new Set(['chest', 'shoulders', 'triceps']);
const PULL = new Set(['lats', 'middle back', 'biceps']);
const SPINAL = /deadlift|good morning|bent over barbell row|barbell (full )?squat|barbell lunge/i;

const label = (m: string) => MUSCLE_ES[m] ?? m;
const isStrength = (e: Exercise) => e.category !== 'stretching' && e.category !== 'cardio';

/** Series por músculo en un día: músculo principal cuenta 1, secundario 0,5. */
export function daySets(day: PlanDay): Map<string, number> {
  const map = new Map<string, number>();
  for (const it of day) {
    if (!isStrength(it.exercise)) continue;
    for (const m of it.exercise.primary_muscles) map.set(m, (map.get(m) ?? 0) + it.sets);
    for (const m of it.exercise.secondary_muscles) map.set(m, (map.get(m) ?? 0) + it.sets * 0.5);
  }
  return map;
}

/** Series de un músculo como principal (para decidir conflictos). */
function primarySets(day: PlanDay, muscle: string): number {
  return day
    .filter((it) => isStrength(it.exercise) && it.exercise.primary_muscles.includes(muscle))
    .reduce((n, it) => n + it.sets, 0);
}

/** ¿Este músculo se entrena fuerte el día anterior o el siguiente? */
export function neighborConflict(days: PlanDay[], dayIdx: number, muscle: string): number | null {
  if (FAST_RECOVERY.has(muscle)) return null;
  for (const n of [dayIdx - 1, dayIdx + 1]) {
    if (n >= 0 && n < days.length && primarySets(days[n], muscle) >= 2) return n;
  }
  return null;
}

/**
 * Mejor día para un músculo: sin conflicto de recuperación y con menos carga.
 * `from` es el día desde donde se movería (se considera ya sin ese músculo).
 */
export function suggestDay(days: PlanDay[], muscle: string, exclude: number[] = [], from?: number): number | null {
  const view =
    from === undefined
      ? days
      : days.map((d, i) => (i === from ? d.filter((it) => !it.exercise.primary_muscles.includes(muscle)) : d));
  let best: number | null = null;
  let bestLoad = Infinity;
  view.forEach((day, i) => {
    if (exclude.includes(i) || i === from) return;
    if (neighborConflict(view, i, muscle) !== null) return;
    if (primarySets(day, muscle) > 0) return;
    const load = day.reduce((n, it) => n + it.sets, 0);
    if (load < bestLoad) {
      best = i;
      bestLoad = load;
    }
  });
  return best;
}

/** Orden recomendado: básicos compuestos, luego aislados, abdomen y al final estiramientos/cardio. */
export function sortDay(day: PlanDay): PlanDay {
  const rank = (it: PlanItem) => {
    const e = it.exercise;
    if (e.category === 'stretching') return 5;
    if (e.category === 'cardio') return 4;
    if (e.primary_muscles.includes('abdominals')) return 3;
    if (MAIN_LIFTS.has(patternOf(e.name, e.id))) return 0;
    return e.mechanic === 'compound' ? 1 : 2;
  };
  return [...day].sort((a, b) => rank(a) - rank(b));
}

/** Mueve los ejercicios de un músculo de un día a otro. */
export function moveMuscle(days: PlanDay[], from: number, to: number, muscle: string): PlanDay[] {
  const moving = days[from].filter((it) => it.exercise.primary_muscles.includes(muscle));
  return days.map((day, i) => {
    if (i === from) return day.filter((it) => !moving.includes(it));
    if (i === to) return sortDay([...day, ...moving.filter((m) => !day.some((d) => d.exercise.id === m.exercise.id))]);
    return day;
  });
}

function dayMinutes(day: PlanDay, p: AthleteProfile): number {
  if (day.length === 0) return 0;
  const work = day.reduce((n, it) => n + estimateMinutes(it.exercise, it, p), 0);
  return Math.round((5 + work) / 5) * 5; // 5 min de calentamiento
}

/** Rango semanal de series por músculo según el nivel (principiantes necesitan menos). */
function weeklyRange(p: AthleteProfile): [number, number] {
  return p.beginner ? [6, 15] : [10, 20];
}

/**
 * @param blocked músculos que la persona no debe entrenar (lesión activa): nunca se sugieren.
 */
export function analyzePlan(days: PlanDay[], p: AthleteProfile, blocked: Set<string> = new Set()): PlanAnalysis {
  const warnings: PlanWarning[] = [];
  const perDay = days.map(daySets);
  const minutes = days.map((d) => dayMinutes(d, p));

  days.forEach((day, i) => {
    const n = i + 1;
    if (day.length === 0) {
      warnings.push({ id: `vacio-${i}`, day: i, level: 'info', text: `El Día ${n} todavía no tiene ejercicios.` });
      return;
    }

    // 1. Recuperación: mismo músculo en días seguidos.
    for (const [muscle, sets] of perDay[i]) {
      if (sets < 2 || FAST_RECOVERY.has(muscle) || primarySets(day, muscle) < 2) continue;
      const prev = i > 0 && primarySets(days[i - 1], muscle) >= 2;
      if (!prev) continue;
      const to = suggestDay(days, muscle, [i - 1], i);
      warnings.push({
        id: `seguido-${muscle}-${i}`,
        day: i,
        level: 'alto',
        text: `Entrenas ${label(muscle)} el Día ${i} y el Día ${n} seguidos. Un músculo trabajado fuerte necesita unas 48 horas para recuperarse y crecer.`,
        action:
          to !== null
            ? { kind: 'move', label: `Llevar ${label(muscle)} al Día ${to + 1}`, day: i, toDay: to, muscle }
            : undefined,
      });
    }

    // 2. Volumen por sesión.
    for (const [muscle] of perDay[i]) {
      const sets = primarySets(day, muscle);
      if (sets > 10) {
        const to = suggestDay(days, muscle, [], i);
        warnings.push({
          id: `sesion-${muscle}-${i}`,
          day: i,
          level: 'medio',
          text: `${sets} series de ${label(muscle)} en el Día ${n}: pasar de ~10 en una sesión casi no suma y aumenta la fatiga. Mejor repartirlas.`,
          action:
            to !== null
              ? { kind: 'move', label: `Pasar ${label(muscle)} al Día ${to + 1}`, day: i, toDay: to, muscle }
              : undefined,
        });
      }
    }

    // 3. Tiempo disponible.
    if (minutes[i] > p.minutes + 10) {
      warnings.push({
        id: `tiempo-${i}`,
        day: i,
        level: 'medio',
        text: `El Día ${n} dura unos ${minutes[i]} min y dijiste que tienes ${p.minutes}. Quita series o ejercicios para no apurarte (la técnica se pierde).`,
      });
    }

    // 4. Orden: compuestos primero.
    const sorted = sortDay(day);
    if (sorted.some((it, k) => it !== day[k])) {
      warnings.push({
        id: `orden-${i}`,
        day: i,
        level: 'info',
        text: `En el Día ${n} conviene hacer primero los ejercicios grandes, cuando tienes más energía.`,
        action: { kind: 'sort', label: 'Ordenar automáticamente', day: i },
      });
    }

    // 5. Carga lumbar acumulada.
    const spinal = day.filter((it) => SPINAL.test(it.exercise.name));
    if (spinal.length >= 2 && (p.beginner || p.activeInjuryAreas.has('espalda_baja'))) {
      warnings.push({
        id: `lumbar-${i}`,
        day: i,
        level: 'alto',
        text: `El Día ${n} junta ${spinal.length} ejercicios pesados para la zona lumbar. Para tu nivel es mejor separarlos en días distintos.`,
      });
    }
  });

  // 6. Volumen semanal por músculo.
  const totals = new Map<string, number>();
  for (const d of perDay) for (const [m, s] of d) totals.set(m, (totals.get(m) ?? 0) + s);
  const [low, high] = weeklyRange(p);
  const weekly: MuscleVolume[] = [...totals.entries()]
    .filter(([m]) => m !== 'lower back' || (totals.get(m) ?? 0) >= 1)
    .map(([muscle, s]) => {
      const sets = Math.round(s * 2) / 2;
      const status: MuscleVolume['status'] = sets < low ? 'bajo' : sets > high ? 'alto' : 'optimo';
      return { muscle, label: label(muscle), sets, status };
    })
    .sort((a, b) => b.sets - a.sets);

  for (const v of weekly) {
    if (v.status === 'alto' && MAJOR.includes(v.muscle)) {
      warnings.push({
        id: `semana-alto-${v.muscle}`,
        level: 'medio',
        text: `${v.sets} series semanales de ${v.label}: sobre ${high} cuesta recuperarse. Baja algunas series.`,
      });
    }
  }

  const trained = new Set(weekly.filter((v) => v.sets >= 1).map((v) => v.muscle));
  const anyExercise = days.some((d) => d.length > 0);
  if (anyExercise) {
    const missing = MAJOR.filter((m) => !trained.has(m) && !blocked.has(m));
    const legs = ['quadriceps', 'hamstrings', 'glutes'].filter((m) => !trained.has(m) && !blocked.has(m));
    if (legs.length === 3) {
      warnings.push({
        id: 'sin-piernas',
        level: 'medio',
        text: 'No entrenas piernas ni glúteos: son los músculos más grandes y ayudan a tu salud y a quemar más energía.',
      });
    } else if (missing.length > 0 && missing.length <= 3) {
      warnings.push({
        id: 'faltan',
        level: 'info',
        text: `Para un plan equilibrado te faltan: ${missing.map(label).join(', ')}.`,
      });
    }

    // 7. Equilibrio empuje / tirón y cuádriceps / isquiotibiales.
    const sum = (set: Set<string>) => weekly.filter((v) => set.has(v.muscle)).reduce((n, v) => n + v.sets, 0);
    const push = sum(PUSH);
    const pull = sum(PULL);
    if (push >= 6 && push > pull * 1.5) {
      warnings.push({
        id: 'empuje-tiron',
        level: 'medio',
        text: `Haces más empuje (${push} series) que tirón (${pull}). Con el tiempo cierra los hombros hacia adelante: suma ejercicios de espalda.`,
      });
    }
    const quads = totals.get('quadriceps') ?? 0;
    const hams = totals.get('hamstrings') ?? 0;
    if (quads >= 6 && quads > hams * 2 && !blocked.has('hamstrings')) {
      warnings.push({
        id: 'cuad-isquio',
        level: 'info',
        text: 'Trabajas mucho más el cuádriceps que la parte de atrás del muslo. Equilibrarlos cuida tus rodillas.',
      });
    }
  }

  // 8. Intensidad total.
  const totalSets = days
    .flat()
    .filter((it) => isStrength(it.exercise))
    .reduce((n, it) => n + it.sets, 0);
  const majors = weekly.filter((v) => MAJOR.includes(v.muscle));
  const avg = majors.length ? majors.reduce((n, v) => n + v.sets, 0) / majors.length : 0;
  const intensity =
    avg === 0
      ? { level: 1 as const, label: 'Sin datos', text: 'Agrega ejercicios para calcularla.' }
      : avg < low
        ? {
            level: 1 as const,
            label: 'Baja',
            text: 'Buena para empezar o retomar. Para progresar, suma series de a poco.',
          }
        : avg <= (low + high) / 2
          ? {
              level: 2 as const,
              label: 'Moderada',
              text: 'Un buen punto de partida para progresar de forma constante.',
            }
          : avg <= high
            ? { level: 3 as const, label: 'Alta', text: 'Exigente: cuida el descanso, el sueño y la técnica.' }
            : { level: 4 as const, label: 'Muy alta', text: 'Difícil de recuperar. Te recomendamos bajar series.' };
  if (p.beginner && intensity.level >= 3) {
    warnings.push({
      id: 'principiante-alta',
      level: 'alto',
      text: 'Para tu nivel la intensidad total es alta. Empezar con menos series da casi los mismos resultados con menos riesgo.',
    });
  }

  const order: Record<WarningLevel, number> = { alto: 0, medio: 1, info: 2 };
  warnings.sort((a, b) => order[a.level] - order[b.level]);
  return { warnings, weekly, dayMinutes: minutes, totalSets, intensity };
}
