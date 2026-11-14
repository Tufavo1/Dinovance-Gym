import { Injectable, inject } from '@angular/core';

import type { Option } from './models';
import { SupabaseService } from './supabase.service';

export type MeasureKind =
  'cintura' | 'cadera' | 'pecho' | 'brazo' | 'muslo' | 'pantorrilla' | 'cuello' | 'grasa_pct' | 'masa_muscular_kg';

export const MEASURE_OPTIONS: (Option & { unit: string })[] = [
  { value: 'cintura', label: 'Cintura', unit: 'cm' },
  { value: 'cadera', label: 'Cadera', unit: 'cm' },
  { value: 'pecho', label: 'Pecho', unit: 'cm' },
  { value: 'brazo', label: 'Brazo', unit: 'cm' },
  { value: 'muslo', label: 'Muslo', unit: 'cm' },
  { value: 'pantorrilla', label: 'Pantorrilla', unit: 'cm' },
  { value: 'cuello', label: 'Cuello', unit: 'cm' },
  { value: 'grasa_pct', label: 'Grasa corporal', unit: '%' },
  { value: 'masa_muscular_kg', label: 'Masa muscular', unit: 'kg' },
];

export interface Measurement {
  id: string;
  measured_on: string;
  kind: MeasureKind;
  value: number;
}

export type GoalKind = 'peso_corporal' | 'carga_ejercicio' | 'repeticiones_ejercicio' | 'entrenos_semana' | 'medida';

export interface Goal {
  id: string;
  kind: GoalKind;
  exercise_id: string | null;
  measure_kind: string | null;
  title: string;
  start_value: number | null;
  target_value: number;
  unit: string;
  start_date: string;
  target_date: string | null;
  status: 'en_curso' | 'lograda' | 'abandonada';
  achieved_at: string | null;
}

export type GoalInput = Pick<
  Goal,
  'kind' | 'exercise_id' | 'measure_kind' | 'title' | 'start_value' | 'target_value' | 'unit' | 'target_date'
>;

/**
 * Avance de una meta entre su valor inicial y su objetivo (0 a 100). Null si falta el valor
 * inicial o el actual: no se supone ninguno.
 */
export function goalProgress(start: number | null, target: number, current: number | null): number | null {
  if (start === null || current === null || start === target) return null;
  return Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)));
}

/** Mediciones corporales y metas de la persona con sesión. */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly sb = inject(SupabaseService).client;

  async measurements(): Promise<Measurement[]> {
    const { data, error } = await this.sb
      .from('body_measurements')
      .select('id,measured_on,kind,value')
      .order('measured_on', { ascending: true })
      .limit(1000);
    if (error) throw error;
    return ((data ?? []) as Measurement[]).map((m) => ({ ...m, value: Number(m.value) }));
  }

  /** Registra (o corrige) la medición de un día. La corrección queda en el historial de cambios. */
  async addMeasurement(kind: MeasureKind, value: number, date: string): Promise<void> {
    const { error } = await this.sb
      .from('body_measurements')
      .upsert({ kind, value, measured_on: date }, { onConflict: 'user_id,measured_on,kind' });
    if (error) throw error;
  }

  async goals(): Promise<Goal[]> {
    const { data, error } = await this.sb
      .from('fitness_goals')
      .select(
        'id,kind,exercise_id,measure_kind,title,start_value,target_value,unit,start_date,target_date,status,achieved_at',
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return ((data ?? []) as Goal[]).map((g) => ({
      ...g,
      start_value: g.start_value === null ? null : Number(g.start_value),
      target_value: Number(g.target_value),
    }));
  }

  async addGoal(goal: GoalInput): Promise<void> {
    const { error } = await this.sb.from('fitness_goals').insert(goal);
    if (error) throw error;
  }

  async setGoalStatus(id: string, status: Goal['status']): Promise<void> {
    const { error } = await this.sb
      .from('fitness_goals')
      .update({ status, achieved_at: status === 'lograda' ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) throw error;
  }

  async removeGoal(id: string): Promise<void> {
    const { error } = await this.sb.from('fitness_goals').delete().eq('id', id);
    if (error) throw error;
  }
}
