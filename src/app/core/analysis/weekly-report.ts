import { volumeKeyName } from '../anatomy/muscles';
import type { Exercise } from '../models';
import { DEFAULT_LOAD_SETTINGS, formatLoad, type LoadSettings, type LoadUnit } from '../progression/load-units';
import {
  recommendProgression,
  summarize,
  type ExerciseSession,
  type ProgressionAdvice,
  type ProgressionTarget,
} from '../progression/progression';
import { exerciseName } from '../routine/exercise-names';

/**
 * Análisis semanal de UNA persona, calculado solo con sus registros reales.
 *
 * Función pura: recibe los entrenamientos y series ya descargados (RLS garantiza que son de quien
 * consulta) y devuelve el informe. Si faltan datos para una parte del análisis, lo dice en
 * `dataNotes` en vez de rellenarla con supuestos.
 */

export interface ReportWorkout {
  id: string;
  started_at: string;
  finished_at: string | null;
  session_rpe: number | null;
  paused_s: number | null;
  ended_early: boolean;
  exercises_planned: number | null;
  exercises_done: number | null;
  readiness: number | null;
  fatigue: number | null;
  discomfort_areas: string[];
  discomfort_note: string | null;
}

export interface ReportSet {
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  load_value: number | null;
  load_unit: LoadUnit;
  rir: number | null;
}

export interface PlannedExercise extends ProgressionTarget {
  exercise_id: string;
}

export interface WeeklyReportInput {
  /** Lunes de la semana a analizar (00:00 hora local). */
  weekStart: Date;
  /** Entrenamientos terminados de la persona: la semana y al menos las 4 anteriores. */
  workouts: ReportWorkout[];
  sets: ReportSet[];
  exercises: Map<string, Exercise>;
  /** Sesiones por semana de la rutina activa. Null si no hay rutina. */
  plannedSessions: number | null;
  /** Prescripción de la rutina activa por ejercicio. */
  plan: Map<string, PlannedExercise>;
  settings: Map<string, LoadSettings>;
  /** Rango de series semanales recomendado por clave de volumen (o null si no hay referencia). */
  weeklyRange: (volumeKey: string) => [number, number] | null;
  /** RIR objetivo general, para ejercicios hechos fuera de la rutina. */
  defaultRir: [number, number];
}

export type Trend = 'mejoro' | 'igual' | 'empeoro' | 'nuevo';

export interface MuscleVolume {
  key: string;
  name: string;
  /** Series en las que fue músculo principal. */
  directSets: number;
  /** Series en las que fue músculo secundario. */
  indirectSets: number;
  /** Series ponderadas: directas + 0,5 × indirectas. */
  weighted: number;
  /** Promedio ponderado de las semanas anteriores con registros (null si no hay). */
  previousAvg: number | null;
  range: [number, number] | null;
  status: 'bajo' | 'en_rango' | 'alto' | 'sin_referencia';
}

export interface ExerciseReport {
  exercise_id: string;
  name: string;
  sessions: number;
  unit: LoadUnit;
  load: number;
  reps: number[];
  trend: Trend;
  /** Comparación con la sesión anterior a la semana, en palabras. */
  detail: string;
  /** Comparación con lo planificado en la rutina (null si el ejercicio no está en ella). */
  planned: string | null;
  advice: ProgressionAdvice;
}

export interface RoutineChange {
  exercise_id: string | null;
  change: string;
  reason: string;
}

export interface WeeklyReport {
  version: 1;
  weekStart: string;
  weekEnd: string;
  /** false si no hubo entrenamientos registrados en la semana. */
  hasData: boolean;
  /** Qué partes del análisis no se pudieron hacer y por qué. */
  dataNotes: string[];
  summary: string;
  sessions: {
    done: number;
    planned: number | null;
    adherencePct: number | null;
    minutes: number;
    endedEarly: number;
    effectiveSets: number;
  };
  muscles: MuscleVolume[];
  exercises: ExerciseReport[];
  improved: string[];
  worsened: string[];
  stalled: string[];
  imbalances: string[];
  volumeSpikes: string[];
  recovery: {
    avgReadiness: number | null;
    avgFatigue: number | null;
    avgSessionRpe: number | null;
    avgRir: number | null;
    discomfortAreas: { area: string; times: number }[];
    notes: string[];
  };
  recommendations: string[];
  routineChanges: RoutineChange[];
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function isStrength(ex: Exercise | undefined): ex is Exercise {
  return !!ex && ex.category !== 'stretching' && ex.category !== 'cardio';
}

/** Series ponderadas por clave de volumen: 1 por músculo principal, 0,5 por secundario. */
function volumeOf(sets: ReportSet[], exercises: Map<string, Exercise>) {
  const direct = new Map<string, number>();
  const indirect = new Map<string, number>();
  for (const s of sets) {
    const ex = exercises.get(s.exercise_id);
    if (!isStrength(ex) || !s.reps || s.reps <= 0) continue;
    for (const k of new Set(ex.primary_muscles)) direct.set(k, (direct.get(k) ?? 0) + 1);
    for (const k of new Set(ex.secondary_muscles)) {
      if (!ex.primary_muscles.includes(k)) indirect.set(k, (indirect.get(k) ?? 0) + 1);
    }
  }
  return { direct, indirect };
}

const PUSH = new Set(['empuje_horizontal', 'empuje_vertical']);
const PULL = new Set(['traccion_horizontal', 'traccion_vertical']);
const KNEE = new Set(['dominante_rodilla', 'extension_rodilla']);
const HIP = new Set(['dominante_cadera', 'extension_cadera', 'flexion_rodilla']);

export function buildWeeklyReport(input: WeeklyReportInput): WeeklyReport {
  const start = input.weekStart.getTime();
  const end = start + WEEK;
  const done = input.workouts.filter((w) => w.finished_at);
  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start && t < end;
  };
  const weekWorkouts = done.filter((w) => inWeek(w.started_at));
  const weekIds = new Set(weekWorkouts.map((w) => w.id));
  const byWorkout = new Map(done.map((w) => [w.id, w]));
  const weekSets = input.sets.filter((s) => weekIds.has(s.workout_id));
  const dataNotes: string[] = [];

  const report: WeeklyReport = {
    version: 1,
    weekStart: isoDate(input.weekStart),
    weekEnd: isoDate(new Date(end - DAY)),
    hasData: weekWorkouts.length > 0,
    dataNotes,
    summary: '',
    sessions: {
      done: weekWorkouts.length,
      planned: input.plannedSessions,
      adherencePct:
        input.plannedSessions && input.plannedSessions > 0
          ? Math.min(100, Math.round((weekWorkouts.length / input.plannedSessions) * 100))
          : null,
      minutes: Math.round(
        sum(
          weekWorkouts.map((w) =>
            Math.max(
              0,
              (new Date(w.finished_at!).getTime() - new Date(w.started_at).getTime()) / 60000 - (w.paused_s ?? 0) / 60,
            ),
          ),
        ),
      ),
      endedEarly: weekWorkouts.filter((w) => w.ended_early).length,
      effectiveSets: weekSets.filter((s) => s.rir !== null && s.rir <= 3).length,
    },
    muscles: [],
    exercises: [],
    improved: [],
    worsened: [],
    stalled: [],
    imbalances: [],
    volumeSpikes: [],
    recovery: {
      avgReadiness: null,
      avgFatigue: null,
      avgSessionRpe: null,
      avgRir: null,
      discomfortAreas: [],
      notes: [],
    },
    recommendations: [],
    routineChanges: [],
  };

  if (input.plannedSessions === null) {
    dataNotes.push('No hay una rutina activa: no se puede calcular el cumplimiento de entrenamientos.');
  }

  // ---------- Sin entrenamientos: no hay nada que analizar ----------
  if (weekWorkouts.length === 0) {
    report.summary =
      'No hay entrenamientos registrados esta semana, así que no es posible analizar cargas, volumen ni progreso. Nada se da por hecho.';
    dataNotes.push('Sin entrenamientos registrados en la semana.');
    report.recommendations.push(
      input.plannedSessions
        ? `Retoma con la primera sesión de tu rutina (plan: ${input.plannedSessions} por semana). Las cargas partirán de tu último registro real.`
        : 'Crea o activa una rutina y registra tu primera sesión.',
    );
    return report;
  }

  // ---------- Volumen por grupo muscular ----------
  const now = volumeOf(weekSets, input.exercises);
  const prevWeeks: ReturnType<typeof volumeOf>[] = [];
  for (let i = 1; i <= 3; i++) {
    const a = start - i * WEEK;
    const ids = new Set(
      done
        .filter((w) => {
          const t = new Date(w.started_at).getTime();
          return t >= a && t < a + WEEK;
        })
        .map((w) => w.id),
    );
    if (ids.size > 0)
      prevWeeks.push(
        volumeOf(
          input.sets.filter((s) => ids.has(s.workout_id)),
          input.exercises,
        ),
      );
  }
  if (prevWeeks.length === 0) {
    dataNotes.push(
      'No hay semanas anteriores con registros: no se puede comparar el volumen ni detectar aumentos bruscos.',
    );
  }
  const weightedOf = (v: ReturnType<typeof volumeOf>, k: string) =>
    (v.direct.get(k) ?? 0) + 0.5 * (v.indirect.get(k) ?? 0);
  const keys = new Set([...now.direct.keys(), ...now.indirect.keys()]);
  for (const key of keys) {
    const weighted = weightedOf(now, key);
    const previousAvg = prevWeeks.length
      ? round1(sum(prevWeeks.map((v) => weightedOf(v, key))) / prevWeeks.length)
      : null;
    const range = input.weeklyRange(key);
    report.muscles.push({
      key,
      name: volumeKeyName(key),
      directSets: now.direct.get(key) ?? 0,
      indirectSets: now.indirect.get(key) ?? 0,
      weighted,
      previousAvg,
      range,
      status: !range ? 'sin_referencia' : weighted < range[0] ? 'bajo' : weighted > range[1] ? 'alto' : 'en_rango',
    });
    // Aumento brusco: +30 % y al menos 4 series más que el promedio reciente.
    if (previousAvg !== null && previousAvg >= 4 && weighted > previousAvg * 1.3 && weighted - previousAvg >= 4) {
      report.volumeSpikes.push(
        `${volumeKeyName(key)}: ${weighted} series esta semana frente a ${previousAvg} de promedio en las ${prevWeeks.length} anteriores (+${Math.round((weighted / previousAvg - 1) * 100)} %).`,
      );
    }
  }
  report.muscles.sort((a, b) => b.weighted - a.weighted);

  // ---------- Desequilibrios ----------
  const patternSets = (group: Set<string>) =>
    weekSets.filter((s) => {
      const ex = input.exercises.get(s.exercise_id);
      return !!s.reps && isStrength(ex) && !!ex.movement_pattern && group.has(ex.movement_pattern);
    }).length;
  const push = patternSets(PUSH);
  const pull = patternSets(PULL);
  const knee = patternSets(KNEE);
  const hip = patternSets(HIP);
  if (push >= 6 && push > pull * 1.5) {
    report.imbalances.push(
      `Empuje vs. tracción: ${push} series de empuje y ${pull} de tracción. Conviene acercarlas a 1:1.`,
    );
  } else if (pull >= 6 && pull > push * 1.5) {
    report.imbalances.push(`Tracción vs. empuje: ${pull} series de tracción y ${push} de empuje.`);
  }
  if (knee >= 6 && knee > hip * 2) {
    report.imbalances.push(
      `Tren inferior: ${knee} series dominantes de rodilla y ${hip} de cadera/isquiotibiales. Falta trabajo posterior.`,
    );
  }
  const trainedLower = ['quadriceps', 'hamstrings', 'glutes'].some((k) => (now.direct.get(k) ?? 0) > 0);
  if (trainedLower) {
    for (const k of ['adductors', 'abductors', 'calves']) {
      if ((now.direct.get(k) ?? 0) === 0) {
        const indirect = now.indirect.get(k) ?? 0;
        report.imbalances.push(
          `${volumeKeyName(k)}: sin trabajo directo esta semana${indirect ? ` (solo ${indirect} series indirectas)` : ''}.`,
        );
      }
    }
  }

  // ---------- Rendimiento por ejercicio ----------
  const sessionsOf = new Map<string, ExerciseSession[]>();
  const ordered = [...input.sets].sort((a, b) => {
    const wa = byWorkout.get(a.workout_id)?.started_at ?? '';
    const wb = byWorkout.get(b.workout_id)?.started_at ?? '';
    return wa.localeCompare(wb) || a.set_number - b.set_number;
  });
  for (const s of ordered) {
    const w = byWorkout.get(s.workout_id);
    if (!w || new Date(w.started_at).getTime() >= end) continue;
    const list = sessionsOf.get(s.exercise_id) ?? [];
    let session = list.find((x) => x.workoutId === s.workout_id);
    if (!session) {
      session = { workoutId: s.workout_id, date: w.started_at, unit: s.load_unit, sets: [] };
      list.push(session);
      sessionsOf.set(s.exercise_id, list);
    }
    session.sets.push({ reps: s.reps, load: s.load_value, rir: s.rir });
  }

  let withoutLoad = 0;
  for (const [exerciseId, sessions] of sessionsOf) {
    const ex = input.exercises.get(exerciseId);
    if (!isStrength(ex)) continue;
    const thisWeek = sessions.filter((s) => weekIds.has(s.workoutId));
    if (thisWeek.length === 0) continue;
    const lastSummary = summarize(thisWeek[thisWeek.length - 1]);
    if (!lastSummary) {
      withoutLoad++;
      continue;
    }
    const unit = thisWeek[thisWeek.length - 1].unit;
    const settings = input.settings.get(exerciseId) ?? DEFAULT_LOAD_SETTINGS;
    const planned = input.plan.get(exerciseId);
    const target: ProgressionTarget = planned ?? {
      sets: lastSummary.reps.length,
      repsMin: ex.rep_range_min ?? 8,
      repsMax: ex.rep_range_max ?? 12,
      rirMin: input.defaultRir[0],
      rirMax: input.defaultRir[1],
    };
    const advice = recommendProgression({ target, settings, isolation: ex.mechanic === 'isolation', sessions });

    const before = sessions
      .filter((s) => !weekIds.has(s.workoutId) && s.unit === unit)
      .map(summarize)
      .filter((x) => x !== null)
      .at(-1);
    const show = (v: number) => formatLoad(v, unit, settings.unitLabel);
    const assisted = settings.kind === 'asistido';
    let trend: Trend = 'nuevo';
    let detail = 'Primera semana con registros de este ejercicio en esta unidad: aún no hay con qué comparar.';
    if (before) {
      const n = Math.min(before.reps.length, lastSummary.reps.length);
      const diffReps = sum(lastSummary.reps.slice(0, n)) - sum(before.reps.slice(0, n));
      const loadDiff = (lastSummary.load - before.load) * (assisted ? -1 : 1);
      if (loadDiff > 0) {
        trend = 'mejoro';
        detail = `${assisted ? 'Menos asistencia' : 'Más carga'}: de ${show(before.load)} a ${show(lastSummary.load)} (${lastSummary.reps.join(', ')} reps).`;
      } else if (loadDiff < 0) {
        trend = 'empeoro';
        detail = `${assisted ? 'Más asistencia' : 'Menos carga'}: de ${show(before.load)} a ${show(lastSummary.load)}.`;
      } else if (diffReps > 0) {
        trend = 'mejoro';
        detail = `Misma carga (${show(lastSummary.load)}) y ${diffReps} repeticiones más: ${before.reps.join(', ')} → ${lastSummary.reps.join(', ')}.`;
      } else if (diffReps <= -2) {
        trend = 'empeoro';
        detail = `Misma carga (${show(lastSummary.load)}) y ${-diffReps} repeticiones menos: ${before.reps.join(', ')} → ${lastSummary.reps.join(', ')}.`;
      } else {
        trend = 'igual';
        detail = `Sin cambios relevantes con ${show(lastSummary.load)}: ${before.reps.join(', ')} → ${lastSummary.reps.join(', ')}.`;
      }
    }

    const name = exerciseName(ex);
    report.exercises.push({
      exercise_id: exerciseId,
      name,
      sessions: thisWeek.length,
      unit,
      load: lastSummary.load,
      reps: lastSummary.reps,
      trend,
      detail,
      planned: planned
        ? `Plan ${planned.sets} × ${planned.repsMin}-${planned.repsMax}; hecho ${lastSummary.reps.length} × ${lastSummary.reps.join(', ')}.`
        : null,
      advice,
    });
    if (trend === 'mejoro') report.improved.push(`${name}: ${detail}`);
    if (trend === 'empeoro') report.worsened.push(`${name}: ${detail}`);
    if (advice.flags.includes('estancamiento')) {
      report.stalled.push(`${name}: 3 sesiones con ${show(lastSummary.load)} sin sumar repeticiones.`);
      report.routineChanges.push({
        exercise_id: exerciseId,
        change: `Si ${name} sigue estancado la próxima semana, cámbialo por una variante equivalente (mismo patrón y músculo principal).`,
        reason: advice.reason,
      });
    }
  }
  report.exercises.sort((a, b) => a.name.localeCompare(b.name));
  if (withoutLoad > 0) {
    dataNotes.push(
      `${withoutLoad} ${withoutLoad === 1 ? 'ejercicio no tiene' : 'ejercicios no tienen'} carga registrada: no se analizó su progresión.`,
    );
  }

  // ---------- Recuperación, fatiga y molestias (solo lo que la persona declaró) ----------
  const readiness = weekWorkouts.map((w) => w.readiness).filter((x): x is number => x !== null);
  const fatigue = weekWorkouts.map((w) => w.fatigue).filter((x): x is number => x !== null);
  const rpes = weekWorkouts.map((w) => w.session_rpe).filter((x): x is number => x !== null);
  const rirs = weekSets.map((s) => s.rir).filter((x): x is number => x !== null);
  const areaCount = new Map<string, number>();
  for (const w of weekWorkouts) for (const a of w.discomfort_areas ?? []) areaCount.set(a, (areaCount.get(a) ?? 0) + 1);
  report.recovery = {
    avgReadiness: avg(readiness),
    avgFatigue: avg(fatigue),
    avgSessionRpe: avg(rpes),
    avgRir: avg(rirs),
    discomfortAreas: [...areaCount.entries()]
      .map(([area, times]) => ({ area, times }))
      .sort((a, b) => b.times - a.times),
    notes: weekWorkouts.map((w) => w.discomfort_note).filter((x): x is string => !!x),
  };
  if (readiness.length === 0 && fatigue.length === 0) {
    dataNotes.push('No declaraste recuperación ni fatiga en ninguna sesión: no se asume que te recuperaste bien.');
  }
  if (rirs.length === 0) {
    dataNotes.push('No hay RIR registrado: sin ese dato no se recomiendan aumentos de carga.');
  }

  // ---------- Recomendaciones (cada una con el dato que la justifica) ----------
  const rec = report.recommendations;
  const s = report.sessions;
  if (s.adherencePct !== null && s.adherencePct < 100) {
    rec.push(
      `Cumplimiento: ${s.done} de ${s.planned} sesiones (${s.adherencePct} %). Antes de sumar volumen, completa las sesiones planificadas.`,
    );
  }
  const highFatigue = (report.recovery.avgFatigue ?? 0) >= 4 || (report.recovery.avgReadiness ?? 5) <= 2;
  if (highFatigue) {
    rec.push(
      `Fatiga alta declarada (fatiga ${report.recovery.avgFatigue ?? '–'}/5, recuperación ${report.recovery.avgReadiness ?? '–'}/5): la próxima semana no aumentes cargas ni series.`,
    );
    if (report.volumeSpikes.length > 0) {
      report.routineChanges.push({
        exercise_id: null,
        change: 'Quita 1 serie por ejercicio en los grupos con aumento brusco de volumen durante la próxima semana.',
        reason: `Fatiga alta junto con: ${report.volumeSpikes.join(' ')}`,
      });
    }
  }
  for (const d of report.recovery.discomfortAreas) {
    rec.push(
      `Molestia declarada en ${d.area.replace('_', ' ')} (${d.times} ${d.times === 1 ? 'sesión' : 'sesiones'}): no subas cargas en los ejercicios que la involucran y, si persiste, consulta a un profesional.`,
    );
  }
  for (const spike of report.volumeSpikes)
    rec.push(`Aumento brusco de volumen. ${spike} Mantén ese volumen antes de volver a subirlo.`);
  for (const mv of report.muscles) {
    if (mv.status === 'bajo' && mv.range) {
      rec.push(
        `${mv.name}: ${mv.weighted} series ponderadas, bajo el rango orientativo (${mv.range[0]}-${mv.range[1]}).`,
      );
    } else if (mv.status === 'alto' && mv.range) {
      rec.push(
        `${mv.name}: ${mv.weighted} series ponderadas, sobre el rango orientativo (${mv.range[0]}-${mv.range[1]}). Más no siempre es mejor.`,
      );
    }
  }
  for (const i of report.imbalances) rec.push(i);
  const blocked = highFatigue || report.recovery.discomfortAreas.length > 0;
  for (const e of report.exercises) {
    if (e.advice.action === 'subir') {
      rec.push(
        blocked
          ? `${e.name}: cumpliste el criterio para subir, pero con la fatiga o molestias declaradas conviene mantener ${formatLoad(e.load, e.unit)} una semana más.`
          : `${e.name}: ${e.advice.reason}`,
      );
    } else if (e.advice.action === 'bajar') {
      rec.push(`${e.name}: ${e.advice.reason}`);
    }
  }
  if (rec.length === 0) rec.push('Semana sin alertas: mantén la rutina y sigue sumando repeticiones dentro del rango.');

  // ---------- Resumen ----------
  const parts = [
    `${s.done} ${s.done === 1 ? 'entrenamiento registrado' : 'entrenamientos registrados'}${
      s.planned ? ` de ${s.planned} planificados` : ''
    } (${s.minutes} min).`,
    `${report.muscles.filter((x) => x.directSets > 0).length} grupos musculares con trabajo directo.`,
  ];
  if (report.improved.length)
    parts.push(
      `${report.improved.length} ${report.improved.length === 1 ? 'ejercicio mejoró' : 'ejercicios mejoraron'}.`,
    );
  if (report.worsened.length)
    parts.push(`${report.worsened.length} ${report.worsened.length === 1 ? 'empeoró' : 'empeoraron'}.`);
  if (report.stalled.length) parts.push(`${report.stalled.length} en estancamiento.`);
  report.summary = parts.join(' ');
  return report;
}

/** Lunes (00:00 local) de la semana de una fecha. */
export function mondayOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Semanas ya terminadas (lunes) con entrenamientos y sin informe guardado, de la más antigua a la más reciente. */
export function pendingWeeks(workoutDates: string[], existing: Set<string>, now = new Date(), maxWeeks = 8): Date[] {
  const current = mondayOfWeek(now).getTime();
  const weeks = new Map<string, Date>();
  for (const iso of workoutDates) {
    const monday = mondayOfWeek(new Date(iso));
    if (monday.getTime() >= current) continue; // la semana en curso aún no terminó
    if (current - monday.getTime() > maxWeeks * WEEK) continue;
    const key = isoDate(monday);
    if (!existing.has(key)) weeks.set(key, monday);
  }
  return [...weeks.values()].sort((a, b) => a.getTime() - b.getTime());
}
