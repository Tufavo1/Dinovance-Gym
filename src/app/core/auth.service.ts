import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

export interface SignUpMetadata {
  full_name: string;
  phone: string;
  birth_date: string;
  gender: string;
  weight_kg: number;
  height_cm: number;
  country: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService).client;

  readonly session = signal<Session | null>(null);
  readonly user = computed(() => this.session()?.user ?? null);

  /** Se resuelve cuando ya se leyó la sesión guardada. Las guardas de ruta esperan esto. */
  readonly initialized: Promise<void>;

  constructor() {
    this.initialized = this.sb.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });
    // Importante: aquí no se llama a Supabase de forma asíncrona, solo se guarda la sesión.
    this.sb.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  async signUp(email: string, password: string, metadata: SignUpMetadata) {
    const result = await this.sb.auth.signUp({ email, password, options: { data: metadata } });
    if (result.data.session) this.session.set(result.data.session);
    return result;
  }

  async signIn(email: string, password: string) {
    const result = await this.sb.auth.signInWithPassword({ email, password });
    if (result.data.session) this.session.set(result.data.session);
    return result;
  }

  async signOut() {
    await this.sb.auth.signOut();
    this.session.set(null);
  }
}

/** Traduce los mensajes de error más comunes de Supabase Auth. */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese correo ya está registrado. Prueba iniciando sesión.';
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  if (m.includes('password')) return 'La contraseña no cumple los requisitos (mínimo 8 caracteres).';
  if (m.includes('fetch') || m.includes('network'))
    return 'No se pudo conectar. Revisa tu internet.';
  return 'Ocurrió un error. Inténtalo de nuevo.';
}
