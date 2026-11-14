import { Injectable, computed, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import type { AreaMuscle, Exercise, ExerciseContraindication, ExerciseMuscle } from './models';
import { fetchAllRows } from './paginate';
import { SupabaseService } from './supabase.service';

const BASE_COLUMNS =
  'id,name,name_es,category,level,force_type,mechanic,equipment,primary_muscles,secondary_muscles,instructions,images';
const CATALOG_COLUMNS =
  'instructions_es,movement_pattern,review_status,muscle_function,common_errors,variants,precautions,safety_notes,rep_range_min,rep_range_max,required_gear';

type MuscleRow = Omit<ExerciseMuscle, 'code'> & { exercise_id: string; muscle_code: string };

/** Catálogo de ejercicios (≈880 filas). Se descarga una vez por sesión y se guarda en memoria. */
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

  /** Músculos detallados de todos los ejercicios (por páginas). Sin la tabla, lista vacía. */
  private fetchMuscles(): Promise<MuscleRow[]> {
    return fetchAllRows<MuscleRow>((from, to) =>
      this.sb
        .from('exercise_muscles')
        .select('exercise_id,muscle_code,role,position,source')
        .order('exercise_id')
        .order('muscle_code')
        .range(from, to),
    ).catch(() => []);
  }

  private async fetchAll(): Promise<void> {
    const [exFull, am, ci, em] = await Promise.all([
      this.sb
        .from('exercises')
        .select(BASE_COLUMNS + ',' + CATALOG_COLUMNS)
        .range(0, 1999),
      this.sb.from('area_muscles').select('area,muscle,risk'),
      this.sb.from('exercise_contraindications').select('exercise_id,body_area,severity'),
      this.fetchMuscles(),
    ]);
    // Si la base aún no tiene el catálogo avanzado (migración 013), se usa el catálogo básico.
    const ex = exFull.error ? await this.sb.from('exercises').select(BASE_COLUMNS).range(0, 1999) : exFull;
    if (ex.error) throw ex.error;
    if (am.error) throw am.error;
    if (ci.error) throw ci.error;
    const muscles = new Map<string, ExerciseMuscle[]>();
    for (const row of em) {
      const list = muscles.get(row.exercise_id) ?? [];
      list.push({ code: row.muscle_code, role: row.role, position: row.position, source: row.source });
      muscles.set(row.exercise_id, list);
    }
    const list = ((ex.data ?? []) as unknown as Exercise[]).map((e) => ({
      ...e,
      muscles: (muscles.get(e.id) ?? []).sort((a, b) => a.position - b.position),
    }));
    this.exercises.set(list);
    this.areaMuscles.set((am.data ?? []) as AreaMuscle[]);
    this.contraindications.set((ci.data ?? []) as ExerciseContraindication[]);
  }
}
