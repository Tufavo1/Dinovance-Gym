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

  /** Carga ejercicios desde la copia local (modo sin conexión) si el catálogo está vacío. */
  seed(list: Exercise[]) {
    if (this.exercises().length === 0) this.exercises.set(list);
  }

  /** Todas las imágenes del ejercicio (posición inicial y final). */
  imageUrls(ex: Exercise | undefined): string[] {
    return (ex?.images ?? []).map((i) => environment.exerciseImagesBaseUrl + i);
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
          'id,name,name_es,category,level,force_type,mechanic,equipment,primary_muscles,secondary_muscles,instructions,images',
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
