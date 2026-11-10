/**
 * Reglas y tablas del generador de rutinas. Todo lo "configurable" vive aquí para que el
 * generador sea solo lógica. Las reglas de salud son conservadoras y NO reemplazan a un
 * profesional.
 */

export const LEVEL_RANK: Record<string, number> = {
  nunca: 0,
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

/** Categorías del dataset que corresponden a cada modalidad. */
export const STYLE_CATS: Record<string, string[]> = {
  no_se: ['strength'],
  musculacion: ['strength'],
  hipertrofia: ['strength'],
  fuerza: ['powerlifting', 'strength'],
  halterofilia: ['olympic weightlifting', 'strength'],
  gimnasia: ['strength'],
  funcional: ['strength', 'plyometrics'],
  cardio: ['cardio', 'strength'],
  movilidad: ['stretching'],
  otro: ['strength'],
};

/**
 * Ejercicios básicos y conocidos (nombres exactos del dataset). Tienen prioridad al elegir,
 * para que la rutina esté hecha de lo fundamental y no de variantes raras.
 */
export const STAPLES = new Set([
  'Barbell Squat',
  'Barbell Full Squat',
  'Goblet Squat',
  'Dumbbell Squat',
  'Bodyweight Squat',
  'Smith Machine Squat',
  'Leg Press',
  'Hack Squat',
  'Barbell Lunge',
  'Dumbbell Lunges',
  'Dumbbell Step Ups',
  'Split Squat with Dumbbells',
  'Romanian Deadlift',
  'Stiff-Legged Dumbbell Deadlift',
  'Barbell Deadlift',
  'Leg Extensions',
  'Seated Leg Curl',
  'Lying Leg Curls',
  'Standing Calf Raises',
  'Seated Calf Raise',
  'Barbell Hip Thrust',
  'Barbell Glute Bridge',
  'Butt Lift (Bridge)',
  'Thigh Abductor',
  'Thigh Adductor',
  'Barbell Bench Press - Medium Grip',
  'Dumbbell Bench Press',
  'Barbell Incline Bench Press - Medium Grip',
  'Incline Dumbbell Press',
  'Pushups',
  'Push-Up Wide',
  'Leverage Chest Press',
  'Butterfly',
  'Cable Crossover',
  'Dumbbell Flyes',
  'Seated Dumbbell Press',
  'Standing Military Press',
  'Dumbbell Shoulder Press',
  'Side Lateral Raise',
  'Cable Shoulder Press',
  'Leverage Shoulder Press',
  'Machine Shoulder (Military) Press',
  'Triceps Pushdown',
  'Triceps Pushdown - Rope Attachment',
  'Dips - Triceps Version',
  'Bench Dips',
  'Cable Rope Overhead Triceps Extension',
  'Close-Grip Barbell Bench Press',
  'Face Pull',
  'Front Dumbbell Raise',
  'Pullups',
  'Chin-Up',
  'Wide-Grip Lat Pulldown',
  'Close-Grip Front Lat Pulldown',
  'Seated Cable Rows',
  'Bent Over Barbell Row',
  'One-Arm Dumbbell Row',
  'Leverage Iso Row',
  'Leverage High Row',
  'Inverted Row',
  'Straight-Arm Pulldown',
  'Reverse Flyes',
  'Cable Rear Delt Fly',
  'Barbell Shrug',
  'Dumbbell Shrug',
  'Barbell Curl',
  'Dumbbell Bicep Curl',
  'Hammer Curls',
  'Alternate Hammer Curl',
  'Preacher Curl',
  'Standing Biceps Cable Curl',
  'Plank',
  'Crunches',
  'Cable Crunch',
  'Reverse Crunch',
  'Flat Bench Lying Leg Raise',
  'Dead Bug',
  'Side Bridge',
  'Pallof Press',
  'Air Bike',
  'Russian Twist',
  'Ab Crunch Machine',
  'Mountain Climbers',
]);

/** Estiramientos de vuelta a la calma: estáticos, sencillos y sin implementos. */
export const COOLDOWN_STRETCHES = new Set([
  'Hamstring Stretch',
  'Seated Floor Hamstring Stretch',
  "Runner's Stretch",
  'Calf Stretch Hands Against Wall',
  'Seated Calf Stretch',
  'Cat Stretch',
  "Child's Pose",
  'Hug Knees To Chest',
  'One Knee To Chest',
  'Knee Across The Body',
  'Kneeling Hip Flexor',
  'Standing Hip Flexors',
  'On Your Side Quad Stretch',
  'Side Lying Groin Stretch',
  'Elbows Back',
  'One Arm Against Wall',
  'Chair Lower Back Stretch',
  'Middle Back Stretch',
  'Upper Back Stretch',
  'Shoulder Stretch',
  'Triceps Stretch',
  'Overhead Stretch',
  'Standing Lateral Stretch',
]);

/** Cardio preferido según el lugar: máquinas en el gimnasio, caminata/trote al aire libre. */
export const GYM_CARDIO = [
  'Walking, Treadmill',
  'Stairmaster',
  'Bicycling, Stationary',
  'Elliptical Trainer',
  'Recumbent Bike',
  'Step Mill',
  'Jogging, Treadmill',
];
export const OUTDOOR_CARDIO = ['Trail Running/Walking'];
/** Cardio de bajo impacto (para lesiones de rodilla/tobillo, embarazo o edad). */
export const LOW_IMPACT_CARDIO = new Set([
  'Walking, Treadmill',
  'Bicycling, Stationary',
  'Recumbent Bike',
  'Elliptical Trainer',
]);

/**
 * Ejercicios que el dataset clasifica como fuerza pero que no sirven en una rutina guiada:
 * requieren compañero, toallas o son variantes poco claras.
 */
export const NOT_FOR_ROUTINE = /manual|partner|towel|body tricep press|with a partner|isometric/i;

/** Categorías que se evitan con condición médica, embarazo o edad avanzada. */
export const HIGH_RISK_CATS = new Set(['plyometrics', 'olympic weightlifting', 'powerlifting', 'strongman']);

/** Categorías que se bloquean por zona lesionada. */
export const AREA_BLOCKED_CATS: Record<string, string[]> = {
  espalda_baja: ['olympic weightlifting', 'powerlifting', 'strongman'],
  rodilla: ['plyometrics', 'olympic weightlifting', 'strongman'],
  tobillo: ['plyometrics', 'olympic weightlifting', 'strongman'],
  cadera: ['plyometrics', 'olympic weightlifting', 'strongman'],
  hombro: ['olympic weightlifting', 'strongman'],
  muneca: ['olympic weightlifting', 'strongman'],
  codo: ['strongman'],
  cuello: ['olympic weightlifting', 'strongman'],
};

/** Movimientos que cargan la zona, más allá del músculo principal. */
export const AREA_NAME_RULES: Record<string, RegExp> = {
  hombro:
    /overhead|behind the neck|snatch|jerk|military|arnold|upright row|push press|handstand|\bdips?\b|plank|push-?up/i,
  espalda_baja:
    /deadlift|good morning|bent over|bent-over|t-bar|long bar|hyperextension|back extension|clean|snatch|superman|stiff|romanian|sit-up|situp|barbell.*(row|lunge|squat)|walking lunge|hip thrust|glute bridge/i,
  rodilla:
    /squat|lunge|jump|leg extension|leg press|hack|step-up|step ups|sprint|pistol|box|hop|jogging|running|stairmaster|step mill/i,
  cadera: /squat|lunge|deadlift|hip|jump|sprint|abduct|adduct|good morning/i,
  tobillo: /jump|sprint|calf|hop|skip|run|jog|box|lunge|stairmaster|step mill/i,
  muneca: /push-up|pushup|handstand|clean|snatch|wrist|plank|front squat/i,
  codo: /skull|french|extension|\bdips?\b|chin|close-grip|preacher/i,
  cuello: /neck|shrug|behind the neck|bridge|headstand/i,
  abdomen: /sit-up|situp|crunch|plank|leg raise|twist|woodchop/i,
};

/** Embarazo: sin ejercicios boca arriba/abajo, impacto, torsión ni presión abdominal. */
export const PREGNANCY_AVOID =
  /crunch|sit-up|situp|leg raise|twist|plank|jump|hop|sprint|running|jogging|bench press|prone|lying|superman|bridge|hip thrust|woodchop|mountain|burpee|push-up|pushup|dead bug|air bike|bicycle|inchworm|locust|lower back curl|cobra|olympic|snatch|clean|jerk|deadlift/i;
/** Posparto: se evita la presión abdominal fuerte hasta que un profesional lo autorice. */
export const POSTPARTUM_AVOID =
  /crunch|sit-up|situp|leg raise|twist|plank|woodchop|mountain|burpee|jump|hop|running|jogging/i;

/**
 * Patrón de movimiento de un ejercicio. En un mismo día no se repite el patrón, así se evita
 * hacer, por ejemplo, "curl martillo" y "curl martillo alterno" seguidos. El orden importa.
 */
const PATTERNS: [RegExp, string][] = [
  [/shrug/i, 'encogimiento'],
  [/leg curl/i, 'curl_femoral'],
  [/hammer/i, 'curl_martillo'],
  [/preacher/i, 'curl_predicador'],
  [/curl/i, 'curl'],
  [/calf/i, 'pantorrilla'],
  [/leg press/i, 'prensa'],
  [/lunge|split squat|step ?ups?/i, 'zancada'],
  [/squat|hack/i, 'sentadilla'],
  [/deadlift|good morning/i, 'bisagra'],
  [/hip thrust|glute bridge|butt lift|pull through/i, 'puente_gluteo'],
  [/leg extension/i, 'extension_cuadriceps'],
  [/abductor/i, 'abductor'],
  [/adductor/i, 'aductor'],
  [/incline.*(press|push)/i, 'press_inclinado'],
  [/bench press|chest press|push-?up/i, 'press_pecho'],
  [/fly|flye|butterfly|crossover/i, 'aperturas'],
  [/rear delt|reverse fly|face pull/i, 'deltoide_posterior'],
  [/lateral raise/i, 'elevacion_lateral'],
  [/front.*raise/i, 'elevacion_frontal'],
  [/shoulder press|military|overhead press/i, 'press_hombro'],
  [/pulldown/i, 'jalon'],
  [/pull-?up|chin-?up/i, 'dominada'],
  [/row/i, 'remo'],
  [/pushdown/i, 'pushdown'],
  [/dip/i, 'fondos'],
  [/triceps|tricep/i, 'extension_triceps'],
  [/crunch/i, 'crunch'],
  [/plank|bridge/i, 'plancha'],
  [/leg raise/i, 'elevacion_piernas'],
];

export function patternOf(name: string, fallback: string): string {
  for (const [re, key] of PATTERNS) if (re.test(name)) return key;
  return fallback;
}

/** Plantillas de día: músculos en orden de prioridad (lo primero nunca se recorta). */
export type Slot = string[];
export const TEMPLATES: Record<string, { name: string; force?: 'push' | 'pull'; slots: Slot[] }> = {
  FULL_A: {
    name: 'Cuerpo completo A',
    slots: [
      ['quadriceps'],
      ['chest'],
      ['lats'],
      ['hamstrings', 'glutes'],
      ['shoulders'],
      ['abdominals'],
      ['biceps'],
      ['triceps'],
      ['calves'],
    ],
  },
  FULL_B: {
    name: 'Cuerpo completo B',
    slots: [
      ['hamstrings', 'glutes'],
      ['shoulders'],
      ['middle back', 'lats'],
      ['quadriceps'],
      ['chest'],
      ['abdominals'],
      ['triceps'],
      ['biceps'],
      ['calves'],
    ],
  },
  PUSH: {
    name: 'Empuje (pecho, hombro, tríceps)',
    force: 'push',
    slots: [
      ['chest'],
      ['shoulders'],
      ['chest'],
      ['triceps'],
      ['shoulders'],
      ['triceps'],
      ['abdominals'],
      ['chest'],
      ['shoulders'],
    ],
  },
  PULL: {
    name: 'Tirón (espalda, bíceps)',
    force: 'pull',
    slots: [
      ['lats'],
      ['middle back'],
      ['lats'],
      ['biceps'],
      ['shoulders'],
      ['biceps'],
      ['abdominals'],
      ['traps'],
      ['forearms'],
    ],
  },
  LEGS: {
    name: 'Piernas y glúteos',
    slots: [
      ['quadriceps'],
      ['hamstrings'],
      ['glutes'],
      ['quadriceps'],
      ['calves'],
      ['abductors', 'adductors'],
      ['abdominals'],
      ['hamstrings'],
      ['glutes'],
    ],
  },
  UPPER: {
    name: 'Tren superior',
    slots: [
      ['chest'],
      ['lats'],
      ['shoulders'],
      ['middle back'],
      ['biceps'],
      ['triceps'],
      ['chest', 'shoulders'],
      ['abdominals'],
      ['lats'],
    ],
  },
  LOWER: {
    name: 'Tren inferior',
    slots: [
      ['quadriceps'],
      ['hamstrings'],
      ['glutes'],
      ['calves'],
      ['quadriceps'],
      ['abdominals'],
      ['abductors', 'adductors'],
      ['hamstrings'],
      ['glutes'],
    ],
  },
};

/** Músculos que se trabajan extra cuando la persona pide priorizar una zona. */
export const FOCUS_SLOTS: Record<string, string[]> = {
  pecho: ['chest'],
  espalda: ['lats', 'middle back'],
  hombros: ['shoulders'],
  brazos: ['biceps', 'triceps'],
  abdomen: ['abdominals'],
  gluteos: ['glutes'],
  piernas: ['quadriceps', 'hamstrings'],
};

/**
 * Distribución semanal según días disponibles, nivel y, si la persona la pidió, la frecuencia
 * deseada por músculo (`freq`: veces por semana de los grupos grandes, 2 a 4).
 */
export function splitFor(days: number, rank: number, freq: number | null = null): string[] {
  const high = freq !== null && freq >= 2.5;
  switch (days) {
    case 2:
      return ['FULL_A', 'FULL_B'];
    case 3:
      // Cada músculo 2 veces por semana o más (Schoenfeld 2016): cuerpo completo, también con experiencia.
      return ['FULL_A', 'FULL_B', 'FULL_A'];
    case 4:
      return high ? ['UPPER', 'LOWER', 'FULL_A', 'FULL_B'] : ['UPPER', 'LOWER', 'UPPER', 'LOWER'];
    case 5:
      return rank === 0 || high
        ? ['UPPER', 'LOWER', 'FULL_A', 'UPPER', 'LOWER']
        : ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER'];
    default:
      return high
        ? ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER', 'FULL_A']
        : ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS'];
  }
}

export const MUSCLE_ES: Record<string, string> = {
  quadriceps: 'cuádriceps',
  hamstrings: 'isquiotibiales',
  glutes: 'glúteos',
  calves: 'pantorrillas',
  chest: 'pecho',
  lats: 'dorsales',
  'middle back': 'espalda media',
  shoulders: 'hombros',
  biceps: 'bíceps',
  triceps: 'tríceps',
  forearms: 'antebrazos',
  abdominals: 'abdomen',
  traps: 'trapecios',
  abductors: 'abductores',
  adductors: 'aductores',
  'lower back': 'lumbar',
};

/** Patrones de los ejercicios base, que conviene poner al inicio de la sesión. */
export const MAIN_LIFTS = new Set([
  'sentadilla',
  'prensa',
  'bisagra',
  'press_pecho',
  'press_inclinado',
  'press_hombro',
  'jalon',
  'dominada',
  'remo',
  'puente_gluteo',
]);

/** Músculos secundarios: si no hay ejercicio para ellos no se avisa como "faltante". */
export const MINOR_MUSCLES = new Set(['forearms', 'traps', 'abductors', 'adductors', 'calves']);
