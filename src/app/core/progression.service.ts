import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { fetchAllRows } from './paginate';
import type { LoadKind, LoadSettings, LoadUnit } from './progression/load-units';
import type { ExerciseSession, ProgressionAdvice } from './progression/progression';
import { SupabaseService } from './supabase.service';

interface SettingsRow {
  exercise_id: string;
  load_unit: LoadUnit;
  unit_label: string | null;
  load_kind: LoadKind;
  min_increment: number | null;
  scale_min: number | null;
  scale_max: number | null;
  start_load: number | null;
  machine_name: string | null;
}

interface SetRow {
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  load_value: number | null;
  load_unit: LoadUnit;
  rir: number | null;
  started_at: string;
}

export interface StoredRecommendation {
  id: string;
  exercise_id: string;
  week_start: string;
  action: ProgressionAdvice['action'];
  current_value: number | null;
  suggested_value: number | null;
  load_unit: LoadUnit;
  reason: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  decided_at: string | null;
  created_at: string;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/**
 * Cargas de la persona con sesión: configuración de cada máquina, historial por ejercicio y
 * recomendaciones. Todo pasa por RLS, así que aquí nunca llegan registros de otra persona:
 * la progresión de cada perfil solo puede basarse en sus propios datos.
 */
@Injectable({ providedIn: 'root' })
export class ProgressionService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  /** Configuración de carga de todos los ejercicios que la persona definió. */
  async loadSettings(): Promise<Map<string, LoadSettings>> {
    const map = new Map<string, LoadSettings>();
    const { data, error } = await this.sb
      .from('exercise_load_settings')
      .select('exercise_id,load_unit,unit_label,load_kind,min_increment,scale_min,scale_max,start_load,machine_name');
    if (error) return map; // base sin la migración 015: se usan los valores por defecto
    for (const r of (data ?? []) as SettingsRow[]) {
      map.set(r.exercise_id, {
        unit: r.load_unit,
        unitLabel: r.unit_label,
        kind: r.load_kind,
        minIncrement: num(r.min_increment),
        scaleMin: num(r.scale_min),
        scaleMax: num(r.scale_max),
        startLoad: num(r.start_load),
        machineName: r.machine_name,
      });
    }
    return map;
  }

  async saveSettings(exerciseId: string, s: LoadSettings): Promise<void> {
    if (!this.auth.user()) throw new Error('Sin sesión');
    const { error } = await this.sb.from('exercise_load_settings').upsert(
      {
        exercise_id: exerciseId,
        load_unit: s.unit,
        unit_label: s.unit === 'otro' ? s.unitLabel?.trim() || null : null,
        load_kind: s.kind,
        min_increment: s.minIncrement,
        scale_min: s.scaleMin,
        scale_max: s.scaleMax,
        start_load: s.startLoad,
        machine_name: s.machineName?.trim() || null,
      },
      { onConflict: 'user_id,exercise_id' },
    );
    if (error) throw error;
  }

  /** Vuelve a los valores por defecto (borra la configuración; el historial no se toca). */
  async resetSettings(exerciseId: string): Promise<void> {
    const { error } = await this.sb.from('exercise_load_settings').delete().eq('exercise_id', exerciseId);
    if (error) throw error;
  }

  /**
   * Sesiones registradas de estos ejercicios, de la más antigua a la más reciente (máximo las
   * últimas `perExercise` de cada uno). Cada serie viene en la unidad en que se registró.
   */
  async sessions(exerciseIds: string[], perExercise = 8): Promise<Map<string, ExerciseSession[]>> {
    const map = new Map<string, ExerciseSession[]>();
    if (exerciseIds.length === 0) return map;
    // Las más recientes primero (hasta 6000 series), y luego se ordenan de la más antigua a la más nueva.
    const recent = await fetchAllRows<SetRow>(
      (from, to) =>
        this.sb
          .from('set_history')
          .select('workout_id,exercise_id,set_number,reps,load_value,load_unit,rir,started_at')
          .in('exercise_id', exerciseIds)
          .order('started_at', { ascending: false })
          .order('id')
          .range(from, to),
      6000,
    );
    const rows = recent.reverse();
    for (const r of rows) {
      const list = map.get(r.exercise_id) ?? [];
      let session = list.find((x) => x.workoutId === r.workout_id);
      if (!session) {
        session = { workoutId: r.workout_id, date: r.started_at, unit: r.load_unit ?? 'kg', sets: [] };
        list.push(session);
        map.set(r.exercise_id, list);
      }
      session.sets.push({ reps: r.reps, load: num(r.load_value), rir: r.rir, order: r.set_number });
    }
    for (const [id, list] of map) {
      // Dentro de cada sesión, las series van en el orden en que se hicieron.
      for (const session of list) session.sets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      map.set(id, list.slice(-perExercise));
    }
    return map;
  }

  /** Ejercicios en los que la persona tiene series con repeticiones registradas (último año). */
  async performed(): Promise<string[]> {
    const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
    const data = await fetchAllRows<{ exercise_id: string }>((from, to) =>
      this.sb
        .from('set_history')
        .select('exercise_id')
        .gte('started_at', since)
        .not('reps', 'is', null)
        .order('started_at')
        .order('id')
        .range(from, to),
    );
    return [...new Set(data.map((r) => r.exercise_id))];
  }

  /** Guarda (o actualiza si sigue pendiente) la recomendación de una semana para un ejercicio. */
  async storeRecommendation(exerciseId: string, weekStart: string, advice: ProgressionAdvice): Promise<void> {
    const existing = await this.sb
      .from('load_recommendations')
      .select('id,status')
      .eq('exercise_id', exerciseId)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (existing.error) throw existing.error;
    // Una recomendación ya aceptada o rechazada no se reescribe: queda como historial.
    if (existing.data && existing.data.status !== 'pendiente') return;
    const row = {
      exercise_id: exerciseId,
      week_start: weekStart,
      action: advice.action,
      current_value: advice.currentLoad,
      suggested_value: advice.suggestedLoad,
      load_unit: advice.unit,
      reason: advice.reason.slice(0, 600),
      evidence: advice.evidence,
    };
    const { error } = existing.data
      ? await this.sb.from('load_recommendations').update(row).eq('id', existing.data.id)
      : await this.sb.from('load_recommendations').insert(row);
    if (error) throw error;
  }

  async recommendations(limit = 60): Promise<StoredRecommendation[]> {
    const { data, error } = await this.sb
      .from('load_recommendations')
      .select(
        'id,exercise_id,week_start,action,current_value,suggested_value,load_unit,reason,status,decided_at,created_at',
      )
      .order('week_start', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as StoredRecommendation[]).map((r) => ({
      ...r,
      current_value: num(r.current_value),
      suggested_value: num(r.suggested_value),
    }));
  }

  /**
   * Registra la decisión de la persona. Ni aceptar ni rechazar cambia registros ya hechos: la
   * decisión solo se tiene en cuenta al proponer la carga de la próxima sesión.
   */
  async decide(id: string, accepted: boolean): Promise<void> {
    const { error } = await this.sb
      .from('load_recommendations')
      .update({ status: accepted ? 'aceptada' : 'rechazada', decided_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  /** Cargas que la persona rechazó (la recomendación más reciente de cada ejercicio). */
  async rejectedLoads(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const seen = new Set<string>();
    for (const r of await this.recommendations(200).catch(() => [])) {
      if (seen.has(r.exercise_id)) continue;
      seen.add(r.exercise_id);
      if (r.status === 'rechazada' && r.suggested_value !== null) map.set(r.exercise_id, r.suggested_value);
    }
    return map;
  }
}
