import type { Exercise } from '../models';
import { adviseLoad } from './load-advisor';
import { assessStrength, markE1rm, planFrequency, sanitizeFrequency, sanitizeMarks } from './benchmarks';
import { splitFor } from '../routine/rules';

describe('marcas de fuerza', () => {
  it('estima el RM con pocas repeticiones y lo descarta con muchas', () => {
    expect(markE1rm({ kg: 100, reps: 1 })).toBeCloseTo(100, 0);
    expect(markE1rm({ kg: 100, reps: 5 })).toBeGreaterThan(110);
    expect(markE1rm({ kg: 40, reps: 20 })).toBeNull();
  });

  it('limpia datos inválidos o fuera de rango', () => {
    const m = sanitizeMarks(
      { sentadilla: { kg: 9999, reps: 5 }, press_pecho: { kg: 80, reps: 5 }, hack: { kg: 1, reps: 1 } },
      ['sentadilla', 'press_pecho'],
    );
    expect(Object.keys(m)).toEqual(['press_pecho']);
  });

  it('deduce el nivel según el peso corporal', () => {
    // 70 kg: sentadilla 140 x 1 = 2,0 × peso (avanzado); press 40 x 5 ≈ 0,66 × (intermedio)
    const a = assessStrength({ sentadilla: { kg: 140, reps: 1 } }, 70, 'masculino');
    expect(a?.rank).toBe(2);
    const b = assessStrength({ sentadilla: { kg: 40, reps: 5 } }, 70, 'masculino');
    expect(b?.rank).toBe(0);
    expect(assessStrength({}, 70, null)).toBeNull();
  });
});

describe('frecuencia por grupo', () => {
  it('acepta solo 1 a 4 en grupos conocidos', () => {
    expect(sanitizeFrequency({ pecho: 3, espalda: 9, otro: 2 })).toEqual({ pecho: 3 });
  });

  it('sube 1 vez a 2 salvo en dosis mínima', () => {
    expect(planFrequency({ pecho: 1 }, false)).toEqual({ target: { pecho: 2 }, raised: ['pecho'] });
    expect(planFrequency({ pecho: 1 }, true).target['pecho']).toBe(1);
  });

  it('una frecuencia alta cambia la distribución de 4 días', () => {
    expect(splitFor(4, 1, null)).toEqual(['UPPER', 'LOWER', 'UPPER', 'LOWER']);
    expect(splitFor(4, 1, 3)).toContain('FULL_A');
  });
});

describe('cargas con marcas propias', () => {
  const squat = {
    id: 's',
    name: 'Barbell Squat',
    equipment: 'barbell',
    category: 'strength',
    primary_muscles: ['quadriceps'],
    secondary_muscles: [],
  } as unknown as Exercise;
  const athlete = { bodyweightKg: 80, gender: 'masculino', rank: 1, beginner: false, senior: false, cautious: false };
  const target = { reps_min: 6, reps_max: 10 };

  it('parte de lo que la persona ya levanta', () => {
    const base = adviseLoad(squat, target, athlete, []);
    const mine = adviseLoad(squat, target, { ...athlete, marks: { sentadilla: { kg: 160, reps: 3 } } }, []);
    expect(mine.kg!).toBeGreaterThan(base.kg!);
    expect(mine.reason).toContain('marca');
  });

  it('ignora marcas con demasiadas repeticiones', () => {
    const base = adviseLoad(squat, target, athlete, []);
    const mine = adviseLoad(squat, target, { ...athlete, marks: { sentadilla: { kg: 160, reps: 20 } } }, []);
    expect(mine.kg).toBe(base.kg);
  });
});
