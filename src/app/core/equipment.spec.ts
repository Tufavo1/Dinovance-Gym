import { gearCounts, requiredGear } from './equipment';
import type { Exercise } from './models';

const ex = (name: string, equipment: string | null, category = 'strength'): Exercise =>
  ({ id: name, name, equipment, category, primary_muscles: [], secondary_muscles: [] }) as unknown as Exercise;

describe('implementos extra del dataset', () => {
  it('un ejercicio con cadenas exige el implemento "cadenas"', () => {
    expect(requiredGear(ex('Bench Press with Chains', 'other'))).toEqual(expect.arrayContaining(['cadenas']));
  });

  it('un implemento "other" desconocido sigue descartado', () => {
    expect(requiredGear(ex('Mystery Machine Thing', 'other'))).toBeNull();
  });

  it('cuenta cuántos ejercicios desbloquea cada implemento', () => {
    const c = gearCounts([
      ex('Box Squat', 'barbell'),
      ex('Box Jump', 'body only', 'plyometrics'),
      ex('Curl', 'dumbbell'),
    ]);
    expect(c.get('cajon')).toBe(2);
    expect(c.get('mancuernas')).toBe(1);
  });
});
