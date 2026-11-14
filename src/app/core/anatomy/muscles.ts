/**
 * Anatomía muscular de la app: regiones, músculos y porciones, más los patrones de movimiento.
 *
 * Es la ÚNICA fuente de estos catálogos: de aquí se generan las tablas `muscles` y
 * `movement_patterns` (scripts/build-catalog-sql.mjs) y de aquí lee la interfaz los nombres.
 * Solo contiene anatomía descriptiva estándar (nombres de la Terminologia Anatomica en español).
 *
 * `volumeKey` es la clave gruesa con la que se cuenta el volumen semanal. Coincide con los músculos
 * del dataset free-exercise-db (chest, lats, adductors…) para que el historial anterior siga sirviendo.
 */

export type Region = 'tren_superior' | 'core' | 'tren_inferior';
export type MuscleLevel = 'grupo' | 'musculo' | 'porcion';

export interface Muscle {
  code: string;
  nameEs: string;
  nameEn: string;
  region: Region;
  level: MuscleLevel;
  parent: string | null;
  volumeKey: string;
}

const m = (
  code: string,
  nameEs: string,
  nameEn: string,
  region: Region,
  level: MuscleLevel,
  parent: string | null,
  volumeKey: string,
): Muscle => ({ code, nameEs, nameEn, region, level, parent, volumeKey });

export const MUSCLES: Muscle[] = [
  // ---------- Tren superior ----------
  m('pectoral_mayor', 'Pectoral mayor', 'Pectoralis major', 'tren_superior', 'musculo', null, 'chest'),
  m(
    'pectoral_clavicular',
    'Pectoral mayor · porción clavicular',
    'Pectoralis major, clavicular head',
    'tren_superior',
    'porcion',
    'pectoral_mayor',
    'chest',
  ),
  m(
    'pectoral_esternal',
    'Pectoral mayor · porción esternal',
    'Pectoralis major, sternal head',
    'tren_superior',
    'porcion',
    'pectoral_mayor',
    'chest',
  ),
  m(
    'pectoral_abdominal',
    'Pectoral mayor · porción abdominal',
    'Pectoralis major, abdominal part',
    'tren_superior',
    'porcion',
    'pectoral_mayor',
    'chest',
  ),

  m('deltoides', 'Deltoides', 'Deltoid', 'tren_superior', 'musculo', null, 'shoulders'),
  m(
    'deltoides_anterior',
    'Deltoides anterior',
    'Anterior deltoid',
    'tren_superior',
    'porcion',
    'deltoides',
    'shoulders',
  ),
  m('deltoides_lateral', 'Deltoides lateral', 'Lateral deltoid', 'tren_superior', 'porcion', 'deltoides', 'shoulders'),
  m(
    'deltoides_posterior',
    'Deltoides posterior',
    'Posterior deltoid',
    'tren_superior',
    'porcion',
    'deltoides',
    'shoulders',
  ),

  m('trapecio', 'Trapecio', 'Trapezius', 'tren_superior', 'musculo', null, 'traps'),
  m('trapecio_superior', 'Trapecio superior', 'Upper trapezius', 'tren_superior', 'porcion', 'trapecio', 'traps'),
  m('trapecio_medio', 'Trapecio medio', 'Middle trapezius', 'tren_superior', 'porcion', 'trapecio', 'middle back'),
  m('trapecio_inferior', 'Trapecio inferior', 'Lower trapezius', 'tren_superior', 'porcion', 'trapecio', 'middle back'),

  m('romboides', 'Romboides', 'Rhomboids', 'tren_superior', 'musculo', null, 'middle back'),
  m('dorsal_ancho', 'Dorsal ancho', 'Latissimus dorsi', 'tren_superior', 'musculo', null, 'lats'),
  m('redondo_mayor', 'Redondo mayor', 'Teres major', 'tren_superior', 'musculo', null, 'lats'),
  m('redondo_menor', 'Redondo menor', 'Teres minor', 'tren_superior', 'musculo', null, 'shoulders'),

  m('biceps_braquial', 'Bíceps braquial', 'Biceps brachii', 'tren_superior', 'musculo', null, 'biceps'),
  m('braquial', 'Braquial', 'Brachialis', 'tren_superior', 'musculo', null, 'biceps'),
  m('braquiorradial', 'Braquiorradial', 'Brachioradialis', 'tren_superior', 'musculo', null, 'forearms'),

  m('triceps', 'Tríceps braquial', 'Triceps brachii', 'tren_superior', 'musculo', null, 'triceps'),
  m(
    'triceps_cabeza_larga',
    'Tríceps · cabeza larga',
    'Triceps, long head',
    'tren_superior',
    'porcion',
    'triceps',
    'triceps',
  ),
  m(
    'triceps_cabeza_lateral',
    'Tríceps · cabeza lateral',
    'Triceps, lateral head',
    'tren_superior',
    'porcion',
    'triceps',
    'triceps',
  ),
  m(
    'triceps_cabeza_medial',
    'Tríceps · cabeza medial',
    'Triceps, medial head',
    'tren_superior',
    'porcion',
    'triceps',
    'triceps',
  ),

  m('antebrazo', 'Antebrazos y agarre', 'Forearms and grip', 'tren_superior', 'grupo', null, 'forearms'),
  m(
    'flexores_antebrazo',
    'Flexores de muñeca y dedos (agarre)',
    'Wrist and finger flexors',
    'tren_superior',
    'musculo',
    'antebrazo',
    'forearms',
  ),
  m(
    'extensores_antebrazo',
    'Extensores de muñeca',
    'Wrist extensors',
    'tren_superior',
    'musculo',
    'antebrazo',
    'forearms',
  ),

  m('cuello', 'Musculatura del cuello', 'Neck muscles', 'tren_superior', 'grupo', null, 'neck'),

  // ---------- Core ----------
  m('recto_abdominal', 'Recto abdominal', 'Rectus abdominis', 'core', 'musculo', null, 'abdominals'),
  m('oblicuo_externo', 'Oblicuo externo', 'External oblique', 'core', 'musculo', null, 'abdominals'),
  m('oblicuo_interno', 'Oblicuo interno', 'Internal oblique', 'core', 'musculo', null, 'abdominals'),
  m('transverso_abdominal', 'Transverso abdominal', 'Transversus abdominis', 'core', 'musculo', null, 'abdominals'),
  m('erectores_espinales', 'Erectores espinales', 'Erector spinae', 'core', 'musculo', null, 'lower back'),
  m('lumbar', 'Musculatura lumbar', 'Lumbar muscles', 'core', 'grupo', null, 'lower back'),
  m('cuadrado_lumbar', 'Cuadrado lumbar', 'Quadratus lumborum', 'core', 'musculo', 'lumbar', 'lower back'),
  m('multifidos', 'Multífidos', 'Multifidus', 'core', 'musculo', 'lumbar', 'lower back'),

  // ---------- Tren inferior ----------
  m('cuadriceps', 'Cuádriceps', 'Quadriceps femoris', 'tren_inferior', 'musculo', null, 'quadriceps'),
  m('recto_femoral', 'Recto femoral', 'Rectus femoris', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  m('vasto_lateral', 'Vasto lateral', 'Vastus lateralis', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  m('vasto_medial', 'Vasto medial', 'Vastus medialis', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  m(
    'vasto_intermedio',
    'Vasto intermedio',
    'Vastus intermedius',
    'tren_inferior',
    'porcion',
    'cuadriceps',
    'quadriceps',
  ),

  m('isquiotibiales', 'Isquiotibiales', 'Hamstrings', 'tren_inferior', 'grupo', null, 'hamstrings'),
  m('biceps_femoral', 'Bíceps femoral', 'Biceps femoris', 'tren_inferior', 'musculo', 'isquiotibiales', 'hamstrings'),
  m('semitendinoso', 'Semitendinoso', 'Semitendinosus', 'tren_inferior', 'musculo', 'isquiotibiales', 'hamstrings'),
  m('semimembranoso', 'Semimembranoso', 'Semimembranosus', 'tren_inferior', 'musculo', 'isquiotibiales', 'hamstrings'),

  m('gluteos', 'Glúteos', 'Gluteal muscles', 'tren_inferior', 'grupo', null, 'glutes'),
  m('gluteo_mayor', 'Glúteo mayor', 'Gluteus maximus', 'tren_inferior', 'musculo', 'gluteos', 'glutes'),
  m('gluteo_medio', 'Glúteo medio', 'Gluteus medius', 'tren_inferior', 'musculo', 'gluteos', 'abductors'),
  m('gluteo_menor', 'Glúteo menor', 'Gluteus minimus', 'tren_inferior', 'musculo', 'gluteos', 'abductors'),

  m('aductores', 'Aductores de cadera', 'Hip adductors', 'tren_inferior', 'grupo', null, 'adductors'),
  m('aductor_mayor', 'Aductor mayor', 'Adductor magnus', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  m('aductor_largo', 'Aductor largo', 'Adductor longus', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  m('aductor_corto', 'Aductor corto', 'Adductor brevis', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  m('gracil', 'Grácil', 'Gracilis', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  m('pectineo', 'Pectíneo', 'Pectineus', 'tren_inferior', 'musculo', 'aductores', 'adductors'),

  m('abductores_cadera', 'Abductores de cadera', 'Hip abductors', 'tren_inferior', 'grupo', null, 'abductors'),
  m(
    'tensor_fascia_lata',
    'Tensor de la fascia lata',
    'Tensor fasciae latae',
    'tren_inferior',
    'musculo',
    'abductores_cadera',
    'abductors',
  ),

  m('flexores_cadera', 'Flexores de cadera', 'Hip flexors', 'tren_inferior', 'grupo', null, 'hip flexors'),
  m('iliopsoas', 'Iliopsoas', 'Iliopsoas', 'tren_inferior', 'musculo', 'flexores_cadera', 'hip flexors'),

  m('gastrocnemio', 'Gastrocnemio', 'Gastrocnemius', 'tren_inferior', 'musculo', null, 'calves'),
  m('soleo', 'Sóleo', 'Soleus', 'tren_inferior', 'musculo', null, 'calves'),
  m('tibial_anterior', 'Tibial anterior', 'Tibialis anterior', 'tren_inferior', 'musculo', null, 'tibialis'),
  m('peroneos', 'Peroneos', 'Fibularis (peroneal) muscles', 'tren_inferior', 'musculo', null, 'peroneals'),
];

export const MUSCLE_BY_CODE = new Map(MUSCLES.map((x) => [x.code, x]));

/**
 * Músculo de la app que representa a cada músculo grueso del dataset. Se usa para rellenar
 * `exercise_muscles` con lo que el dataset sí dice (sin inventar porciones).
 */
export const DATASET_MUSCLE_CODE: Record<string, string> = {
  chest: 'pectoral_mayor',
  shoulders: 'deltoides',
  traps: 'trapecio',
  'middle back': 'romboides',
  lats: 'dorsal_ancho',
  biceps: 'biceps_braquial',
  triceps: 'triceps',
  forearms: 'antebrazo',
  neck: 'cuello',
  abdominals: 'recto_abdominal',
  'lower back': 'erectores_espinales',
  quadriceps: 'cuadriceps',
  hamstrings: 'isquiotibiales',
  glutes: 'gluteo_mayor',
  adductors: 'aductores',
  abductors: 'abductores_cadera',
  calves: 'gastrocnemio',
};

/** Nombre en español de cada clave de volumen (los 16 músculos del dataset más los nuevos). */
export const VOLUME_KEY_ES: Record<string, string> = {
  chest: 'Pecho',
  shoulders: 'Hombros',
  traps: 'Trapecio',
  'middle back': 'Espalda media',
  lats: 'Dorsales',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  neck: 'Cuello',
  abdominals: 'Abdomen',
  'lower back': 'Lumbar',
  quadriceps: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  adductors: 'Aductores',
  abductors: 'Abductores',
  calves: 'Pantorrillas',
  'hip flexors': 'Flexores de cadera',
  tibialis: 'Tibial anterior',
  peroneals: 'Peroneos',
};

export interface MovementPattern {
  code: string;
  nameEs: string;
  nameEn: string;
}

const p = (code: string, nameEs: string, nameEn: string): MovementPattern => ({ code, nameEs, nameEn });

export const MOVEMENT_PATTERNS: MovementPattern[] = [
  p('empuje_horizontal', 'Empuje horizontal', 'Horizontal push'),
  p('empuje_vertical', 'Empuje vertical', 'Vertical push'),
  p('traccion_horizontal', 'Tracción horizontal', 'Horizontal pull'),
  p('traccion_vertical', 'Tracción vertical', 'Vertical pull'),
  p('dominante_rodilla', 'Dominante de rodilla', 'Knee dominant'),
  p('dominante_cadera', 'Dominante de cadera', 'Hip dominant (hinge)'),
  p('flexion_rodilla', 'Flexión de rodilla', 'Knee flexion'),
  p('extension_rodilla', 'Extensión de rodilla', 'Knee extension'),
  p('extension_cadera', 'Extensión de cadera', 'Hip extension'),
  p('aduccion_cadera', 'Aducción de cadera', 'Hip adduction'),
  p('abduccion_cadera', 'Abducción de cadera', 'Hip abduction'),
  p('flexion_cadera', 'Flexión de cadera', 'Hip flexion'),
  p('flexion_plantar', 'Flexión plantar', 'Plantar flexion'),
  p('flexion_dorsal', 'Flexión dorsal', 'Dorsiflexion'),
  p('eversion_tobillo', 'Eversión de tobillo', 'Ankle eversion'),
  p('core_estabilidad', 'Estabilidad y trabajo de core', 'Core stability'),
  p('flexion_columna', 'Flexión de columna', 'Spinal flexion'),
  p('extension_columna', 'Extensión de columna', 'Spinal extension'),
  p('flexion_codo', 'Flexión de codo', 'Elbow flexion'),
  p('extension_codo', 'Extensión de codo', 'Elbow extension'),
  p('abduccion_hombro', 'Abducción de hombro', 'Shoulder abduction'),
  p('flexion_hombro', 'Flexión de hombro', 'Shoulder flexion'),
  p('aduccion_horizontal_hombro', 'Aducción horizontal de hombro', 'Shoulder horizontal adduction'),
  p('abduccion_horizontal_hombro', 'Abducción horizontal de hombro', 'Shoulder horizontal abduction'),
  p('extension_hombro', 'Extensión de hombro', 'Shoulder extension'),
  p('elevacion_escapular', 'Elevación escapular', 'Scapular elevation'),
  p('antebrazo_agarre', 'Antebrazo y agarre', 'Forearm and grip'),
];

export const PATTERN_BY_CODE = new Map(MOVEMENT_PATTERNS.map((x) => [x.code, x]));

export function muscleName(code: string): string {
  return MUSCLE_BY_CODE.get(code)?.nameEs ?? code;
}

export function patternName(code: string | null | undefined): string {
  return code ? (PATTERN_BY_CODE.get(code)?.nameEs ?? code) : 'Pendiente de revisión';
}

export function volumeKeyName(key: string): string {
  return VOLUME_KEY_ES[key] ?? key;
}
