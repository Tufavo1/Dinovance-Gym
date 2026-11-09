import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { localStore } from './local-store';
import type { StoredRoutine } from './routine.service';
import { SupabaseService } from './supabase.service';
import type { LoadHistoryEntry } from './training/load-advisor';

export interface WorkoutProgress {
  /** Posición (0..n-1) del día que toca entrenar ahora. */
  nextDay: number;
  /** Entrenamientos registrados desde el lunes de esta semana. */
  doneThisWeek: number;
  /** Fecha del último entrenamiento registrado. */
  lastDoneAt: string | null;
}

export type EndReason =
  'cansancio' | 'sin_tiempo' | 'dolor' | 'sin_equipo' | 'muy_dificil' | 'muy_facil' | 'no_entendi' | 'otro';

export interface SessionSetPayload {
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
  /** Segundos de trabajo de la serie. */
  duration_s?: number | null;
  /** Segundos de descanso real antes de esta serie. */
  rest_s?: number | null;
}

/** Entrenamiento completo que se guarda de una vez al terminar (función log_workout). */
export interface SessionPayload {
  routine_day_id: string;
  started_at: string;
  finished_at: string;
  /** Esfuerzo percibido de la sesión (sRPE de Foster, 1-10). */
  session_rpe: number | null;
  /** Qué le pareció la guía (1-5). */
  guide_rating: number | null;
  notes: string | null;
  inol: number | null;
  /** Segundos que el entrenamiento estuvo en pausa. */
  paused_s?: number;
  /** Calificación 1-10 de cada ejercicio. */
  ratings?: { exercise_id: string; rating: number }[];
  /** Terminó el día antes de completar todos los ejercicios. */
  ended_early?: boolean;
  /** Motivos de terminar antes (para saber qué mejorar). */
  end_reasons?: EndReason[];
  end_note?: string | null;
  exercises_planned?: number;
  exercises_done?: number;
  /** Ejercicios que pasó sin hacer ninguna serie. */
  skipped_exercises?: string[];
  sets: SessionSetPayload[];
}

/** Registro de entrenamientos (workout_logs / set_logs, protegidos por RLS). */
@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  /** Marca un día como completado sin registrar series (atajo). */
  async completeDay(routineDayId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.sb
      .from('workout_logs')
      .insert({ routine_day_id: routineDayId, started_at: now, finished_at: now });
    if (error) throw error;
  }

  /**
   * Guarda el entrenamiento. Si no hay conexión queda pendiente en el teléfono y se envía
   * después (flushPending). Devuelve si quedó guardado o pendiente.
   */
  async saveSession(payload: SessionPayload): Promise<'saved' | 'pending'> {
    try {
      const { error } = await this.sb.rpc('log_workout', { p_workout: payload });
      if (error) throw error;
      return 'saved';
    } catch {
      const key = this.pendingKey();
      if (!key) throw new Error('Sin sesión');
      const list = localStore.get<SessionPayload[]>(key) ?? [];
      localStore.set(key, [...list, payload]);
      return 'pending';
    }
  }

  /** Envía los entrenamientos que quedaron guardados sin conexión. */
  async flushPending(): Promise<void> {
    const key = this.pendingKey();
    if (!key) return;
    const list = localStore.get<SessionPayload[]>(key) ?? [];
    if (list.length === 0) return;
    const left: SessionPayload[] = [];
    for (const p of list) {
      const { error } = await this.sb.rpc('log_workout', { p_workout: p });
      // Si el día ya no existe (rutina borrada) no tiene sentido reintentar.
      if (error && !/foreign key|violates row-level/i.test(error.message)) left.push(p);
    }
    if (left.length) localStore.set(key, left);
    else localStore.remove(key);
  }

  /** Últimas series registradas de estos ejercicios (más recientes primero). */
  async history(exerciseIds: string[]): Promise<Map<string, LoadHistoryEntry[]>> {
    const map = new Map<string, LoadHistoryEntry[]>();
    if (exerciseIds.length === 0) return map;
    const { data, error } = await this.sb
      .from('set_logs')
      .select('workout_id,exercise_id,set_number,reps,weight_kg,rir,created_at')
      .in('exercise_id', exerciseIds)
      .order('created_at', { ascending: false })
      .order('set_number', { ascending: true })
      .limit(500);
    if (error) throw error;
    for (const row of (data ?? []) as LoadHistoryEntry[]) {
      const list = map.get(row.exercise_id) ?? [];
      list.push({ ...row, weight_kg: row.weight_kg === null ? null : Number(row.weight_kg) });
      map.set(row.exercise_id, list);
    }
    return map;
  }

  /** Qué día toca y cuántos entrenamientos van esta semana para una rutina. */
  async progress(routine: StoredRoutine): Promise<WorkoutProgress> {
    const days = routine.routine_days;
    const empty: WorkoutProgress = { nextDay: 0, doneThisWeek: 0, lastDoneAt: null };
    if (days.length === 0) return empty;

    const { data, error } = await this.sb
      .from('workout_logs')
      .select('routine_day_id,finished_at')
      .in(
        'routine_day_id',
        days.map((d) => d.id),
      )
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const logs = (data ?? []) as { routine_day_id: string; finished_at: string }[];
    if (logs.length === 0) return empty;

    const lastIndex = days.findIndex((d) => d.id === logs[0].routine_day_id);
    const monday = startOfWeek(new Date());
    return {
      nextDay: lastIndex < 0 ? 0 : (lastIndex + 1) % days.length,
      doneThisWeek: logs.filter((l) => new Date(l.finished_at) >= monday).length,
      lastDoneAt: logs[0].finished_at,
    };
  }

  private pendingKey(): string | null {
    const uid = this.auth.user()?.id;
    return uid ? `pending-workouts.${uid}` : null;
  }
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const diff = (date.getDay() + 6) % 7; // lunes = 0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
