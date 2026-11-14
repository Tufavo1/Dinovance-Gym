import {
  DEFAULT_LOAD_SETTINGS,
  formatLoad,
  nextAvailableLoad,
  parseLoad,
  toKg,
  type LoadSettings,
  type LoadUnit,
} from './load-units';
import { recommendProgression, type ExerciseSession, type ProgressionTarget } from './progression';

const TARGET: ProgressionTarget = { sets: 3, repsMin: 8, repsMax: 12, rirMin: 2, rirMax: 3 };

let n = 0;
/** Una sesión: misma carga en todas las series, con las repeticiones y el RIR dados. */
function session(
  load: number | null,
  reps: number[],
  rir: (number | null)[] | number | null = 2,
  unit: LoadUnit = 'kg',
): ExerciseSession {
  n++;
  return {
    workoutId: `w${n}`,
    date: new Date(2026, 0, n * 7).toISOString(),
    unit,
    sets: reps.map((r, i) => ({ reps: r, load, rir: Array.isArray(rir) ? rir[i] : rir })),
  };
}

const advise = (
  sessions: ExerciseSession[],
  settings: Partial<LoadSettings> = {},
  isolation = false,
  target = TARGET,
) => recommendProgression({ target, settings: { ...DEFAULT_LOAD_SETTINGS, ...settings }, isolation, sessions });

describe('cargas flexibles', () => {
  it('acepta cualquier peso escrito a mano, con coma o punto', () => {
    expect(parseLoad('12,5')).toBe(12.5);
    expect(parseLoad('17.5')).toBe(17.5);
    expect(parseLoad(' 7 ')).toBe(7);
    expect(parseLoad('22,5')).toBe(22.5);
    expect(parseLoad('')).toBeNull();
    expect(parseLoad('abc')).toBeNull();
    expect(parseLoad('-5')).toBeNull();
  });

  it('solo kg y lb tienen equivalencia en kilos: un nivel nunca se convierte', () => {
    expect(toKg(20, 'kg')).toBe(20);
    expect(toKg(45, 'lb')).toBe(20.41);
    expect(toKg(5, 'nivel')).toBeNull();
    expect(toKg(7, 'placas')).toBeNull();
    expect(formatLoad(5, 'nivel')).toBe('nivel 5');
    expect(formatLoad(12.5, 'kg')).toBe('12,5 kg');
    expect(formatLoad(3, 'otro', 'muescas')).toBe('3 muescas');
  });

  it('el siguiente salto es uno que existe en el equipo', () => {
    const levels: LoadSettings = { ...DEFAULT_LOAD_SETTINGS, unit: 'nivel', scaleMin: 1, scaleMax: 8 };
    expect(nextAvailableLoad(5, levels, true, 1)).toBe(6);
    expect(nextAvailableLoad(8, levels, true, 1)).toBeNull();
    expect(nextAvailableLoad(1, levels, true, -1)).toBeNull();
    const custom: LoadSettings = { ...DEFAULT_LOAD_SETTINGS, minIncrement: 5 };
    expect(nextAvailableLoad(20, custom, false, 1)).toBe(25);
    expect(nextAvailableLoad(20, { ...DEFAULT_LOAD_SETTINGS, unit: 'otro' }, false, 1)).toBeNull();
  });
});

describe('progresión de cargas (doble progresión)', () => {
  it('escenario del press de banca: 30 kg, 3 × 8-12, RIR 2', () => {
    const w1 = session(30, [10, 9, 8]);
    const w2 = session(30, [11, 10, 9]);
    const w3 = session(30, [12, 12, 11]);
    const w4 = session(30, [12, 12, 12]);

    // Semanas 1 a 3: dentro del rango, se mantiene la carga y se suman repeticiones.
    for (const upTo of [[w1], [w1, w2], [w1, w2, w3]]) {
      const a = advise(upTo);
      expect(a.action).toBe('progresar_reps');
      expect(a.suggestedLoad).toBe(30);
    }
    // Semana 4: todas las series en 12 con el RIR objetivo -> sube un escalón pequeño.
    const a4 = advise([w1, w2, w3, w4]);
    expect(a4.action).toBe('subir');
    expect(a4.suggestedLoad).toBe(32.5);
    expect(a4.reason).toContain('12, 12, 12');
    expect(a4.evidence.rule).toBe('tope_del_rango_con_margen');
  });

  it('no sube solo porque pasaron semanas', () => {
    const same = [session(30, [10, 9, 8]), session(30, [10, 9, 8]), session(30, [10, 9, 8]), session(30, [10, 9, 8])];
    const a = advise(same);
    expect(a.action).toBe('mantener');
    expect(a.suggestedLoad).toBe(30);
    expect(a.flags).toContain('estancamiento');
  });

  it('en el tope pero al límite (RIR 0) no sube', () => {
    const a = advise([session(30, [12, 12, 12], [1, 0, 0])]);
    expect(a.action).toBe('mantener');
    expect(a.evidence.rule).toBe('tope_sin_margen');
  });

  it('sin RIR registrado no asume que quedó margen', () => {
    const a = advise([session(30, [12, 12, 12], null)]);
    expect(a.action).toBe('mantener');
    expect(a.flags).toContain('sin_rir');
  });

  it('si no completa el mínimo mantiene; si se repite, propone bajar', () => {
    const one = advise([session(40, [8, 7, 6])]);
    expect(one.action).toBe('mantener');
    expect(one.suggestedLoad).toBe(40);
    const two = advise([session(40, [8, 7, 6]), session(40, [8, 6, 6])]);
    expect(two.action).toBe('bajar');
    expect(two.suggestedLoad).toBe(37.5);
  });

  it('detecta caída de rendimiento y no propone subir', () => {
    const a = advise([session(30, [12, 12, 11]), session(30, [10, 10, 9])]);
    expect(a.flags).toContain('caida_rendimiento');
    expect(a.action).toBe('progresar_reps');
  });

  it('aislamiento: escalón más pequeño que un compuesto', () => {
    const s = [session(10, [15, 15, 15], 2), session(10, [15, 15, 15], 2)];
    const t = { ...TARGET, repsMin: 10, repsMax: 15 };
    expect(advise(s, {}, true, t).suggestedLoad).toBe(11);
    expect(advise(s, {}, false, t).suggestedLoad).toBe(12.5);
  });

  it('respeta el salto mínimo configurado de la máquina', () => {
    const s = [session(20, [12, 12, 12]), session(20, [12, 12, 12])];
    const a = advise(s, { minIncrement: 5 });
    expect(a.action).toBe('subir');
    expect(a.suggestedLoad).toBe(25);
    expect(a.evidence.rule).toBe('tope_confirmado_dos_sesiones');
  });

  it('salto grande: pide confirmar una sesión más antes de subir', () => {
    const a = advise([session(20, [12, 12, 12])], { minIncrement: 5 });
    expect(a.action).toBe('progresar_reps');
    expect(a.flags).toContain('salto_grande');
    expect(a.suggestedLoad).toBe(20);
    expect(a.reason).toContain('25 %');
  });

  it('sin registros no inventa una carga', () => {
    const none = advise([]);
    expect(none.action).toBe('sin_datos');
    expect(none.suggestedLoad).toBeNull();
    const withStart = advise([], { startLoad: 17.5 });
    expect(withStart.suggestedLoad).toBe(17.5);
    expect(withStart.reason).toContain('17,5 kg');
  });

  it('usa la carga de trabajo, no la serie de aproximación', () => {
    const s: ExerciseSession = {
      workoutId: 'x',
      date: '2026-03-01',
      unit: 'kg',
      sets: [
        { reps: 12, load: 20, rir: 5 },
        { reps: 12, load: 30, rir: 2 },
        { reps: 12, load: 30, rir: 2 },
        { reps: 12, load: 30, rir: 2 },
      ],
    };
    expect(advise([s]).currentLoad).toBe(30);
  });
});

describe('máquinas con niveles', () => {
  const levels = { unit: 'nivel' as const, scaleMin: 1, scaleMax: 8 };
  const t = { ...TARGET, repsMin: 10, repsMax: 15 };

  it('nunca recomienda un nivel intermedio: del 5 pasa al 6, y solo tras confirmarlo', () => {
    const first = advise([session(5, [15, 15, 15], 2, 'nivel')], levels, true, t);
    expect(first.action).toBe('progresar_reps');
    expect(first.suggestedLoad).toBe(5);
    expect(first.flags).toContain('salto_grande');

    const second = advise(
      [session(5, [15, 15, 15], 2, 'nivel'), session(5, [15, 15, 15], 2, 'nivel')],
      levels,
      true,
      t,
    );
    expect(second.action).toBe('subir');
    expect(second.suggestedLoad).toBe(6);
    expect(second.unit).toBe('nivel');
    expect(second.reason).toContain('nivel 6');
    expect(second.reason).not.toContain('kg');
  });

  it('en el último nivel progresa con repeticiones o tempo', () => {
    const s = [session(8, [15, 15, 15], 2, 'nivel'), session(8, [15, 15, 15], 2, 'nivel')];
    const a = advise(s, levels, true, t);
    expect(a.action).toBe('progresar_reps');
    expect(a.flags).toContain('tope_de_escala');
    expect(a.suggestedLoad).toBe(8);
  });

  it('no mezcla sesiones en kg con sesiones en niveles', () => {
    const a = advise([session(40, [15, 15, 15], 2, 'kg'), session(5, [12, 11, 10], 2, 'nivel')], levels, true, t);
    expect(a.flags).toContain('unidades_distintas');
    expect(a.unit).toBe('nivel');
    expect(a.currentLoad).toBe(5);
    expect(a.evidence.sessions).toHaveLength(1);
  });

  it('dominadas asistidas: progresar es quitar asistencia', () => {
    const s = [session(40, [10, 10, 10], 2), session(40, [10, 10, 10], 2)];
    const a = advise(s, { kind: 'asistido', minIncrement: 5 }, false, { ...TARGET, repsMin: 6, repsMax: 10 });
    expect(a.action).toBe('subir');
    expect(a.suggestedLoad).toBe(35);
    expect(a.reason).toContain('bajar la asistencia');
  });
});
