import type { Exercise } from '../models';
import { adviseLoad, loadModeOf, type LoadAthlete, type LoadMode } from '../training/load-advisor';
import { DEFAULT_LOAD_SETTINGS, formatLoad, incrementFor, type LoadKind, type LoadSettings } from './load-units';
import {
  recommendProgression,
  type ExerciseSession,
  type ProgressionAdvice,
  type ProgressionTarget,
} from './progression';

/**
 * Qué carga proponer al empezar un ejercicio en el entrenamiento guiado.
 *
 * Orden de las fuentes (de más a menos fiable). Solo las dos primeras rellenan el campo de carga:
 *  1. Registros reales de la persona en este ejercicio -> progresión por reglas.
 *  2. Carga inicial que la persona configuró para su máquina.
 *  3. Marca de fuerza que la persona declaró en su perfil -> estimación, avisando que lo es.
 *  4. Nada propio: el campo queda vacío. Como ayuda se muestra una referencia orientativa por
 *     peso corporal (si la persona registró su peso), marcada como "no es un dato tuyo".
 * La persona siempre puede escribir otra carga: lo que registra es lo que se guarda.
 */
export interface SessionAdvice {
  /** Cómo se mide la carga de este ejercicio para esta persona. */
  settings: LoadSettings;
  /** true si la persona configuró esta máquina; false si se usan los valores por defecto. */
  configured: boolean;
  /** false en ejercicios por tiempo o solo con peso corporal: no se pide carga. */
  loadable: boolean;
  mode: LoadMode;
  /** Valor con el que se rellena el campo (en la unidad de `settings`). Null = campo vacío. */
  suggested: number | null;
  basis: 'registros' | 'carga_inicial' | 'marca' | 'ninguna';
  /** Referencia poblacional, solo informativa. */
  reference: string | null;
  /** Salto de los botones + y −. Null = sin salto definido (solo escritura libre). */
  step: number | null;
  reason: string;
  nextGoal: string;
  progression: ProgressionAdvice | null;
}

/** Configuración por defecto según el tipo de ejercicio, mientras la persona no defina la suya. */
export function defaultSettingsFor(ex: Exercise, mode: LoadMode): LoadSettings {
  const kind: LoadKind =
    mode === 'mancuerna' ? 'por_lado' : mode === 'contrapeso' ? 'asistido' : mode === 'corporal' ? 'corporal' : 'total';
  return {
    ...DEFAULT_LOAD_SETTINGS,
    kind,
    minIncrement: mode === 'contrapeso' ? 5 : null,
    machineName: ex.name_es ?? null,
  };
}

export function adviseSession(
  ex: Exercise,
  target: ProgressionTarget,
  athlete: LoadAthlete,
  sessions: ExerciseSession[],
  userSettings: LoadSettings | null,
  opts: { timed?: boolean; assisted?: boolean; rejectedLoad?: number | null } = {},
): SessionAdvice {
  const mode = loadModeOf(ex, !!opts.timed, !!opts.assisted);
  const settings = userSettings ?? defaultSettingsFor(ex, mode);
  const isolation = ex.mechanic === 'isolation';
  const step = incrementFor(settings, isolation)?.step ?? null;
  const base = { settings, configured: userSettings !== null, mode, step, reference: null, progression: null };

  if (mode === 'tiempo') {
    return { ...base, loadable: false, suggested: null, basis: 'ninguna', reason: '', nextGoal: '' };
  }
  if (settings.kind === 'corporal') {
    return {
      ...base,
      loadable: false,
      suggested: null,
      basis: 'ninguna',
      reason: 'Con tu peso corporal. Si te sobran muchas repeticiones, hazlas más lento.',
      nextGoal: '',
    };
  }

  const progression = recommendProgression({ target, settings, isolation, sessions });
  if (progression.action !== 'sin_datos') {
    // La persona rechazó este cambio de carga: se respeta y se mantiene la carga actual.
    const rejected =
      opts.rejectedLoad !== null &&
      opts.rejectedLoad !== undefined &&
      progression.suggestedLoad === opts.rejectedLoad &&
      progression.suggestedLoad !== progression.currentLoad;
    if (rejected) {
      return {
        ...base,
        settings: { ...settings, unit: progression.unit },
        loadable: true,
        suggested: progression.currentLoad,
        basis: 'registros',
        reason: `Rechazaste el cambio a ${formatLoad(opts.rejectedLoad!, progression.unit, settings.unitLabel)}: se mantiene ${formatLoad(progression.currentLoad, progression.unit, settings.unitLabel)}. Puedes cambiarlo cuando quieras.`,
        nextGoal: 'Sigue sumando repeticiones o control del movimiento con la carga actual.',
        progression,
      };
    }
    return {
      ...base,
      // Si la última sesión se registró en otra unidad, se muestra en esa unidad.
      settings: { ...settings, unit: progression.unit },
      loadable: true,
      suggested: progression.suggestedLoad,
      basis: 'registros',
      reason: progression.reason,
      nextGoal: progression.nextGoal,
      progression,
    };
  }
  if (settings.startLoad !== null) {
    return {
      ...base,
      loadable: true,
      suggested: settings.startLoad,
      basis: 'carga_inicial',
      reason: progression.reason,
      nextGoal: progression.nextGoal,
      progression,
    };
  }

  // Las estimaciones solo existen en kilos: un nivel de máquina no se puede estimar.
  if (
    settings.unit === 'kg' &&
    (settings.kind === 'total' || settings.kind === 'por_lado' || settings.kind === 'asistido')
  ) {
    const legacy = adviseLoad(ex, { reps_min: target.repsMin, reps_max: target.repsMax }, athlete, [], opts);
    if (legacy.kg !== null && legacy.basis === 'marca') {
      return {
        ...base,
        loadable: true,
        suggested: legacy.kg,
        basis: 'marca',
        reason: `Aún no hay registros tuyos de este ejercicio. ${formatLoad(legacy.kg, 'kg')} es una estimación a partir de la marca de fuerza que declaraste en tu perfil.`,
        nextGoal: progression.nextGoal,
        progression,
      };
    }
    if (legacy.kg !== null && athlete.bodyweightKg !== null) {
      return {
        ...base,
        loadable: true,
        suggested: null,
        basis: 'ninguna',
        reference: `Referencia orientativa para tu peso corporal y nivel: alrededor de ${formatLoad(legacy.kg, 'kg')}. No es un dato tuyo: úsala solo como punto de partida.`,
        reason: progression.reason,
        nextGoal: progression.nextGoal,
        progression,
      };
    }
  }
  return {
    ...base,
    loadable: true,
    suggested: null,
    basis: 'ninguna',
    reason: progression.reason,
    nextGoal: progression.nextGoal,
    progression,
  };
}
