import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { PLACE_PRESETS } from './equipment';
import { ExerciseService } from './exercise.service';
import { localStore } from './local-store';
import type { Exercise } from './models';
import { ProfileService } from './profile.service';
import { ProgressionService } from './progression.service';
import { DEFAULT_LOAD_SETTINGS } from './progression/load-units';
import { recommendProgression } from './progression/progression';
import {
  allowedExerciseIds,
  findAlternatives,
  generateRoutine,
  missingGeneratorData,
  prescriptionFor,
  type Alternative,
  type GeneratedExercise,
  type GeneratedRoutine,
  type GeneratorInput,
  type TrainingHistory,
} from './routine/generator';
import { SupabaseService } from './supabase.service';

export interface StoredExercise {
  id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string | null;
  rir_min?: number | null;
  rir_max?: number | null;
  tempo?: string | null;
  /** Por qué se eligió este ejercicio. */
  rationale?: string | null;
}

export interface StoredDay {
  id: string;
  day_index: number;
  name: string;
  estimated_minutes: number | null;
  /** Objetivo de la sesión. */
  objective?: string | null;
  routine_exercises: StoredExercise[];
}

export interface StoredRoutine {
  id: string;
  name: string;
  goal: string | null;
  place: string | null;
  notes: string | null;
  is_active: boolean;
  days_per_week: number | null;
  created_at: string;
  /** Nombre de quien compartió esta rutina (si llegó desde la pareja). */
  shared_by_name?: string | null;
  routine_days: StoredDay[];
}

/** Por qué se cambia un ejercicio (se guarda para no volver a proponerlo). */
export type SwapReason = 'no_me_gusta' | 'molestia' | 'no_hay_maquina' | 'muy_dificil';

export type RoutineSummary = Omit<StoredRoutine, 'routine_days' | 'notes'>;

export class EmptyExerciseCatalogError extends Error {
  constructor() {
    super('La base de ejercicios está vacía');
  }
}

/** Faltan datos para generar una rutina segura: se piden, no se suponen. */
export class MissingRoutineDataError extends Error {
  constructor(readonly missing: string[]) {
    super(`Faltan datos para generar una rutina segura: ${missing.join('; ')}.`);
  }
}

/** Copia local de la rutina activa para poder verla sin internet (PWA). */
interface RoutineSnapshot {
  routine: StoredRoutine;
  exercises: Exercise[];
}

const SELECT_FULL =
  'id,name,goal,place,notes,is_active,days_per_week,created_at,shared_by_name,' +
  'routine_days(id,day_index,name,estimated_minutes,objective,' +
  'routine_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,notes,rir_min,rir_max,tempo,rationale))';

/**
 * Rutinas del usuario. Todas las consultas pasan por RLS: cada persona solo ve, activa o
 * borra sus propias rutinas. El guardado es atómico mediante la función save_routine.
 */
@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly catalog = inject(ExerciseService);
  private readonly progression = inject(ProgressionService);

  /**
   * Rutina activa. Sin conexión devuelve la última copia guardada en el teléfono
   * (y `offline` en true); si no hay copia, propaga el error.
   */
  async loadActive(): Promise<{ routine: StoredRoutine | null; offline: boolean }> {
    try {
      // Sin red, Supabase puede quedar esperando (por ejemplo, renovando la sesión):
      // se usa la copia local de inmediato o tras unos segundos.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');
      const { data, error } = await withTimeout(
        this.sb.from('routines').select(SELECT_FULL).eq('is_active', true).maybeSingle(),
        8000,
      );
      if (error) throw error;
      const routine = data ? normalize(data as unknown as StoredRoutine) : null;
      this.saveSnapshot(routine);
      return { routine, offline: false };
    } catch (e) {
      const snap = this.readSnapshot();
      if (!snap) throw e;
      this.catalog.seed(snap.exercises);
      return { routine: snap.routine, offline: true };
    }
  }

  async loadById(id: string): Promise<StoredRoutine | null> {
    const { data, error } = await this.sb.from('routines').select(SELECT_FULL).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? normalize(data as unknown as StoredRoutine) : null;
  }

  /** Todas las rutinas guardadas del usuario, la más reciente primero. */
  async list(): Promise<RoutineSummary[]> {
    const { data, error } = await this.sb
      .from('routines')
      .select('id,name,goal,place,is_active,days_per_week,created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as RoutineSummary[];
  }

  async activate(id: string): Promise<void> {
    const { error } = await this.sb.rpc('activate_routine', { p_routine_id: id });
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.sb.from('routines').delete().eq('id', id);
    if (error) throw error;
    if (this.readSnapshot()?.routine.id === id) this.saveSnapshot(null);
  }

  /** Genera una rutina nueva para el lugar indicado y la deja como rutina activa. */
  async generateAndSave(place: string): Promise<void> {
    const input = await this.generatorInput(place);
    const missing = missingGeneratorData({
      ...input,
      gearConfirmed:
        this.profiles.health()?.place_equipment?.[place] !== undefined || (PLACE_PRESETS[place]?.length ?? 0) > 0,
    });
    if (missing.length > 0) throw new MissingRoutineDataError(missing);

    // La rutina tiene en cuenta el historial real de ESTA persona y lo que ya trae su rutina actual.
    input.history = await this.trainingHistory().catch(() => undefined);
    const active = await this.loadActive().catch(() => null);
    input.previous = active?.routine?.routine_days.flatMap((d) => d.routine_exercises.map((e) => e.exercise_id)) ?? [];
    const generated = generateRoutine(input);

    if (generated.days.every((d) => d.exercises.length === 0)) {
      throw new Error('No se pudo armar la rutina con los datos actuales');
    }

    const { error } = await this.sb.rpc('save_routine', {
      p_routine: { ...generated, notes: generated.notes.join('\n') },
    });
    if (error) throw error;
  }

  /** Guarda una rutina armada a mano y la deja como rutina actual. */
  async saveManual(routine: GeneratedRoutine): Promise<void> {
    const { error } = await this.sb.rpc('save_routine', {
      p_routine: { ...routine, notes: routine.notes.join('\n') },
    });
    if (error) throw error;
  }

  /**
   * Ejercicios que pueden reemplazar a otro en esta rutina: mismo músculo, seguros para la
   * persona, sin repetir los que ya tiene la rutina ni los que marcó como "no me gusta".
   */
  async alternatives(routine: StoredRoutine, exerciseId: string): Promise<Alternative[]> {
    const input = await this.generatorInput(routine.place ?? this.profiles.health()?.places?.[0] ?? 'smartfit');
    const inRoutine = routine.routine_days.flatMap((d) => d.routine_exercises.map((e) => e.exercise_id));
    return findAlternatives(input, exerciseId, inRoutine);
  }

  /** Cambia un ejercicio por otro en la misma posición de todos los días de la rutina. */
  async swapExercise(routineId: string, oldExerciseId: string, next: GeneratedExercise, reason: SwapReason) {
    const { error } = await this.sb.rpc('swap_exercise', {
      p_routine_id: routineId,
      p_old_exercise: oldExerciseId,
      p_new: next,
      p_reason: reason,
    });
    if (error) throw error;
    this.avoidCache = null;
    // Refresca la copia local para que el cambio se vea también sin conexión.
    await this.loadActive().catch(() => undefined);
  }

  /** Reemplaza todos los ejercicios de un día (agregar, quitar, reordenar o cambiar series). */
  async saveDay(dayId: string, items: GeneratedExercise[], minutes: number | null): Promise<void> {
    const { error } = await this.sb.rpc('replace_day_exercises', {
      p_day_id: dayId,
      p_exercises: items,
      p_minutes: minutes,
    });
    if (error) throw error;
    await this.loadActive().catch(() => undefined);
  }

  /** Ejercicios que sirven a la persona en este lugar y prescripción recomendada para uno nuevo. */
  async pickerContext(routine: StoredRoutine) {
    const input = await this.generatorInput(routine.place ?? this.profiles.health()?.places?.[0] ?? 'smartfit');
    return {
      allowed: allowedExerciseIds(input),
      prescribe: (ex: Exercise) => prescriptionFor(input, ex),
    };
  }

  /**
   * Resumen del historial de la persona con sesión (últimos 60 días): qué ejercicios registró,
   * cuáles están estancados, hace cuántas horas trabajó cada grupo y cuántas series lleva esta
   * semana. Devuelve undefined si aún no hay registros: el generador no supone ninguno.
   */
  async trainingHistory(): Promise<TrainingHistory | undefined> {
    await this.catalog.ensureLoaded();
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data, error } = await this.sb
      .from('set_history')
      .select('exercise_id,reps,started_at')
      .gte('started_at', since)
      .not('reps', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    const rows = (data ?? []) as { exercise_id: string; reps: number; started_at: string }[];
    if (rows.length === 0) return undefined;

    const byId = this.catalog.byId();
    const now = Date.now();
    const hoursSince: Record<string, number> = {};
    const weeklySets: Record<string, number> = {};
    const performed = new Set<string>();
    for (const r of rows) {
      const ex = byId.get(r.exercise_id);
      if (!ex || ex.category === 'stretching' || ex.category === 'cardio') continue;
      performed.add(r.exercise_id);
      const hours = (now - new Date(r.started_at).getTime()) / 3_600_000;
      for (const key of new Set(ex.primary_muscles)) {
        hoursSince[key] = Math.min(hoursSince[key] ?? Infinity, Math.round(hours));
        if (hours <= 168) weeklySets[key] = (weeklySets[key] ?? 0) + 1;
      }
    }

    const ids = [...performed];
    const [sessions, settings] = await Promise.all([this.progression.sessions(ids), this.progression.loadSettings()]);
    const rir = [2, 3];
    const stalled = ids.filter((id) => {
      const ex = byId.get(id)!;
      const list = sessions.get(id) ?? [];
      if (list.length < 3) return false;
      const lastSets = list[list.length - 1].sets.length;
      const advice = recommendProgression({
        target: {
          sets: Math.max(1, lastSets),
          repsMin: ex.rep_range_min ?? 8,
          repsMax: ex.rep_range_max ?? 12,
          rirMin: rir[0],
          rirMax: rir[1],
        },
        settings: settings.get(id) ?? DEFAULT_LOAD_SETTINGS,
        isolation: ex.mechanic === 'isolation',
        sessions: list,
      });
      return advice.flags.includes('estancamiento');
    });
    return { performed: ids, stalled, hoursSince, weeklySets };
  }

  private avoidCache: string[] | null = null;

  /** Ejercicios que la persona marcó como "no me gusta". */
  private async avoidList(): Promise<string[]> {
    if (this.avoidCache) return this.avoidCache;
    const { data, error } = await this.sb.from('exercise_preferences').select('exercise_id');
    if (error) return [];
    this.avoidCache = (data ?? []).map((r) => r.exercise_id as string);
    return this.avoidCache;
  }

  /** Datos para el generador (perfil, equipo del lugar, lesiones, preferencias y catálogo). */
  async generatorInput(place: string): Promise<GeneratorInput> {
    const uid = this.auth.user()?.id;
    const health = this.profiles.health();
    if (!uid || !health) throw new Error('Faltan datos del perfil');

    await this.catalog.ensureLoaded();
    if (this.catalog.exercises().length === 0) throw new EmptyExerciseCatalogError();

    const profile = this.profiles.profile();
    return {
      exercises: this.catalog.exercises(),
      areaMuscles: this.catalog.areaMuscles(),
      manualContra: this.catalog.contraindications(),
      health,
      injuries: this.profiles.injuries(),
      place,
      gear: health.place_equipment?.[place] ?? PLACE_PRESETS[place] ?? [],
      age: ageFrom(profile?.birth_date ?? null),
      gender: profile?.gender ?? null,
      avoid: await this.avoidList(),
      weightKg: profile?.weight_kg ?? null,
      seed: `${uid}:${Date.now()}`,
    };
  }

  private snapshotKey(): string | null {
    const uid = this.auth.user()?.id;
    return uid ? `routine.${uid}` : null;
  }

  private saveSnapshot(routine: StoredRoutine | null) {
    const key = this.snapshotKey();
    if (!key) return;
    if (!routine) {
      localStore.remove(key);
      return;
    }
    // Sin catálogo cargado (por ejemplo desde Inicio) no se pisa la copia anterior.
    if (this.catalog.exercises().length === 0) return;
    const ids = new Set(routine.routine_days.flatMap((d) => d.routine_exercises.map((e) => e.exercise_id)));
    const exercises = this.catalog.exercises().filter((e) => ids.has(e.id));
    localStore.set(key, { routine, exercises } satisfies RoutineSnapshot);
  }

  private readSnapshot(): RoutineSnapshot | null {
    const key = this.snapshotKey();
    return key ? localStore.get<RoutineSnapshot>(key) : null;
  }
}

/** Rechaza la promesa si no responde a tiempo (red lenta o sin conexión). */
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function normalize(routine: StoredRoutine): StoredRoutine {
  routine.routine_days.sort((a, b) => a.day_index - b.day_index);
  for (const day of routine.routine_days) day.routine_exercises.sort((a, b) => a.position - b.position);
  return routine;
}

export function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate + 'T00:00:00');
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const had =
    now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
  if (!had) age--;
  return age;
}
