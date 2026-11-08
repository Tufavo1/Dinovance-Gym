import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { PLACE_PRESETS } from './equipment';
import { ExerciseService } from './exercise.service';
import { ProfileService } from './profile.service';
import { generateRoutine, type GeneratedRoutine } from './routine-generator';
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
}

export interface StoredDay {
  id: string;
  day_index: number;
  name: string;
  routine_exercises: StoredExercise[];
}

export interface StoredRoutine {
  id: string;
  name: string;
  goal: string | null;
  place: string | null;
  notes: string | null;
  created_at: string;
  routine_days: StoredDay[];
}

export class EmptyExerciseCatalogError extends Error {
  constructor() {
    super('La base de ejercicios está vacía');
  }
}

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly catalog = inject(ExerciseService);

  /** Rutina activa del usuario con sus días y ejercicios, o null si no tiene. */
  async loadActive(): Promise<StoredRoutine | null> {
    const { data, error } = await this.sb
      .from('routines')
      .select(
        'id,name,goal,place,notes,created_at,routine_days(id,day_index,name,routine_exercises(id,exercise_id,position,sets,reps_min,reps_max,rest_seconds,notes))',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const routine = data as unknown as StoredRoutine;
    routine.routine_days.sort((a, b) => a.day_index - b.day_index);
    for (const day of routine.routine_days) {
      day.routine_exercises.sort((a, b) => a.position - b.position);
    }
    return routine;
  }

  /** Genera una rutina nueva para el lugar indicado y la guarda como rutina activa. */
  async generateAndSave(place: string): Promise<void> {
    const uid = this.auth.user()?.id;
    const health = this.profiles.health();
    if (!uid || !health) throw new Error('Faltan datos del perfil');

    await this.catalog.ensureLoaded();
    if (this.catalog.exercises().length === 0) throw new EmptyExerciseCatalogError();

    const gear = health.place_equipment?.[place] ?? PLACE_PRESETS[place] ?? [];
    const generated = generateRoutine({
      exercises: this.catalog.exercises(),
      areaMuscles: this.catalog.areaMuscles(),
      manualContra: this.catalog.contraindications(),
      health,
      injuries: this.profiles.injuries(),
      place,
      gear,
      age: ageFrom(this.profiles.profile()?.birth_date ?? null),
      seed: `${uid}:${Date.now()}`,
    });

    if (generated.days.every((d) => d.exercises.length === 0)) {
      throw new Error('No se pudo armar la rutina con los datos actuales');
    }
    await this.save(generated);
  }

  private async save(r: GeneratedRoutine): Promise<void> {
    // La rutina nueva se crea inactiva y solo se activa cuando todo se guardó bien.
    const created = await this.sb
      .from('routines')
      .insert({
        name: r.name,
        goal: r.goal,
        days_per_week: r.days_per_week,
        place: r.place,
        notes: r.notes.join('\n'),
        is_active: false,
      })
      .select('id')
      .single();
    if (created.error) throw created.error;
    const routineId = created.data.id as string;

    try {
      const days = await this.sb
        .from('routine_days')
        .insert(r.days.map((d) => ({ routine_id: routineId, day_index: d.day_index, name: d.name })))
        .select('id,day_index');
      if (days.error) throw days.error;
      const dayId = new Map((days.data ?? []).map((d) => [d.day_index as number, d.id as string]));

      const rows = r.days.flatMap((d) =>
        d.exercises.map((e, i) => ({
          day_id: dayId.get(d.day_index),
          exercise_id: e.exercise_id,
          position: i + 1,
          sets: e.sets,
          reps_min: e.reps_min,
          reps_max: e.reps_max,
          rest_seconds: e.rest_seconds,
          notes: e.notes,
        })),
      );
      const ins = await this.sb.from('routine_exercises').insert(rows);
      if (ins.error) throw ins.error;

      const off = await this.sb
        .from('routines')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', routineId);
      if (off.error) throw off.error;
      const on = await this.sb.from('routines').update({ is_active: true }).eq('id', routineId);
      if (on.error) throw on.error;
    } catch (e) {
      // Limpia la rutina a medio guardar (los días y ejercicios se borran en cascada).
      await this.sb.from('routines').delete().eq('id', routineId);
      throw e;
    }
  }
}

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate + 'T00:00:00');
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const had =
    now.getMonth() > born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
  if (!had) age--;
  return age;
}
