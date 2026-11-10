import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { proteinTarget, weeklyRange } from './evidence/programming';
import { localStore } from './local-store';
import { MUSCLE_ES } from './routine/rules';
import { exerciseName } from './routine/exercise-names';
import { buildAthleteProfile } from './routine/athlete-profile';
import { ProfileService } from './profile.service';
import { ageFrom, RoutineService } from './routine.service';
import { StatsService, mondayOf, type Stats } from './stats.service';

export interface InboxMessage {
  /** Estable mientras el mensaje siga vigente: sirve para saber si ya se leyó. */
  id: string;
  icon: string;
  tone: 'info' | 'success' | 'warning';
  title: string;
  body: string;
  /** Pantalla a la que lleva el mensaje. */
  link?: string;
}

/**
 * Bandeja de mensajes del entrenador: se generan solos a partir de tus entrenamientos, tu
 * perfil y tu rutina (no hay servidor de mensajes). Aparecen en el ícono de sobre del encabezado.
 */
@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly routines = inject(RoutineService);
  private readonly statsSvc = inject(StatsService);

  readonly messages = signal<InboxMessage[]>([]);
  private readonly read = signal<Set<string>>(new Set());
  readonly unread = computed(() => this.messages().filter((m) => !this.read().has(m.id)).length);
  private lastRefresh = 0;

  isRead(id: string): boolean {
    return this.read().has(id);
  }

  private key(): string | null {
    const uid = this.auth.user()?.id;
    return uid ? `messages.read.${uid}` : null;
  }

  markAllRead() {
    const next = new Set(this.read());
    this.messages().forEach((m) => next.add(m.id));
    this.read.set(next);
    const k = this.key();
    if (k) localStore.set(k, [...next].slice(-200));
  }

  /** Recalcula los mensajes (máximo una vez cada 5 minutos, salvo que se fuerce). */
  async refresh(force = false): Promise<void> {
    if (!this.auth.user()) return;
    if (!force && Date.now() - this.lastRefresh < 5 * 60_000) return;
    this.lastRefresh = Date.now();
    const k = this.key();
    if (k) this.read.set(new Set(localStore.get<string[]>(k) ?? []));
    try {
      await this.profiles.load().catch(() => undefined);
      const stats = await this.statsSvc.load();
      const { routine } = await this.routines.loadActive().catch(() => ({ routine: null }));
      this.messages.set(this.build(stats, routine?.created_at ?? null, routine?.days_per_week ?? null));
    } catch {
      this.messages.set(this.build(null, null, null));
    }
  }

  reset() {
    this.messages.set([]);
    this.read.set(new Set());
    this.lastRefresh = 0;
  }

  private build(stats: Stats | null, routineCreated: string | null, goalDays: number | null): InboxMessage[] {
    const out: InboxMessage[] = [];
    const h = this.profiles.health();
    const profile = this.profiles.profile();
    const week = mondayOf(new Date()).toISOString().slice(0, 10);

    const p = h
      ? buildAthleteProfile(h, this.profiles.injuries(), ageFrom(profile?.birth_date ?? null), profile?.gender ?? null)
      : null;

    if (stats) {
      // Semana cumplida.
      const thisWeek = stats.weeks.at(-1)?.sessions ?? 0;
      if (goalDays && thisWeek >= goalDays) {
        out.push({
          id: `week-done-${week}`,
          icon: 'trophy-outline',
          tone: 'success',
          title: '¡Semana cumplida!',
          body: `Completaste tus ${goalDays} entrenamientos de esta semana. La constancia es lo que más pesa en los resultados.`,
          link: '/progreso',
        });
      }

      // Récord de fuerza reciente.
      for (const t of stats.strength) {
        if (t.points.length >= 3 && t.last >= t.best && t.last >= t.first * 1.025) {
          out.push({
            id: `pr-${t.exercise.id}-${Math.round(t.last)}`,
            icon: 'ribbon-outline',
            tone: 'success',
            title: 'Nuevo récord de fuerza',
            body: `${exerciseName(t.exercise)}: tu 1RM estimado subió de ${t.first} a ${t.last} kg.`,
            link: '/progreso',
          });
          break;
        }
      }

      // Inactividad.
      if (stats.daysSinceLast !== null && stats.daysSinceLast >= 5) {
        out.push({
          id: `inactive-${week}`,
          icon: 'time-outline',
          tone: 'warning',
          title: `Llevas ${stats.daysSinceLast} días sin entrenar`,
          body: 'Retomar pronto evita perder el ritmo. Si te sientes cansado, haz una sesión más corta: es mejor que saltarla.',
          link: '/home',
        });
      } else if (stats.total === 0) {
        out.push({
          id: 'first-workout',
          icon: 'rocket-outline',
          tone: 'info',
          title: 'Haz tu primer entrenamiento',
          body: 'Toca "Empezar" en Inicio. La app te guía serie por serie y calcula el peso para ti.',
          link: '/home',
        });
      }

      // Descarga (Israetel, Bell 2022).
      const meso = p?.programme.mesocycleWeeks ?? 5;
      const fatigued = stats.recentAvgRir !== null && stats.recentAvgRir <= 0.5 && (stats.recentAvgRpe ?? 0) >= 9;
      if (stats.streakWeeks >= meso || fatigued) {
        out.push({
          id: `deload-${week}`,
          icon: 'battery-half-outline',
          tone: 'warning',
          title: 'Considera una semana de descarga',
          body: fatigued
            ? 'Tus últimas sesiones fueron al límite (RIR ≈ 0 y esfuerzo 9 o más). Una semana con la mitad de series te ayuda a recuperarte y volver más fuerte.'
            : `Llevas ${stats.streakWeeks} semanas seguidas entrenando. Cada ${meso} semanas conviene una descarga: la mitad de series, mismo peso.`,
          link: '/ciencia',
        });
      }

      // Volumen alto en algún músculo.
      if (p && stats.total >= 3) {
        for (const [m, n] of stats.muscleSets) {
          const r = weeklyRange(m, p.programme);
          if (r && n > r[1] + 4) {
            out.push({
              id: `volume-${m}-${week}`,
              icon: 'warning-outline',
              tone: 'warning',
              title: `Mucho volumen en ${MUSCLE_ES[m] ?? m}`,
              body: `Hiciste ${n} series en 7 días y tu rango es ${r[0]} a ${r[1]}. Más no siempre es mejor: si notas dolor o cansancio, baja una serie por ejercicio.`,
              link: '/progreso',
            });
            break;
          }
        }
      }

      // Peso corporal.
      if (stats.weightAvailable) {
        const last = stats.weights.at(-1);
        const ago = last ? (Date.now() - new Date(last.measured_on).getTime()) / 86_400_000 : Infinity;
        if (ago > 14) {
          out.push({
            id: `weigh-${week}`,
            icon: 'scale-outline',
            tone: 'info',
            title: 'Registra tu peso',
            body: 'Pesarte una vez por semana, a la misma hora, permite ver si tu avance va en la dirección que buscas.',
            link: '/progreso',
          });
        }
      }
    }

    // Rutina antigua.
    if (routineCreated) {
      const weeks = Math.floor((Date.now() - new Date(routineCreated).getTime()) / (7 * 86_400_000));
      const limit = p?.beginner ? 12 : 8;
      if (weeks >= limit) {
        out.push({
          id: `renew-${Math.floor(weeks / limit)}`,
          icon: 'refresh-outline',
          tone: 'info',
          title: 'Tu rutina cumple ' + weeks + ' semanas',
          body: 'Cambiar algunos ejercicios cada 2 o 3 meses mantiene el estímulo y reduce el aburrimiento. Puedes editar tus días o generar una rutina nueva.',
          link: '/rutina',
        });
      }
    }

    // Proteína (Morton 2018; Helms 2014).
    const prot = proteinTarget(profile?.weight_kg ? Number(profile.weight_kg) : null, h?.nutrition_phase);
    if (prot) {
      out.push({
        id: 'protein',
        icon: 'nutrition-outline',
        tone: 'info',
        title: `Proteína: ${prot[0]} a ${prot[1]} g al día`,
        body: 'Es el rango donde la evidencia muestra más ganancia de músculo. Repártela en 3 a 5 comidas.',
        link: '/ciencia',
      });
    }

    out.push({
      id: 'welcome',
      icon: 'sparkles-outline',
      tone: 'info',
      title: 'Bienvenido a Dinovance',
      body: 'Tus rutinas se arman con evidencia científica (Schoenfeld, Helms, Israetel y más). Puedes editar cualquier día y ver los estudios en "La ciencia".',
      link: '/ciencia',
    });
    return out;
  }
}
