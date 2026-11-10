import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { ExerciseService } from './exercise.service';
import type { Exercise } from './models';
import { SupabaseService } from './supabase.service';
import { e1rm } from './training/strength-math';

export interface WorkoutRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  session_rpe: number | null;
  tonnage_kg: number | null;
  effective_sets: number | null;
  paused_s: number | null;
}

export interface SetRow {
  workout_id: string;
  exercise_id: string;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
  created_at: string;
}

export interface WeekPoint {
  /** Lunes de la semana. */
  start: Date;
  sessions: number;
  tonnage: number;
  /** Carga de Foster: esfuerzo percibido × minutos. */
  load: number;
}

export interface StrengthTrend {
  exercise: Exercise;
  first: number;
  last: number;
  best: number;
  points: number[];
}

export interface WeightRow {
  measured_on: string;
  weight_kg: number;
}

export interface Stats {
  total: number;
  last30: number;
  streakWeeks: number;
  daysSinceLast: number | null;
  minutesTotal: number;
  avgRpe: number | null;
  weeks: WeekPoint[];
  /** Series de los últimos 7 días por músculo principal. */
  muscleSets: Map<string, number>;
  strength: StrengthTrend[];
  weights: WeightRow[];
  /** false si la tabla de peso corporal aún no existe (falta ejecutar la migración 011). */
  weightAvailable: boolean;
  /** Promedio de RIR de las últimas sesiones (para detectar fatiga acumulada). */
  recentAvgRir: number | null;
  recentAvgRpe: number | null;
}

const DAY = 86_400_000;

export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Calcula las métricas a partir del historial. Función pura para poder probarla. */
export function computeStats(
  workouts: WorkoutRow[],
  sets: SetRow[],
  byId: Map<string, Exercise>,
  weights: WeightRow[],
  weightAvailable: boolean,
  now = new Date(),
): Stats {
  const done = workouts.filter((w) => w.finished_at).sort((a, b) => a.started_at.localeCompare(b.started_at));
  const thisMonday = mondayOf(now);

  const weeks: WeekPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    weeks.push({ start: new Date(thisMonday.getTime() - i * 7 * DAY), sessions: 0, tonnage: 0, load: 0 });
  }
  let minutesTotal = 0;
  const rpes: number[] = [];
  for (const w of done) {
    const start = new Date(w.started_at);
    const end = new Date(w.finished_at!);
    const min = Math.max(0, (end.getTime() - start.getTime() - (w.paused_s ?? 0) * 1000) / 60000);
    minutesTotal += min;
    if (w.session_rpe) rpes.push(w.session_rpe);
    const wk = weeks.find((k) => start >= k.start && start.getTime() < k.start.getTime() + 7 * DAY);
    if (wk) {
      wk.sessions += 1;
      wk.tonnage += Number(w.tonnage_kg ?? 0);
      wk.load += (w.session_rpe ?? 0) * min;
    }
  }

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].sessions > 0) streak++;
    else if (i === weeks.length - 1)
      continue; // la semana en curso aún puede llenarse
    else break;
  }

  const last = done.at(-1);
  const sevenAgo = now.getTime() - 7 * DAY;
  const muscleSets = new Map<string, number>();
  const bestByDay = new Map<string, Map<string, number>>(); // ejercicio -> workout -> mejor e1RM
  const rirs: number[] = [];
  const recentIds = new Set(done.slice(-3).map((w) => w.id));
  for (const s of sets) {
    const ex = byId.get(s.exercise_id);
    if (!ex || !s.reps) continue;
    if (new Date(s.created_at).getTime() >= sevenAgo && ex.category !== 'stretching' && ex.category !== 'cardio') {
      const m = ex.primary_muscles[0];
      if (m) muscleSets.set(m, (muscleSets.get(m) ?? 0) + 1);
    }
    if (recentIds.has(s.workout_id) && s.rir !== null) rirs.push(s.rir);
    if (s.weight_kg && s.weight_kg > 0 && s.reps <= 12 && ex.mechanic === 'compound') {
      const est = e1rm(Number(s.weight_kg), s.reps, s.rir ?? 0);
      const per = bestByDay.get(s.exercise_id) ?? new Map<string, number>();
      per.set(s.workout_id, Math.max(per.get(s.workout_id) ?? 0, est));
      bestByDay.set(s.exercise_id, per);
    }
  }

  const order = new Map(done.map((w, i) => [w.id, i]));
  const strength: StrengthTrend[] = [];
  for (const [id, per] of bestByDay) {
    const ex = byId.get(id)!;
    const points = [...per.entries()]
      .sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
      .map(([, v]) => Math.round(v * 10) / 10);
    if (points.length < 2) continue;
    strength.push({ exercise: ex, first: points[0], last: points.at(-1)!, best: Math.max(...points), points });
  }
  strength.sort((a, b) => b.points.length - a.points.length).splice(5);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    total: done.length,
    last30: done.filter((w) => now.getTime() - new Date(w.started_at).getTime() <= 30 * DAY).length,
    streakWeeks: streak,
    daysSinceLast: last ? Math.floor((now.getTime() - new Date(last.finished_at!).getTime()) / DAY) : null,
    minutesTotal: Math.round(minutesTotal),
    avgRpe: avg(rpes),
    weeks,
    muscleSets,
    strength,
    weights,
    weightAvailable,
    recentAvgRir: avg(rirs),
    recentAvgRpe: avg(
      done
        .slice(-3)
        .map((w) => w.session_rpe ?? 0)
        .filter((x) => x > 0),
    ),
  };
}

/** Descarga el historial de los últimos 120 días y calcula las métricas del usuario. */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(ExerciseService);

  readonly stats = signal<Stats | null>(null);

  async load(): Promise<Stats> {
    if (!this.auth.user()) throw new Error('Sin sesión');
    await this.catalog.ensureLoaded();
    const since = new Date(Date.now() - 120 * DAY).toISOString();
    const [w, s, b] = await Promise.all([
      this.sb
        .from('workout_logs')
        .select('id,started_at,finished_at,session_rpe,tonnage_kg,effective_sets,paused_s')
        .gte('started_at', since)
        .order('started_at', { ascending: true })
        .limit(500),
      this.sb
        .from('set_logs')
        .select('workout_id,exercise_id,reps,weight_kg,rir,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(5000),
      this.sb.from('body_metrics').select('measured_on,weight_kg').order('measured_on', { ascending: true }).limit(400),
    ]);
    if (w.error) throw w.error;
    if (s.error) throw s.error;
    const weights = ((b.data ?? []) as WeightRow[]).map((r) => ({ ...r, weight_kg: Number(r.weight_kg) }));
    const stats = computeStats(
      (w.data ?? []) as WorkoutRow[],
      ((s.data ?? []) as SetRow[]).map((r) => ({ ...r, weight_kg: r.weight_kg === null ? null : Number(r.weight_kg) })),
      this.catalog.byId(),
      weights,
      !b.error,
    );
    this.stats.set(stats);
    return stats;
  }

  /** Registra (o corrige) el peso de hoy. */
  async addWeight(kg: number): Promise<void> {
    const { error } = await this.sb
      .from('body_metrics')
      .upsert(
        { weight_kg: kg, measured_on: new Date().toLocaleDateString('en-CA') },
        { onConflict: 'user_id,measured_on' },
      );
    if (error) throw error;
  }
}
