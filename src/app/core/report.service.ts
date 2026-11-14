import { Injectable, inject } from '@angular/core';

import {
  buildWeeklyReport,
  isoDate,
  mondayOfWeek,
  pendingWeeks,
  type PlannedExercise,
  type ReportSet,
  type ReportWorkout,
  type WeeklyReport,
} from './analysis/weekly-report';
import { AuthService } from './auth.service';
import { weeklyRange } from './evidence/programming';
import { ExerciseService } from './exercise.service';
import { fetchAllRows } from './paginate';
import { ProfileService } from './profile.service';
import { ProgressionService } from './progression.service';
import type { LoadUnit } from './progression/load-units';
import { RoutineService, ageFrom } from './routine.service';
import { buildAthleteProfile } from './routine/athlete-profile';
import { SupabaseService } from './supabase.service';

const WEEK = 7 * 86_400_000;
const WORKOUT_COLUMNS =
  'id,started_at,finished_at,session_rpe,paused_s,ended_early,exercises_planned,exercises_done,readiness,fatigue,discomfort_areas,discomfort_note';

export interface StoredReport {
  week_start: string;
  generated_at: string;
  report: WeeklyReport;
}

/**
 * Informes semanales de la persona con sesión. Se calculan con sus registros (RLS impide leer los
 * de otra persona) y se guardan una vez por semana terminada. No hay tarea programada en el
 * servidor: al abrir la app se generan los informes de las semanas ya cerradas que falten.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(ExerciseService);
  private readonly profiles = inject(ProfileService);
  private readonly routines = inject(RoutineService);
  private readonly progression = inject(ProgressionService);

  private running: Promise<number> | null = null;

  /** Genera y guarda los informes de las semanas terminadas que aún no lo tienen. Devuelve cuántos. */
  ensureReports(): Promise<number> {
    if (!this.running) {
      this.running = this.generateMissing().finally(() => (this.running = null));
    }
    return this.running;
  }

  private async generateMissing(): Promise<number> {
    if (!this.auth.user()) return 0;
    const since = new Date(Date.now() - 9 * WEEK).toISOString();
    const [dates, existing] = await Promise.all([
      this.sb
        .from('workout_logs')
        .select('started_at')
        .not('finished_at', 'is', null)
        .gte('started_at', since)
        .limit(500),
      this.sb.from('weekly_reports').select('week_start').gte('week_start', since.slice(0, 10)),
    ]);
    if (dates.error) throw dates.error;
    if (existing.error) throw existing.error;
    const weeks = pendingWeeks(
      (dates.data ?? []).map((r) => r.started_at as string),
      new Set((existing.data ?? []).map((r) => r.week_start as string)),
    );
    for (const week of weeks) {
      const report = await this.build(week);
      const { error } = await this.sb
        .from('weekly_reports')
        .upsert({ week_start: report.weekStart, report }, { onConflict: 'user_id,week_start' });
      if (error) throw error;
      // Cada recomendación queda guardada para que la persona la acepte o la rechace.
      for (const e of report.exercises) {
        if (e.advice.action === 'sin_datos') continue;
        await this.progression.storeRecommendation(e.exercise_id, report.weekStart, e.advice);
      }
    }
    return weeks.length;
  }

  /** Informe de la semana en curso (no se guarda: la semana aún no termina). */
  current(): Promise<WeeklyReport> {
    return this.build(mondayOfWeek(new Date()));
  }

  async list(limit = 12): Promise<StoredReport[]> {
    const { data, error } = await this.sb
      .from('weekly_reports')
      .select('week_start,generated_at,report')
      .order('week_start', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as StoredReport[];
  }

  /** Vuelve a calcular el informe de una semana (por ejemplo, tras importar entrenamientos). */
  async regenerate(weekStart: string): Promise<WeeklyReport> {
    const report = await this.build(new Date(weekStart + 'T00:00:00'));
    const { error } = await this.sb
      .from('weekly_reports')
      .upsert(
        { week_start: report.weekStart, report, generated_at: new Date().toISOString() },
        { onConflict: 'user_id,week_start' },
      );
    if (error) throw error;
    return report;
  }

  private async build(weekStart: Date): Promise<WeeklyReport> {
    await Promise.all([this.catalog.ensureLoaded(), this.profiles.load()]);
    const from = new Date(weekStart.getTime() - 6 * WEEK).toISOString();
    const to = new Date(weekStart.getTime() + WEEK).toISOString();
    const w = await this.sb
      .from('workout_logs')
      .select(WORKOUT_COLUMNS)
      .gte('started_at', from)
      .lt('started_at', to)
      .order('started_at', { ascending: true })
      .limit(300);
    if (w.error) throw w.error;
    const workouts = (w.data ?? []) as ReportWorkout[];
    let sets: ReportSet[] = [];
    if (workouts.length > 0) {
      type Row = Omit<ReportSet, 'load_unit'> & { load_unit: LoadUnit | null };
      const ids = workouts.map((x) => x.id);
      const rows = await fetchAllRows<Row>((from, to) =>
        this.sb
          .from('set_logs')
          .select('workout_id,exercise_id,set_number,reps,load_value,load_unit,rir')
          .in('workout_id', ids)
          .order('id')
          .range(from, to),
      );
      sets = rows.map((r) => ({
        ...r,
        load_value: r.load_value === null ? null : Number(r.load_value),
        load_unit: r.load_unit ?? 'kg',
      }));
    }

    const [{ routine }, settings] = await Promise.all([
      this.routines.loadActive().catch(() => ({ routine: null })),
      this.progression.loadSettings(),
    ]);
    const health = this.profiles.health();
    const profile = this.profiles.profile();
    const athlete = health
      ? buildAthleteProfile(
          health,
          this.profiles.injuries(),
          ageFrom(profile?.birth_date ?? null),
          profile?.gender ?? null,
        )
      : null;
    const defaultRir: [number, number] = athlete?.programme.rir ?? [2, 3];

    const plan = new Map<string, PlannedExercise>();
    for (const d of routine?.routine_days ?? []) {
      for (const e of d.routine_exercises) {
        if (e.reps_min === 1 && e.reps_max === 1) continue;
        plan.set(e.exercise_id, {
          exercise_id: e.exercise_id,
          sets: e.sets,
          repsMin: e.reps_min,
          repsMax: e.reps_max,
          rirMin: e.rir_min ?? defaultRir[0],
          rirMax: e.rir_max ?? defaultRir[1],
        });
      }
    }

    return buildWeeklyReport({
      weekStart,
      workouts,
      sets,
      exercises: this.catalog.byId(),
      plannedSessions: routine ? (routine.days_per_week ?? routine.routine_days.length) : null,
      plan,
      settings,
      weeklyRange: (key) => (athlete ? weeklyRange(key, athlete.programme) : null),
      defaultRir,
    });
  }
}

export { isoDate };
