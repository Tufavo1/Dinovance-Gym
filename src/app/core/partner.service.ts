import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

export interface PartnerLink {
  link_id: string;
  partner_user_id: string;
  partner_name: string;
  status: 'pendiente' | 'aceptada';
  i_invited: boolean;
  i_share: boolean;
  partner_shares: boolean;
}

export interface PartnerSummary {
  available: boolean;
  /** Por qué no hay resumen: sin vínculo aceptado, o la otra persona no lo comparte. */
  reason?: 'sin_vinculo' | 'no_comparte';
  weeks?: { week_start: string; sessions: number; minutes: number; effective_sets: number }[];
  muscle_sets?: Record<string, number>;
}

/**
 * Vínculo opcional entre los dos perfiles. Solo sirve para compartir una rutina (se copia la
 * estructura, sin cargas) y para ver un resumen agregado si la otra persona lo permite.
 * Ninguna función devuelve pesos, repeticiones ni series de la otra persona, y nada de esto
 * alimenta las recomendaciones: cada progresión usa solo los registros propios.
 */
@Injectable({ providedIn: 'root' })
export class PartnerService {
  private readonly sb = inject(SupabaseService).client;

  async link(): Promise<PartnerLink | null> {
    const { data, error } = await this.sb.rpc('my_partner');
    if (error) throw error;
    return ((data ?? []) as PartnerLink[])[0] ?? null;
  }

  async invite(email: string): Promise<void> {
    const { error } = await this.sb.rpc('invite_partner', { p_email: email.trim() });
    if (error) throw error;
  }

  async respond(linkId: string, accept: boolean): Promise<void> {
    const { error } = await this.sb.rpc('respond_partner', { p_link_id: linkId, p_accept: accept });
    if (error) throw error;
  }

  async setSharing(share: boolean): Promise<void> {
    const { error } = await this.sb.rpc('set_partner_sharing', { p_share: share });
    if (error) throw error;
  }

  async unlink(linkId: string): Promise<void> {
    const { error } = await this.sb.from('partner_links').delete().eq('id', linkId);
    if (error) throw error;
  }

  async shareRoutine(routineId: string): Promise<void> {
    const { error } = await this.sb.rpc('share_routine_with_partner', { p_routine_id: routineId });
    if (error) throw error;
  }

  async summary(weeks = 8): Promise<PartnerSummary> {
    const { data, error } = await this.sb.rpc('partner_weekly_summary', { p_weeks: weeks });
    if (error) throw error;
    return data as PartnerSummary;
  }
}
