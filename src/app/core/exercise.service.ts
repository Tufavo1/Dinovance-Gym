import { Injectable, computed, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import type { AreaMuscle, Exercise, ExerciseContraindication } from './models';
import { SupabaseService } from './supabase.service';

/** Catálogo de ejercicios (≈876 filas). Se descarga una vez por sesión y se guarda en memoria. */
@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly sb = inject(SupabaseService).client;

  readonly exercises = signal<Exercise[]>([]);
  readonly areaMuscles = signal<AreaMuscle[]>([]);
  readonly contraindications = signal<ExerciseContraindication[]>([]);
  readonly byId = computed(() => new Map(this.exercises().map((e) => [e.id, e])));

  private loading: Promise<void> | null = null;

  ensureLoaded(): Promise<void> {
    if (!this.loading) {
      this.loading = this.fetchAll().catch((e) => {
        this.loading = null;
        throw e;
      });
    }
    return this.loading;
  }

  imageUrl(ex: Exercise | undefined): string | null {
    const first = ex?.images?.[0];
    return first ? environment.exerciseImagesBaseUrl + first : null;
  }

  private async fetchAll(): Promise<void> {
    const [ex, am, ci] = await Promise.all([
      this.sb
        .from('exercises')
        .select(
          'id,name,category,level,force_type,mechanic,equipment,primary_muscles,secondary_muscles,instructions,images',
        )
        .range(0, 1999),
      this.sb.from('area_muscles').select('area,muscle,risk'),
      this.sb.from('exercise_contraindications').select('exercise_id,body_area,severity'),
    ]);
    if (ex.error) throw ex.error;
    if (am.error) throw am.error;
    if (ci.error) throw ci.error;
    this.exercises.set((ex.data ?? []) as Exercise[]);
    this.areaMuscles.set((am.data ?? []) as AreaMuscle[]);
    this.contraindications.set((ci.data ?? []) as ExerciseContraindication[]);
  }
}
