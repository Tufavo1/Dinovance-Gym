import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import type { HealthInput, HealthProfile, InjuryDraft, InjuryRecord, Profile } from './models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly sb = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  readonly profile = signal<Profile | null>(null);
  readonly health = signal<HealthProfile | null>(null);
  readonly injuries = signal<InjuryRecord[]>([]);

  private loadedFor: string | null = null;

  /** Carga perfil y datos de salud del usuario con sesión. Lanza error si falla la red o la base. */
  async load(force = false): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) {
      this.reset();
      return;
    }
    if (!force && this.loadedFor === uid) return;

    const [p, h, inj] = await Promise.all([
      this.sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      this.sb.from('health_profiles').select('*').eq('user_id', uid).maybeSingle(),
      this.sb.from('injury_records').select('id,body_area,kind,year,status,description').eq('user_id', uid),
    ]);
    if (p.error) throw p.error;
    if (h.error) throw h.error;
    if (inj.error) throw inj.error;

    this.profile.set(p.data as Profile | null);
    this.health.set(h.data as HealthProfile | null);
    this.injuries.set((inj.data ?? []) as InjuryRecord[]);
    this.loadedFor = uid;
  }

  isOnboarded(): boolean {
    const h = this.health();
    return (
      !!h &&
      h.consent_health_data &&
      !!h.experience &&
      !!h.goal &&
      !!h.last_trained &&
      (h.training_styles?.length ?? 0) > 0
    );
  }

  /** Guarda el cuestionario de salud y reemplaza la lista de lesiones/cirugías. */
  async saveOnboarding(health: HealthInput, injuries: InjuryDraft[]): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) throw new Error('Sin sesión');

    const up = await this.sb.from('health_profiles').upsert(
      {
        user_id: uid,
        ...health,
        consent_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (up.error) throw up.error;

    const del = await this.sb.from('injury_records').delete().eq('user_id', uid);
    if (del.error) throw del.error;

    if (injuries.length > 0) {
      const ins = await this.sb.from('injury_records').insert(
        injuries.map((i) => ({
          body_area: i.body_area,
          kind: i.kind,
          year: i.year,
          status: i.status,
          description: i.description.trim() || null,
        })),
      );
      if (ins.error) throw ins.error;
    }

    await this.load(true);
  }

  /** Guarda el equipo disponible de un lugar sin tocar el resto del cuestionario. */
  async saveEquipment(place: string, gear: string[]): Promise<void> {
    const uid = this.auth.user()?.id;
    const h = this.health();
    if (!uid || !h) throw new Error('Sin perfil');
    const next = { ...(h.place_equipment ?? {}), [place]: gear };
    const { error } = await this.sb.from('health_profiles').update({ place_equipment: next }).eq('user_id', uid);
    if (error) throw error;
    this.health.set({ ...h, place_equipment: next });
  }

  /** Corrige los datos personales que usa el generador (edad, peso y estatura). */
  async savePersonal(data: {
    birth_date: string | null;
    weight_kg: number | null;
    height_cm: number | null;
  }): Promise<void> {
    const uid = this.auth.user()?.id;
    if (!uid) throw new Error('Sin sesión');
    const { error } = await this.sb.from('profiles').update(data).eq('id', uid);
    if (error) throw error;
    await this.load(true);
  }

  reset(): void {
    this.profile.set(null);
    this.health.set(null);
    this.injuries.set([]);
    this.loadedFor = null;
  }
}
