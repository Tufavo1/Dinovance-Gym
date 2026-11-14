/**
 * Exportación e importación de los datos propios en JSON y CSV.
 *
 * - JSON: respaldo completo que devuelve la función `export_my_data` de la base.
 * - CSV: una fila por serie registrada (formato plano, apto para hojas de cálculo y SQL).
 *
 * La importación solo admite entrenamientos. Cada uno lleva un `client_id`: importar dos veces el
 * mismo archivo no duplica nada. Las filas inválidas se rechazan con su motivo; nunca se corrigen.
 */

export const CSV_COLUMNS = [
  'workout_id',
  'started_at',
  'finished_at',
  'session_rpe',
  'readiness',
  'fatigue',
  'workout_notes',
  'exercise_id',
  'set_number',
  'reps',
  'load_value',
  'load_unit',
  'load_kind',
  'weight_kg',
  'rir',
  'rpe',
  'rest_s',
  'duration_s',
  'note',
] as const;

type Cell = string | number | boolean | null | undefined;

export interface ExportedSet {
  exercise_id: string;
  set_number: number;
  reps: number | null;
  load_value: number | null;
  load_unit: string;
  load_kind: string;
  weight_kg: number | null;
  rir: number | null;
  rpe: number | null;
  rest_s: number | null;
  duration_s: number | null;
  note: string | null;
}

export interface ExportedWorkout {
  id?: string;
  client_id?: string;
  started_at: string;
  finished_at: string | null;
  session_rpe: number | null;
  readiness?: number | null;
  fatigue?: number | null;
  notes: string | null;
  sets: ExportedSet[];
}

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Evita que una hoja de cálculo interprete el texto como fórmula.
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV con una fila por serie. Los entrenamientos sin series generan una fila con la serie vacía. */
export function workoutsToCsv(workouts: ExportedWorkout[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const w of workouts) {
    const head: Cell[] = [
      w.client_id ?? w.id ?? '',
      w.started_at,
      w.finished_at,
      w.session_rpe,
      w.readiness,
      w.fatigue,
      w.notes,
    ];
    const sets = w.sets.length ? w.sets : [null];
    for (const s of sets) {
      const tail: Cell[] = s
        ? [
            s.exercise_id,
            s.set_number,
            s.reps,
            s.load_value,
            s.load_unit,
            s.load_kind,
            s.weight_kg,
            s.rir,
            s.rpe,
            s.rest_s,
            s.duration_s,
            s.note,
          ]
        : Array.from({ length: 12 }, () => null);
      lines.push([...head, ...tail].map(csvCell).join(','));
    }
  }
  return lines.join('\r\n') + '\r\n';
}

/** Lee un CSV (RFC 4180: comillas dobles, saltos de línea dentro de comillas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

export interface ImportParse {
  workouts: ExportedWorkout[];
  /** Filas que no se pudieron leer, con su motivo. */
  errors: string[];
}

const UNITS = new Set(['kg', 'lb', 'nivel', 'placas', 'otro']);
const KINDS = new Set(['total', 'por_lado', 'corporal', 'lastre', 'asistido']);

function numberOrNull(raw: string, name: string, row: number, errors: string[]): number | null | undefined {
  const t = raw.trim().replace(/^'/, '');
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n)) {
    errors.push(`Fila ${row}: "${name}" no es un número (${raw}).`);
    return undefined;
  }
  return n;
}

/** Convierte el CSV de series en entrenamientos listos para `import_my_workouts`. */
export function csvToWorkouts(text: string): ImportParse {
  const errors: string[] = [];
  const rows = parseCsv(text);
  if (rows.length === 0) return { workouts: [], errors: ['El archivo está vacío.'] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = ['started_at', 'exercise_id', 'set_number', 'reps'].filter((c) => !header.includes(c));
  if (missing.length) return { workouts: [], errors: [`Faltan columnas obligatorias: ${missing.join(', ')}.`] };
  const col = (r: string[], name: string) => r[header.indexOf(name)] ?? '';

  const byKey = new Map<string, ExportedWorkout>();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const started = col(r, 'started_at').trim();
    if (!started || Number.isNaN(new Date(started).getTime())) {
      errors.push(`Fila ${line}: fecha de inicio no válida (${started || 'vacía'}).`);
      return;
    }
    const key = col(r, 'workout_id').trim() || started;
    let w = byKey.get(key);
    if (!w) {
      const rpe = numberOrNull(col(r, 'session_rpe'), 'session_rpe', line, errors);
      const readiness = numberOrNull(col(r, 'readiness'), 'readiness', line, errors);
      const fatigue = numberOrNull(col(r, 'fatigue'), 'fatigue', line, errors);
      if (rpe === undefined || readiness === undefined || fatigue === undefined) return;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(col(r, 'workout_id').trim());
      w = {
        ...(uuid ? { client_id: col(r, 'workout_id').trim() } : {}),
        started_at: new Date(started).toISOString(),
        finished_at: col(r, 'finished_at').trim() ? new Date(col(r, 'finished_at').trim()).toISOString() : null,
        session_rpe: rpe,
        readiness,
        fatigue,
        notes: col(r, 'workout_notes').replace(/^'/, '') || null,
        sets: [],
      };
      byKey.set(key, w);
    }
    const exercise = col(r, 'exercise_id').trim();
    if (!exercise) return; // entrenamiento sin series
    const n = (name: string) => numberOrNull(col(r, name), name, line, errors);
    const [setNumber, reps, load, kg, rir, rpe, rest, dur] = [
      'set_number',
      'reps',
      'load_value',
      'weight_kg',
      'rir',
      'rpe',
      'rest_s',
      'duration_s',
    ].map(n);
    if ([setNumber, reps, load, kg, rir, rpe, rest, dur].includes(undefined)) return;
    const unit = col(r, 'load_unit').trim() || 'kg';
    const kind = col(r, 'load_kind').trim() || 'total';
    if (!UNITS.has(unit) || !KINDS.has(kind)) {
      errors.push(`Fila ${line}: unidad o tipo de carga desconocido (${unit} / ${kind}).`);
      return;
    }
    if (!setNumber || setNumber < 1) {
      errors.push(`Fila ${line}: falta el número de serie.`);
      return;
    }
    w.sets.push({
      exercise_id: exercise,
      set_number: setNumber,
      reps: reps as number | null,
      // Si solo viene weight_kg (CSV antiguo), esa es la carga registrada en kg.
      load_value: (load ?? (unit === 'kg' ? kg : null)) as number | null,
      load_unit: unit,
      load_kind: kind,
      weight_kg: kg as number | null,
      rir: rir as number | null,
      rpe: rpe as number | null,
      rest_s: rest as number | null,
      duration_s: dur as number | null,
      note: col(r, 'note').replace(/^'/, '') || null,
    });
  });
  return { workouts: [...byKey.values()], errors };
}

/** Extrae los entrenamientos de un respaldo JSON de la app. */
export function jsonToWorkouts(text: string): ImportParse {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { workouts: [], errors: ['El archivo no es un JSON válido.'] };
  }
  const obj = data as { format?: string; workouts?: unknown };
  const list = Array.isArray(data)
    ? data
    : obj?.format === 'dinovance-gym' && Array.isArray(obj.workouts)
      ? obj.workouts
      : null;
  if (!list) return { workouts: [], errors: ['No es un respaldo de Dinovance Gym (falta la lista "workouts").'] };
  const errors: string[] = [];
  const workouts: ExportedWorkout[] = [];
  list.forEach((w: Partial<ExportedWorkout>, i: number) => {
    if (!w || typeof w.started_at !== 'string' || !Array.isArray(w.sets)) {
      errors.push(`Entrenamiento ${i + 1}: falta la fecha de inicio o la lista de series.`);
      return;
    }
    workouts.push(w as ExportedWorkout);
  });
  return { workouts, errors };
}
