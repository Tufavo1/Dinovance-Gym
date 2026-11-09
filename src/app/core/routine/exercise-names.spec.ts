import { exerciseName, translateName } from './exercise-names';

describe('nombres en español', () => {
  it('usa la traducción curada cuando existe', () => {
    expect(exerciseName({ name: 'Leg Press' })).toBe('Prensa de piernas');
  });

  it('traduce en orden castellano y con concordancia', () => {
    expect(translateName('Decline Smith Press', 'barbell')).toBe('Press declinado en máquina Smith');
    expect(translateName('Leverage Decline Chest Press', 'machine')).toBe('Press de pecho declinado en máquina');
    expect(translateName('Smith Machine Incline Bench Press', 'machine')).toBe(
      'Press de banca inclinado en máquina Smith',
    );
    expect(translateName('Low Cable Crossover', 'cable')).toBe('Cruce de poleas desde abajo');
    expect(translateName('Single-Arm Cable Crossover', 'cable')).toBe('Cruce de poleas a una mano');
    expect(translateName('Incline Dumbbell Flyes', 'dumbbell')).toBe('Aperturas inclinadas con mancuernas');
    expect(translateName('Seated Side Lateral Raise', 'dumbbell')).toBe('Elevación lateral sentada con mancuernas');
    expect(translateName('Bent Over Two-Dumbbell Row With Palms In', 'dumbbell')).toBe(
      'Remo inclinado hacia adelante agarre neutro con mancuernas',
    );
    expect(translateName('Standing Cable Chest Press', 'cable')).toBe('Press de pecho de pie en polea');
    expect(translateName('Calf Press', 'machine')).toBe('Elevación de talones en máquina');
    expect(translateName('Decline Reverse Crunch', 'body only')).toBe('Crunch declinado inverso');
    expect(translateName('Reverse Flyes', 'dumbbell')).toBe('Aperturas invertidas con mancuernas');
  });

  it('si no reconoce el movimiento, no inventa', () => {
    expect(translateName('Atlas Stones', 'other')).toBeNull();
    expect(exerciseName({ name: 'Atlas Stones' })).toBe('Atlas Stones');
  });
});
