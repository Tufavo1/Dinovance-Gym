/**
 * Unidades y tipos de carga. El principio es simple: la app guarda EXACTAMENTE lo que la persona
 * registra, en la unidad de su máquina. Solo kg y lb son convertibles entre sí; un "nivel" o una
 * "placa" no equivale a ningún peso y nunca se convierte.
 */

export type LoadUnit = 'kg' | 'lb' | 'nivel' | 'placas' | 'otro';
export type LoadKind = 'total' | 'por_lado' | 'corporal' | 'lastre' | 'asistido';

export interface LoadSettings {
  unit: LoadUnit;
  /** Nombre de la unidad cuando es "otro" (por ejemplo "muescas"). */
  unitLabel: string | null;
  kind: LoadKind;
  /** Salto mínimo disponible en el equipo. Null = la persona no lo definió. */
  minIncrement: number | null;
  /** Tope inferior y superior del equipo (por ejemplo niveles 1 a 8). */
  scaleMin: number | null;
  scaleMax: number | null;
  /** Carga inicial elegida por la persona. Null = sin definir. */
  startLoad: number | null;
  machineName: string | null;
}

export const DEFAULT_LOAD_SETTINGS: LoadSettings = {
  unit: 'kg',
  unitLabel: null,
  kind: 'total',
  minIncrement: null,
  scaleMin: null,
  scaleMax: null,
  startLoad: null,
  machineName: null,
};

export const LOAD_UNIT_OPTIONS: { value: LoadUnit; label: string }[] = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'lb', label: 'Libras (lb)' },
  { value: 'nivel', label: 'Niveles de resistencia' },
  { value: 'placas', label: 'Placas numeradas' },
  { value: 'otro', label: 'Otra unidad' },
];

export const LOAD_KIND_OPTIONS: { value: LoadKind; label: string; hint: string }[] = [
  { value: 'total', label: 'Carga total', hint: 'Lo que marca la máquina o el peso total de la barra.' },
  { value: 'por_lado', label: 'Por lado', hint: 'Peso de cada mancuerna o de cada lado.' },
  { value: 'corporal', label: 'Peso corporal', hint: 'Sin carga externa (dominadas, flexiones…).' },
  { value: 'lastre', label: 'Peso corporal + lastre', hint: 'Se registra el peso añadido.' },
  { value: 'asistido', label: 'Asistido (contrapeso)', hint: 'Se registra la asistencia: más asistencia = más fácil.' },
];

const KG_PER_LB = 0.45359237;

/** Solo las unidades con equivalencia real en kilos. */
export function isMass(unit: LoadUnit): boolean {
  return unit === 'kg' || unit === 'lb';
}

/** Kilos equivalentes, o null si la unidad no es una masa (niveles, placas, otra). */
export function toKg(value: number | null, unit: LoadUnit): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (unit === 'kg') return value;
  if (unit === 'lb') return Math.round(value * KG_PER_LB * 100) / 100;
  return null;
}

export function unitSuffix(unit: LoadUnit, label?: string | null): string {
  if (unit === 'kg' || unit === 'lb') return unit;
  if (unit === 'nivel') return 'nivel';
  if (unit === 'placas') return 'placa';
  return label?.trim() || 'unidad';
}

const fmtNumber = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** "12,5 kg", "Nivel 5", "Placa 7", "3 muescas". */
export function formatLoad(value: number | null, unit: LoadUnit, label?: string | null): string {
  if (value === null) return 'sin carga registrada';
  if (unit === 'nivel') return `nivel ${fmtNumber(value)}`;
  if (unit === 'placas') return `placa ${fmtNumber(value)}`;
  return `${fmtNumber(value)} ${unitSuffix(unit, label)}`;
}

/**
 * Lee lo que la persona escribió ("12,5", "17.5", " 8 "). Devuelve null si está vacío o no es un
 * número válido: nunca se "arregla" a un valor de una lista.
 */
export function parseLoad(text: string | number | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  if (typeof text === 'number') return Number.isFinite(text) && text >= 0 && text <= 2000 ? text : null;
  const clean = text.trim().replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return n <= 2000 ? n : null;
}

export interface Increment {
  step: number;
  /** true si el salto lo definió la persona; false si es el valor habitual del tipo de equipo. */
  configured: boolean;
}

/**
 * Salto de carga a usar. Manda lo que la persona configuró para su máquina. Si no lo definió:
 * niveles y placas van de 1 en 1; en kg/lb se usa el salto habitual (más pequeño en ejercicios
 * de aislamiento) y la recomendación avisa que es orientativo. En "otra unidad" no se supone nada.
 */
export function incrementFor(settings: LoadSettings, isolation: boolean): Increment | null {
  if (settings.minIncrement && settings.minIncrement > 0) return { step: settings.minIncrement, configured: true };
  switch (settings.unit) {
    case 'nivel':
    case 'placas':
      return { step: 1, configured: false };
    case 'kg':
      return { step: isolation || settings.kind === 'por_lado' ? 1 : 2.5, configured: false };
    case 'lb':
      return { step: isolation || settings.kind === 'por_lado' ? 2.5 : 5, configured: false };
    default:
      return null;
  }
}

/**
 * Siguiente carga realmente disponible en esa dirección, o null si no existe (tope de la máquina,
 * o unidad sin salto definido). Nunca devuelve un valor intermedio como "nivel 5,5".
 */
export function nextAvailableLoad(
  current: number,
  settings: LoadSettings,
  isolation: boolean,
  dir: 1 | -1,
): number | null {
  const inc = incrementFor(settings, isolation);
  if (!inc) return null;
  const next = Math.round((current + dir * inc.step) * 100) / 100;
  const min = settings.scaleMin ?? 0;
  if (next < min) return null;
  if (settings.scaleMax !== null && next > settings.scaleMax) return null;
  return next;
}

/** En cargas asistidas, MENOS asistencia es MÁS difícil. */
export function harderDirection(kind: LoadKind): 1 | -1 {
  return kind === 'asistido' ? -1 : 1;
}

/** ¿El valor existe en la escala configurada? (para avisar, no para bloquear el registro). */
export function fitsScale(value: number, settings: LoadSettings): boolean {
  if (settings.scaleMin !== null && value < settings.scaleMin) return false;
  if (settings.scaleMax !== null && value > settings.scaleMax) return false;
  return true;
}
