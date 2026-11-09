import { clock, exerciseTimes, secondsBetween } from './session-time';

describe('tiempos de la sesión', () => {
  it('suma trabajo y descanso por ejercicio, en orden', () => {
    const t = exerciseTimes([
      { exercise_id: 'a', duration_s: 40, rest_s: 0 },
      { exercise_id: 'a', duration_s: 35, rest_s: 90 },
      { exercise_id: 'b', duration_s: 30, rest_s: 120 },
      { exercise_id: 'a', duration_s: 38, rest_s: 95 },
    ]);
    expect(t.map((x) => x.exercise_id)).toEqual(['a', 'b']);
    expect(t[0]).toEqual({ exercise_id: 'a', sets: 3, workS: 113, restS: 185, totalS: 298 });
  });

  it('acota los segundos y formatea el cronómetro', () => {
    expect(secondsBetween(null, 5000)).toBe(0);
    expect(secondsBetween(1000, 61_000)).toBe(60);
    expect(secondsBetween(0, 10_000_000)).toBe(3600);
    expect(clock(5)).toBe('0:05');
    expect(clock(125)).toBe('2:05');
    expect(clock(3725)).toBe('1:02:05');
  });
});
