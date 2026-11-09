import type { Exercise } from '../models';

/**
 * Nombres en español de los ejercicios que el generador elige con más frecuencia
 * (los básicos, los estiramientos curados y el cardio). Si un ejercicio no está aquí
 * se muestra su nombre original en inglés.
 */
const NAMES_ES: Record<string, string> = {
  // Piernas y glúteos
  'Barbell Squat': 'Sentadilla con barra',
  'Barbell Full Squat': 'Sentadilla profunda con barra',
  'Goblet Squat': 'Sentadilla goblet',
  'Dumbbell Squat': 'Sentadilla con mancuernas',
  'Bodyweight Squat': 'Sentadilla con peso corporal',
  'Smith Machine Squat': 'Sentadilla en máquina Smith',
  'Leg Press': 'Prensa de piernas',
  'Hack Squat': 'Sentadilla hack',
  'Barbell Lunge': 'Zancada con barra',
  'Dumbbell Lunges': 'Zancadas con mancuernas',
  'Dumbbell Step Ups': 'Subida al banco con mancuernas',
  'Split Squat with Dumbbells': 'Sentadilla búlgara con mancuernas',
  'Romanian Deadlift': 'Peso muerto rumano',
  'Stiff-Legged Dumbbell Deadlift': 'Peso muerto piernas rígidas con mancuernas',
  'Barbell Deadlift': 'Peso muerto con barra',
  'Leg Extensions': 'Extensión de cuádriceps en máquina',
  'Seated Leg Curl': 'Curl femoral sentado',
  'Lying Leg Curls': 'Curl femoral acostado',
  'Standing Calf Raises': 'Elevación de talones de pie',
  'Seated Calf Raise': 'Elevación de talones sentado',
  'Barbell Hip Thrust': 'Hip thrust',
  'Barbell Glute Bridge': 'Puente de glúteo con barra',
  'Butt Lift (Bridge)': 'Puente de glúteo',
  'Thigh Abductor': 'Máquina de abductores',
  'Thigh Adductor': 'Máquina de aductores',
  'Pull Through': 'Pull through en polea',
  // Pecho, hombro, tríceps
  'Barbell Bench Press - Medium Grip': 'Press de banca con barra',
  'Dumbbell Bench Press': 'Press de banca con mancuernas',
  'Barbell Incline Bench Press - Medium Grip': 'Press inclinado con barra',
  'Incline Dumbbell Press': 'Press inclinado con mancuernas',
  Pushups: 'Flexiones de brazos',
  'Push-Up Wide': 'Flexiones abiertas',
  'Incline Push-Up': 'Flexiones inclinadas',
  'Leverage Chest Press': 'Press de pecho en máquina',
  Butterfly: 'Aperturas en máquina (peck deck)',
  'Cable Crossover': 'Cruce de poleas',
  'Dumbbell Flyes': 'Aperturas con mancuernas',
  'Seated Dumbbell Press': 'Press de hombro sentado con mancuernas',
  'Standing Military Press': 'Press militar de pie',
  'Dumbbell Shoulder Press': 'Press de hombro con mancuernas',
  'Side Lateral Raise': 'Elevaciones laterales',
  'Cable Shoulder Press': 'Press de hombro en polea',
  'Leverage Shoulder Press': 'Press de hombro en máquina',
  'Machine Shoulder (Military) Press': 'Press militar en máquina',
  'Triceps Pushdown': 'Extensión de tríceps en polea',
  'Triceps Pushdown - Rope Attachment': 'Extensión de tríceps en polea con cuerda',
  'Dips - Triceps Version': 'Fondos en paralelas',
  'Bench Dips': 'Fondos en banco',
  'Cable Rope Overhead Triceps Extension': 'Extensión de tríceps sobre la cabeza en polea',
  'Close-Grip Barbell Bench Press': 'Press de banca agarre cerrado',
  'Face Pull': 'Face pull en polea',
  'Front Dumbbell Raise': 'Elevación frontal con mancuernas',
  // Espalda y bíceps
  Pullups: 'Dominadas',
  'Chin-Up': 'Dominadas supinas',
  'Band Assisted Pull-Up': 'Dominadas asistidas con banda',
  'Wide-Grip Lat Pulldown': 'Jalón al pecho agarre abierto',
  'Close-Grip Front Lat Pulldown': 'Jalón al pecho agarre cerrado',
  'Seated Cable Rows': 'Remo sentado en polea',
  'Bent Over Barbell Row': 'Remo inclinado con barra',
  'One-Arm Dumbbell Row': 'Remo con mancuerna a una mano',
  'Leverage Iso Row': 'Remo en máquina',
  'Leverage High Row': 'Remo alto en máquina',
  'Inverted Row': 'Remo invertido',
  'Straight-Arm Pulldown': 'Pullover en polea con brazos rectos',
  'Reverse Flyes': 'Aperturas invertidas con mancuernas',
  'Cable Rear Delt Fly': 'Deltoide posterior en polea',
  'Barbell Shrug': 'Encogimiento de hombros con barra',
  'Dumbbell Shrug': 'Encogimiento de hombros con mancuernas',
  'Barbell Curl': 'Curl de bíceps con barra',
  'Dumbbell Bicep Curl': 'Curl de bíceps con mancuernas',
  'Hammer Curls': 'Curl martillo',
  'Alternate Hammer Curl': 'Curl martillo alterno',
  'Preacher Curl': 'Curl predicador',
  'Standing Biceps Cable Curl': 'Curl de bíceps en polea',
  // Core
  Plank: 'Plancha',
  Crunches: 'Abdominales (crunch)',
  'Cable Crunch': 'Crunch en polea',
  'Reverse Crunch': 'Crunch inverso',
  'Flat Bench Lying Leg Raise': 'Elevación de piernas en banco',
  'Dead Bug': 'Dead bug',
  'Side Bridge': 'Plancha lateral',
  'Pallof Press': 'Press Pallof',
  'Air Bike': 'Abdominales bicicleta',
  'Russian Twist': 'Giro ruso',
  'Ab Crunch Machine': 'Máquina de abdominales',
  'Mountain Climbers': 'Escaladores',
  'Leg Lift': 'Elevación de pierna',
  'Flutter Kicks': 'Patadas alternas (flutter kicks)',
  'Middle Back Shrug': 'Encogimiento para espalda media',
  'Bodyweight Walking Lunge': 'Zancadas caminando',
  'Incline Push-Up Close-Grip': 'Flexiones inclinadas agarre cerrado',
  // Estiramientos (lista curada)
  'Hamstring Stretch': 'Estiramiento de isquiotibiales',
  'Seated Floor Hamstring Stretch': 'Estiramiento de isquiotibiales sentado',
  "Runner's Stretch": 'Estiramiento del corredor',
  'Calf Stretch Hands Against Wall': 'Estiramiento de pantorrilla en la pared',
  'Seated Calf Stretch': 'Estiramiento de pantorrilla sentado',
  'Cat Stretch': 'Estiramiento del gato',
  "Child's Pose": 'Postura del niño',
  'Hug Knees To Chest': 'Rodillas al pecho',
  'One Knee To Chest': 'Rodilla al pecho',
  'Knee Across The Body': 'Estiramiento de glúteo cruzado',
  'Kneeling Hip Flexor': 'Estiramiento de flexor de cadera',
  'Standing Hip Flexors': 'Flexor de cadera de pie',
  'On Your Side Quad Stretch': 'Estiramiento de cuádriceps de lado',
  'Side Lying Groin Stretch': 'Estiramiento de aductores',
  'Elbows Back': 'Estiramiento de pecho (codos atrás)',
  'One Arm Against Wall': 'Estiramiento de dorsal en la pared',
  'Chair Lower Back Stretch': 'Estiramiento de espalda en silla',
  'Middle Back Stretch': 'Estiramiento de espalda media',
  'Upper Back Stretch': 'Estiramiento de espalda alta',
  'Shoulder Stretch': 'Estiramiento de hombro',
  'Triceps Stretch': 'Estiramiento de tríceps',
  'Overhead Stretch': 'Estiramiento de brazos arriba',
  'Standing Lateral Stretch': 'Estiramiento lateral de pie',
  // Cardio
  'Walking, Treadmill': 'Caminata en trotadora con inclinación',
  'Jogging, Treadmill': 'Trote en trotadora',
  'Running, Treadmill': 'Carrera en trotadora',
  'Bicycling, Stationary': 'Bicicleta estática / spinning',
  'Recumbent Bike': 'Bicicleta reclinada',
  'Elliptical Trainer': 'Elíptica',
  Stairmaster: 'Escaladora',
  'Step Mill': 'Escaladora de peldaños',
  'Rowing, Stationary': 'Remo ergómetro',
  'Trail Running/Walking': 'Caminata o trote al aire libre',
};

/** Ejercicios con traducción conocida: el generador los prefiere. */
export const KNOWN_NAMES = new Set(Object.keys(NAMES_ES));

export function exerciseName(
  ex: Pick<Exercise, 'name'> & { name_es?: string | null; equipment?: string | null },
): string {
  return ex.name_es || NAMES_ES[ex.name] || translateName(ex.name, ex.equipment ?? null) || ex.name;
}

// ---------------------------------------------------------------------------
// Traducción automática de nombres que no están en la lista: arma la frase en orden castellano
// (movimiento + posición + agarre + equipo) y concuerda género y número. Si no reconoce el
// movimiento devuelve null y se muestra el nombre original.
// ---------------------------------------------------------------------------

type Gender = 'm' | 'f' | 'mp' | 'fp';

/** Movimiento principal (el orden importa: lo más específico primero). */
const MOVES: [RegExp, string, Gender, string?][] = [
  [/leg press/, 'Prensa de piernas', 'f', 'maquina'],
  [/bench press/, 'Press de banca', 'm'],
  [/chest press/, 'Press de pecho', 'm'],
  [/(shoulder|military|overhead) press|arnold press/, 'Press de hombro', 'm'],
  [/floor press/, 'Press en el suelo', 'm'],
  [/hip thrust/, 'Hip thrust', 'm'],
  [/crossover/, 'Cruce de poleas', 'm', 'polea'],
  [/reverse fly|reverse flye|rear delt fly/, 'Aperturas invertidas', 'fp'],
  [/rear delt/, 'Deltoide posterior', 'm'],
  [/fly|flye|butterfly/, 'Aperturas', 'fp'],
  [/face pull/, 'Face pull', 'm'],
  [/pulldown/, 'Jalón', 'm'],
  [/pullover/, 'Pullover', 'm'],
  [/upright row/, 'Remo al mentón', 'm'],
  [/row/, 'Remo', 'm'],
  [/shrug/, 'Encogimiento de hombros', 'm'],
  [/hammer curl/, 'Curl martillo', 'm'],
  [/preacher curl/, 'Curl predicador', 'm'],
  [/concentration curl/, 'Curl concentrado', 'm'],
  [/(leg|hamstring) curl/, 'Curl femoral', 'm', 'maquina'],
  [/wrist curl/, 'Curl de muñeca', 'm'],
  [/curl/, 'Curl de bíceps', 'm'],
  [/lateral raise/, 'Elevación lateral', 'f'],
  [/front raise/, 'Elevación frontal', 'f'],
  [/calf raise|calf press/, 'Elevación de talones', 'f'],
  [/leg raise|knee raise/, 'Elevación de piernas', 'f'],
  [/raise/, 'Elevación', 'f'],
  [/pushdown|push-down/, 'Extensión de tríceps en polea', 'f', 'polea'],
  [/kickback/, 'Patada de tríceps', 'f'],
  [/skull ?crusher|lying triceps extension|french press/, 'Press francés', 'm'],
  [/triceps? extension/, 'Extensión de tríceps', 'f'],
  [/leg extension/, 'Extensión de cuádriceps', 'f', 'maquina'],
  [/back extension|hyperextension/, 'Extensión lumbar', 'f'],
  [/split squat/, 'Sentadilla búlgara', 'f'],
  [/hack squat/, 'Sentadilla hack', 'f', 'maquina'],
  [/squat/, 'Sentadilla', 'f'],
  [/lunge/, 'Zancada', 'f'],
  [/step ?-?ups?/, 'Subida al banco', 'f'],
  [/romanian deadlift|rdl/, 'Peso muerto rumano', 'm'],
  [/stiff.?leg.*deadlift/, 'Peso muerto piernas rígidas', 'm'],
  [/deadlift/, 'Peso muerto', 'm'],
  [/good ?morning/, 'Buenos días (good morning)', 'm'],
  [/glute bridge|bridge/, 'Puente de glúteo', 'm'],
  [/abductor|abduction/, 'Abducción de cadera', 'f', 'maquina'],
  [/adductor|adduction/, 'Aducción de cadera', 'f', 'maquina'],
  [/\bpress\b/, 'Press', 'm'],
  [/crunch/, 'Crunch', 'm'],
  [/sit-?up/, 'Abdominales', 'mp'],
  [/plank/, 'Plancha', 'f'],
  [/russian twist|twist/, 'Giro de tronco', 'm'],
  [/woodchop/, 'Leñador', 'm'],
  [/push-?ups?/, 'Flexiones', 'fp'],
  [/chin-?ups?/, 'Dominadas supinas', 'fp'],
  [/pull-?ups?/, 'Dominadas', 'fp'],
  [/dips?\b/, 'Fondos', 'mp'],
];

/** Posición o variante: [patrón, adjetivo en masculino singular o frase invariable, ¿adjetivo?]. */
const MODS: [RegExp, string, boolean][] = [
  [/\bincline\b/, 'inclinado', true],
  [/\bdecline\b/, 'declinado', true],
  [/\bseated\b/, 'sentado', true],
  [/\blying\b|\bprone\b/, 'acostado', true],
  [/\bstanding\b/, 'de pie', false],
  [/bent[- ]over/, 'inclinado hacia adelante', true],
  [/\balternat(e|ing)\b/, 'alterno', true],
  [/one[- ]arm|single[- ]arm|one[- ]leg|single[- ]leg|unilateral/, 'a una mano', false],
  [/close[- ]grip|narrow/, 'agarre cerrado', false],
  [/wide[- ]grip/, 'agarre abierto', false],
  [/palms? in|neutral grip/, 'agarre neutro', false],
  [/reverse[- ]grip|underhand/, 'agarre supino', false],
  [/\breverse\b(?![- ]grip)/, 'inverso', true],
  [/\blow\b/, 'desde abajo', false],
  [/\bhigh\b/, 'desde arriba', false],
  [/\boverhead\b/, 'sobre la cabeza', false],
  [/\bfront\b/, 'frontal', false],
];

const EQUIP: [RegExp, string, string][] = [
  [/smith/, 'en máquina Smith', 'maquina'],
  [/leverage|machine/, 'en máquina', 'maquina'],
  [/cable/, 'en polea', 'polea'],
  [/dumbbell/, 'con mancuernas', 'mancuerna'],
  [/kettlebell/, 'con kettlebell', 'kettlebell'],
  [/e-?z|ez[- ]bar/, 'con barra Z', 'barra'],
  [/barbell|\bbar\b/, 'con barra', 'barra'],
  [/band/, 'con banda elástica', 'banda'],
];

const EQUIP_FIELD: Record<string, [string, string]> = {
  machine: ['en máquina', 'maquina'],
  cable: ['en polea', 'polea'],
  dumbbell: ['con mancuernas', 'mancuerna'],
  barbell: ['con barra', 'barra'],
  kettlebells: ['con kettlebell', 'kettlebell'],
  bands: ['con banda elástica', 'banda'],
  'e-z curl bar': ['con barra Z', 'barra'],
};

function agree(adj: string, g: Gender): string {
  // Solo el primer término es el adjetivo ("inclinado hacia adelante").
  const [word, ...rest] = adj.split(' ');
  if (!word.endsWith('o')) return adj;
  const stem = word.slice(0, -1);
  const out = g === 'f' ? stem + 'a' : g === 'mp' ? stem + 'os' : g === 'fp' ? stem + 'as' : word;
  return [out, ...rest].join(' ');
}

export function translateName(name: string, equipment: string | null): string | null {
  const n = name.toLowerCase();
  const move = MOVES.find(([re]) => re.test(n));
  if (!move) return null;
  const [, base, gender, implied] = move;

  const mods: string[] = [];
  for (const [re, text, isAdj] of MODS) {
    if (!re.test(n)) continue;
    // "Elevación frontal" / "Remo inclinado hacia adelante" ya incluyen la palabra.
    const key = text.split(' ')[0];
    if (key.length >= 4 && base.toLowerCase().includes(key.slice(0, 6))) continue;
    if (key === 'inverso' && /invert|inverso/i.test(base)) continue;
    if (text === 'frontal' && !/raise/.test(n)) continue;
    mods.push(isAdj ? agree(text, gender) : text);
  }

  let equip = EQUIP.find(([re]) => re.test(n));
  if (!equip && equipment && EQUIP_FIELD[equipment]) equip = [/./, ...EQUIP_FIELD[equipment]];
  const equipText = equip && equip[2] !== implied ? equip[1] : '';

  return [base, ...mods, equipText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
