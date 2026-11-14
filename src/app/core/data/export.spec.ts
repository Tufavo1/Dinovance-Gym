import { csvCell, csvToWorkouts, jsonToWorkouts, parseCsv, workoutsToCsv, type ExportedWorkout } from './export';

const WORKOUT: ExportedWorkout = {
  client_id: '7d2f0a52-1111-4222-8333-444455556666',
  started_at: '2026-03-02T21:00:00.000Z',
  finished_at: '2026-03-02T22:00:00.000Z',
  session_rpe: 7,
  readiness: 4,
  fatigue: 2,
  notes: 'Bien, "sin" dolor',
  sets: [
    {
      exercise_id: 'Thigh_Adductor',
      set_number: 1,
      reps: 15,
      load_value: 5,
      load_unit: 'nivel',
      load_kind: 'total',
      weight_kg: null,
      rir: 2,
      rpe: 8,
      rest_s: 75,
      duration_s: 40,
      note: null,
    },
    {
      exercise_id: 'Leg_Press',
      set_number: 1,
      reps: 10,
      load_value: 82.5,
      load_unit: 'kg',
      load_kind: 'total',
      weight_kg: 82.5,
      rir: 2,
      rpe: 8,
      rest_s: 120,
      duration_s: 45,
      note: 'pies altos, anchos',
    },
  ],
};

describe('exportar e importar', () => {
  it('escapa comillas, comas y fórmulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('di "hola"')).toBe('"di ""hola"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(null)).toBe('');
  });

  it('CSV de ida y vuelta conserva cargas en su unidad (un nivel no se vuelve kilos)', () => {
    const csv = workoutsToCsv([WORKOUT]);
    expect(parseCsv(csv)).toHaveLength(3);
    const back = csvToWorkouts(csv);
    expect(back.errors).toEqual([]);
    expect(back.workouts).toHaveLength(1);
    const w = back.workouts[0];
    expect(w.client_id).toBe(WORKOUT.client_id);
    expect(w.notes).toBe('Bien, "sin" dolor');
    expect(w.sets[0]).toMatchObject({
      exercise_id: 'Thigh_Adductor',
      load_value: 5,
      load_unit: 'nivel',
      weight_kg: null,
    });
    expect(w.sets[1]).toMatchObject({ load_value: 82.5, load_unit: 'kg', weight_kg: 82.5, note: 'pies altos, anchos' });
  });

  it('rechaza filas inválidas con su motivo, sin corregirlas', () => {
    const csv = [
      'started_at,exercise_id,set_number,reps,load_value,load_unit',
      '2026-03-02T21:00:00Z,Leg_Press,1,diez,80,kg',
      'no-es-fecha,Leg_Press,1,10,80,kg',
      '2026-03-02T21:00:00Z,Leg_Press,2,10,80,arrobas',
      '2026-03-02T21:00:00Z,Leg_Press,3,10,"82,5",kg',
    ].join('\n');
    const r = csvToWorkouts(csv);
    expect(r.errors).toHaveLength(3);
    expect(r.errors[0]).toContain('"reps" no es un número');
    expect(r.workouts[0].sets).toHaveLength(1);
    expect(r.workouts[0].sets[0].load_value).toBe(82.5);
  });

  it('exige las columnas mínimas', () => {
    expect(csvToWorkouts('fecha,ejercicio\n1,2').errors[0]).toContain('Faltan columnas obligatorias');
    expect(csvToWorkouts('').errors[0]).toBe('El archivo está vacío.');
  });

  it('lee el respaldo JSON de la app y rechaza otros formatos', () => {
    const ok = jsonToWorkouts(JSON.stringify({ format: 'dinovance-gym', version: 1, workouts: [WORKOUT] }));
    expect(ok.workouts).toHaveLength(1);
    expect(jsonToWorkouts('{"algo": 1}').errors[0]).toContain('No es un respaldo');
    expect(jsonToWorkouts('{').errors[0]).toContain('JSON válido');
    expect(jsonToWorkouts(JSON.stringify([{ started_at: '2026-01-01' }])).errors[0]).toContain('Entrenamiento 1');
  });
});
