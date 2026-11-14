import {
  formatLoad,
  harderDirection,
  incrementFor,
  isMass,
  nextAvailableLoad,
  toKg,
  type LoadSettings,
  type LoadUnit,
} from './load-units';

/**
 * Progresión de cargas por REGLAS, sobre los registros reales de UNA persona y UN ejercicio.
 *
 * Método: doble progresión. Se mantiene la carga mientras se suman repeticiones dentro del rango;
 * cuando TODAS las series planificadas llegan al tope del rango con el esfuerzo objetivo (RIR), se
 * propone el siguiente salto que exista en el equipo.
 *
 * Lo que este módulo NO hace, a propósito:
 *  - No sube la carga porque cambió la semana: solo mira el rendimiento registrado.
 *  - No inventa una carga inicial ni un historial: sin registros devuelve `sin_datos`.
 *  - No convierte niveles o placas a kilos, ni compara sesiones registradas en unidades distintas.
 *  - No modifica registros: devuelve una recomendación que la persona acepta o rechaza.
 */

export interface RecordedSet {
  reps: number | null;
  load: number | null;
  rir: number | null;
  /** Número de serie dentro de la sesión (para ordenarlas). */
  order?: number;
}

/** Una sesión de un ejercicio, con las series en el orden en que se hicieron. */
export interface ExerciseSession {
  workoutId: string;
  /** Fecha ISO de la sesión. */
  date: string;
  unit: LoadUnit;
  sets: RecordedSet[];
}

export interface ProgressionTarget {
  sets: number;
  repsMin: number;
  repsMax: number;
  /** RIR objetivo: [mínimo, máximo] de repeticiones en reserva. */
  rirMin: number;
  rirMax: number;
}

export interface ProgressionInput {
  target: ProgressionTarget;
  settings: LoadSettings;
  /** true si el ejercicio es de aislamiento (saltos más pequeños). */
  isolation: boolean;
  /** Sesiones de este ejercicio y de esta persona, de la más antigua a la más reciente. */
  sessions: ExerciseSession[];
}

export type ProgressionAction = 'subir' | 'mantener' | 'bajar' | 'progresar_reps' | 'sin_datos';

export type ProgressionFlag =
  | 'estancamiento'
  | 'caida_rendimiento'
  | 'salto_grande'
  | 'tope_de_escala'
  | 'sin_rir'
  | 'unidades_distintas'
  | 'series_incompletas'
  | 'salto_orientativo';

export interface SessionSummary {
  date: string;
  load: number;
  reps: number[];
  rir: (number | null)[];
}

export interface ProgressionAdvice {
  action: ProgressionAction;
  unit: LoadUnit;
  currentLoad: number | null;
  /** Carga propuesta para la próxima sesión (igual a la actual si se mantiene). */
  suggestedLoad: number | null;
  /** Explicación completa, con los datos que la justifican. */
  reason: string;
  /** Qué buscar en la próxima sesión. */
  nextGoal: string;
  flags: ProgressionFlag[];
  /** Datos concretos usados: se guardan con la recomendación. */
  evidence: {
    rule: string;
    target: ProgressionTarget;
    sessions: SessionSummary[];
  };
}

/** Sesiones seguidas sin sumar repeticiones (misma carga) para hablar de estancamiento. */
export const STALL_SESSIONS = 3;
/** Salto relativo (kg/lb) a partir del cual se pide una sesión más de confirmación. */
export const BIG_JUMP_RATIO = 0.1;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Resume una sesión: la carga de trabajo es la más repetida entre sus series (si hay empate, la
 * más alta) y solo cuentan las series hechas con esa carga. Así una serie de aproximación más
 * liviana no se confunde con el trabajo real.
 */
export function summarize(session: ExerciseSession): SessionSummary | null {
  const valid = session.sets.filter((s) => s.load !== null && s.reps !== null && s.reps > 0);
  if (valid.length === 0) return null;
  const counts = new Map<number, number>();
  for (const s of valid) counts.set(s.load!, (counts.get(s.load!) ?? 0) + 1);
  const load = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const work = valid.filter((s) => s.load === load);
  return { date: session.date, load, reps: work.map((s) => s.reps!), rir: work.map((s) => s.rir) };
}

function repsText(reps: number[]): string {
  return reps.join(', ');
}

export function recommendProgression(input: ProgressionInput): ProgressionAdvice {
  const { target, settings, isolation } = input;
  const label = settings.unitLabel;
  const show = (v: number | null, unit: LoadUnit = settings.unit) => formatLoad(v, unit, label);
  const flags: ProgressionFlag[] = [];

  const all = input.sessions
    .map((s) => ({ unit: s.unit, summary: summarize(s) }))
    .filter((s): s is { unit: LoadUnit; summary: SessionSummary } => s.summary !== null);

  // ---------- 1. Sin registros: no se inventa nada ----------
  if (all.length === 0) {
    const start = settings.startLoad;
    return {
      action: 'sin_datos',
      unit: settings.unit,
      currentLoad: null,
      suggestedLoad: start,
      reason:
        start !== null
          ? `Aún no hay registros tuyos de este ejercicio. Parte de la carga inicial que configuraste (${show(start)}).`
          : 'Aún no hay registros tuyos de este ejercicio, así que no hay base para recomendar una carga.',
      nextGoal: `Elige una carga con la que completes ${target.repsMin}-${target.repsMax} repeticiones dejando ${target.rirMin}-${target.rirMax} en reserva y regístrala: con eso se calculará la siguiente.`,
      flags,
      evidence: { rule: 'sin_registros', target, sessions: [] },
    };
  }

  // ---------- 2. Solo se comparan sesiones en la misma unidad que la última ----------
  const unit = all[all.length - 1].unit;
  if (all.some((s) => s.unit !== unit)) flags.push('unidades_distintas');
  const sessions = all.filter((s) => s.unit === unit).map((s) => s.summary);
  const last = sessions[sessions.length - 1];
  const prev = sessions.length > 1 ? sessions[sessions.length - 2] : null;
  const cfg: LoadSettings = { ...settings, unit };
  const evidenceSessions = sessions.slice(-STALL_SESSIONS);
  const dirUp = harderDirection(cfg.kind);
  const harder = cfg.kind === 'asistido' ? 'bajar la asistencia' : 'subir la carga';
  const easier = cfg.kind === 'asistido' ? 'subir la asistencia' : 'bajar la carga';

  const done = last.reps.length;
  const allTop = done >= target.sets && last.reps.slice(0, target.sets).every((r) => r >= target.repsMax);
  const belowMin = last.reps.filter((r) => r < target.repsMin).length;
  const rirs = last.rir.filter((r): r is number => r !== null);
  const hasRir = rirs.length > 0;
  const minRir = hasRir ? Math.min(...rirs) : null;
  // El esfuerzo fue el objetivo (o más fácil) si en ninguna serie quedaron menos reps en reserva que el mínimo.
  const effortOk = minRir !== null && minRir >= target.rirMin;

  const base = (
    action: ProgressionAction,
    suggestedLoad: number | null,
    rule: string,
    reason: string,
    nextGoal: string,
  ): ProgressionAdvice => ({
    action,
    unit,
    currentLoad: last.load,
    suggestedLoad,
    reason,
    nextGoal,
    flags,
    evidence: { rule, target, sessions: evidenceSessions },
  });

  const lastLine = `Última sesión con ${show(last.load, unit)}: ${repsText(last.reps)} repeticiones${
    hasRir ? ` (RIR ${last.rir.map((r) => r ?? '–').join(', ')})` : ''
  }; objetivo ${target.sets} × ${target.repsMin}-${target.repsMax} con RIR ${target.rirMin}-${target.rirMax}.`;

  // ---------- 3. Caída de rendimiento y estancamiento (misma carga, sesiones consecutivas) ----------
  const sameLoad = (s: SessionSummary) => s.load === last.load;
  let dropped = false;
  if (prev && sameLoad(prev)) {
    const n = Math.min(prev.reps.length, last.reps.length);
    if (n > 0 && sum(prev.reps.slice(0, n)) - sum(last.reps.slice(0, n)) >= 2) dropped = true;
  } else if (prev && isMass(unit) && cfg.kind !== 'asistido' && last.load < prev.load) {
    dropped = true;
  }
  if (dropped) flags.push('caida_rendimiento');

  const recent = sessions.slice(-STALL_SESSIONS);
  const stalled =
    recent.length === STALL_SESSIONS &&
    recent.every(sameLoad) &&
    recent.every(
      (s, i) => i === 0 || sum(s.reps.slice(0, target.sets)) <= sum(recent[i - 1].reps.slice(0, target.sets)),
    ) &&
    !allTop;
  if (stalled) flags.push('estancamiento');

  if (done < target.sets) flags.push('series_incompletas');

  // ---------- 4. Todas las series en el tope del rango ----------
  if (allTop) {
    if (!hasRir) {
      flags.push('sin_rir');
      return base(
        'mantener',
        last.load,
        'tope_sin_rir',
        `${lastLine} Completaste el tope del rango, pero no registraste el RIR: no se puede confirmar que quede margen para ${harder}.`,
        'Repite la carga y registra cuántas repeticiones te quedaban en cada serie.',
      );
    }
    if (!effortOk) {
      return base(
        'mantener',
        last.load,
        'tope_sin_margen',
        `${lastLine} Llegaste al tope del rango, pero al límite (RIR ${minRir} < ${target.rirMin}): todavía no hay margen para ${harder}.`,
        `Repite la carga hasta completar ${target.sets} × ${target.repsMax} dejando al menos ${target.rirMin} en reserva.`,
      );
    }
    if (dropped) {
      return base(
        'mantener',
        last.load,
        'tope_con_caida',
        `${lastLine} El rendimiento bajó respecto de la sesión anterior, así que se mantiene la carga.`,
        'Repite la carga y confirma el resultado antes de progresar.',
      );
    }

    const next = nextAvailableLoad(last.load, cfg, isolation, dirUp);
    if (next === null) {
      const inc = incrementFor(cfg, isolation);
      if (!inc) {
        return base(
          'progresar_reps',
          last.load,
          'sin_salto_definido',
          `${lastLine} Cumpliste el criterio para progresar, pero no está definido el salto mínimo de esta unidad.`,
          'Configura el salto mínimo de esta máquina, o progresa sumando una repetición por serie o haciendo la bajada más lenta.',
        );
      }
      flags.push('tope_de_escala');
      return base(
        'progresar_reps',
        last.load,
        'tope_de_escala',
        `${lastLine} Cumpliste el criterio para progresar, pero ${show(last.load, unit)} es el límite configurado del equipo.`,
        'Progresa sin cambiar la carga: una repetición más por serie, bajada más lenta (3 segundos) o una pausa en el punto difícil.',
      );
    }

    const inc = incrementFor(cfg, isolation)!;
    if (!inc.configured && isMass(unit)) flags.push('salto_orientativo');
    // Salto grande (o de tamaño desconocido, como un nivel): se exige confirmarlo en dos sesiones.
    const ratio = isMass(unit) && last.load > 0 ? Math.abs(next - last.load) / last.load : null;
    const needsConfirmation = ratio === null || ratio > BIG_JUMP_RATIO;
    const confirmed =
      prev !== null &&
      sameLoad(prev) &&
      prev.reps.length >= target.sets &&
      prev.reps.slice(0, target.sets).every((r) => r >= target.repsMax);
    if (needsConfirmation && !confirmed) {
      flags.push('salto_grande');
      const size =
        ratio === null
          ? `el siguiente salto disponible es ${show(next, unit)} y no se conoce cuánto más pesa`
          : `el siguiente salto disponible (${show(next, unit)}) es un ${Math.round(ratio * 100)} % más`;
      return base(
        'progresar_reps',
        last.load,
        'salto_grande_sin_confirmar',
        `${lastLine} Cumpliste el criterio, pero ${size}: se pide repetirlo una sesión más antes de cambiar.`,
        `Repite ${show(last.load, unit)} buscando ${target.sets} × ${target.repsMax} con el mismo margen; si lo confirmas, la próxima vez se propondrá ${show(next, unit)}.`,
      );
    }

    const note = !inc.configured && isMass(unit) ? ' (salto orientativo: usa el más cercano que tenga tu equipo)' : '';
    return base(
      'subir',
      next,
      confirmed && needsConfirmation ? 'tope_confirmado_dos_sesiones' : 'tope_del_rango_con_margen',
      `${lastLine} Completaste todas las series en el tope del rango con el esfuerzo objetivo${
        confirmed && needsConfirmation ? ' en dos sesiones seguidas' : ''
      }: corresponde ${harder} a ${show(next, unit)}${note}.`,
      `Con ${show(next, unit)} parte desde ${target.repsMin} repeticiones y vuelve a subir hasta ${target.repsMax}.`,
    );
  }

  // ---------- 5. No alcanzó el mínimo del rango ----------
  if (belowMin > 0) {
    const prevFailed = prev !== null && sameLoad(prev) && prev.reps.some((r) => r < target.repsMin);
    if (prevFailed) {
      const lower = nextAvailableLoad(last.load, cfg, isolation, dirUp === 1 ? -1 : 1);
      if (lower !== null) {
        return base(
          'bajar',
          lower,
          'bajo_el_minimo_dos_sesiones',
          `${lastLine} En dos sesiones seguidas quedaste bajo el mínimo del rango con esta carga: conviene ${easier} a ${show(lower, unit)} y reconstruir.`,
          `Con ${show(lower, unit)} busca ${target.sets} × ${target.repsMin}-${target.repsMax} con buena técnica.`,
        );
      }
    }
    return base(
      'mantener',
      last.load,
      'bajo_el_minimo',
      `${lastLine} ${belowMin === 1 ? 'Una serie quedó' : `${belowMin} series quedaron`} bajo el mínimo de ${target.repsMin} repeticiones: se mantiene la carga.`,
      `Repite ${show(last.load, unit)} y busca que todas las series lleguen al menos a ${target.repsMin}. Si vuelve a pasar, se propondrá ${easier}.`,
    );
  }

  // ---------- 6. Dentro del rango: sumar repeticiones con la misma carga ----------
  if (stalled) {
    return base(
      'mantener',
      last.load,
      'estancamiento',
      `${lastLine} Llevas ${STALL_SESSIONS} sesiones con ${show(last.load, unit)} sin sumar repeticiones: es un estancamiento.`,
      'Mantén la carga y revisa lo que más influye: descanso entre series, sueño y que cada serie termine con el RIR objetivo. Si sigue igual, cambia a una variante equivalente del catálogo.',
    );
  }
  const missing =
    last.reps.slice(0, target.sets).filter((r) => r < target.repsMax).length + Math.max(0, target.sets - done);
  return base(
    'progresar_reps',
    last.load,
    dropped ? 'dentro_del_rango_con_caida' : 'dentro_del_rango',
    `${lastLine} ${
      dropped ? 'El rendimiento bajó respecto de la sesión anterior. ' : ''
    }Aún ${missing === 1 ? 'falta 1 serie' : `faltan ${missing} series`} por llegar a ${target.repsMax} repeticiones: se mantiene la carga.`,
    done < target.sets
      ? `Completa las ${target.sets} series planificadas con ${show(last.load, unit)}.`
      : `Mantén ${show(last.load, unit)} y suma 1 repetición en las series que aún no llegan a ${target.repsMax}.`,
  );
}

/** Mejor 1RM estimado de una sesión, solo si la carga es una masa. Para tendencias, no para decidir. */
export function sessionKg(summary: SessionSummary, unit: LoadUnit): number | null {
  return toKg(summary.load, unit);
}
