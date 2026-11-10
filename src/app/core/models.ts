export interface Option {
  value: string;
  label: string;
  hint?: string;
}

export const GENDER_OPTIONS: Option[] = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decirlo' },
];

export const COUNTRY_OPTIONS: string[] = [
  'Chile',
  'Argentina',
  'Bolivia',
  'Brasil',
  'Colombia',
  'Ecuador',
  'España',
  'Estados Unidos',
  'México',
  'Paraguay',
  'Perú',
  'Uruguay',
  'Venezuela',
  'Otro',
];

export const EXPERIENCE_OPTIONS: Option[] = [
  { value: 'nunca', label: 'Nunca he entrenado' },
  { value: 'principiante', label: 'Principiante (menos de 6 meses)' },
  { value: 'intermedio', label: 'Intermedio (6 meses a 2 años)' },
  { value: 'avanzado', label: 'Avanzado (más de 2 años)' },
];

export const GOAL_OPTIONS: Option[] = [
  {
    value: 'perder_grasa',
    label: 'Perder grasa / bajar de peso',
    hint: 'Rutina con más repeticiones, menos descanso y cardio.',
  },
  {
    value: 'ganar_musculo',
    label: 'Ganar masa muscular',
    hint: 'Aumentar el tamaño de tus músculos.',
  },
  {
    value: 'fuerza',
    label: 'Ganar fuerza',
    hint: 'Levantar más peso, con pocas repeticiones y más descanso.',
  },
  {
    value: 'tonificar',
    label: 'Tonificar y definir',
    hint: 'Músculo firme y marcado, sin buscar mucho volumen.',
  },
  {
    value: 'resistencia',
    label: 'Mejorar resistencia / cardio',
    hint: 'Aguantar más tiempo y mejorar tu condición física.',
  },
  {
    value: 'postura',
    label: 'Mejorar postura y espalda',
    hint: 'Refuerza espalda y abdomen, con estiramientos extra.',
  },
  {
    value: 'movilidad',
    label: 'Ganar movilidad y flexibilidad',
    hint: 'Más estiramientos y rango de movimiento.',
  },
  {
    value: 'deporte',
    label: 'Rendir mejor en un deporte',
    hint: 'Preparación física con trabajo explosivo (si tu salud lo permite).',
  },
  {
    value: 'retomar',
    label: 'Retomar el ejercicio tras una pausa o lesión',
    hint: 'Vuelta gradual con ejercicios básicos y cargas bajas.',
  },
  {
    value: 'salud_general',
    label: 'Salud y bienestar general',
    hint: 'Mantenerte activo/a y sentirte bien.',
  },
];

/** Zonas a las que se les da más trabajo en la rutina. */
export const FOCUS_OPTIONS: Option[] = [
  { value: 'pecho', label: 'Pecho' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'hombros', label: 'Hombros' },
  { value: 'brazos', label: 'Brazos (bíceps y tríceps)' },
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'piernas', label: 'Piernas' },
];

export interface StrengthMark {
  kg?: number;
  reps: number;
}
export type StrengthMarks = Record<string, StrengthMark>;

/** Levantamientos base para pedir una marca (PR) y calcular el RM estimado. */
export const STRENGTH_LIFTS: { value: string; label: string; bodyweight?: boolean }[] = [
  { value: 'sentadilla', label: 'Sentadilla' },
  { value: 'press_pecho', label: 'Press de banca' },
  { value: 'bisagra', label: 'Peso muerto' },
  { value: 'press_hombro', label: 'Press militar (sobre la cabeza)' },
  { value: 'remo', label: 'Remo con barra o mancuerna' },
  { value: 'dominadas', label: 'Dominadas (sin ayuda)', bodyweight: true },
  { value: 'flexiones', label: 'Flexiones de pecho', bodyweight: true },
];

/** Grupos para elegir cuántas veces por semana quiere entrenarlos. */
export const FREQUENCY_GROUPS: Option[] = [
  { value: 'pecho', label: 'Pecho' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'hombros', label: 'Hombros' },
  { value: 'brazos', label: 'Brazos' },
  { value: 'piernas', label: 'Piernas' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'abdomen', label: 'Abdomen' },
];

export const PLACE_OPTIONS: Option[] = [
  { value: 'smartfit', label: 'Smart Fit' },
  { value: 'otro_gimnasio', label: 'Otro gimnasio' },
  { value: 'plaza', label: 'Plaza o parque' },
  { value: 'casa', label: 'Mi casa' },
];

export const SPORT_OPTIONS: Option[] = [
  { value: 'futbol', label: 'Fútbol' },
  { value: 'running', label: 'Running' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'natacion', label: 'Natación' },
  { value: 'calistenia', label: 'Calistenia' },
  { value: 'yoga', label: 'Yoga / movilidad' },
  { value: 'basquetbol', label: 'Básquetbol' },
  { value: 'padel_tenis', label: 'Pádel / Tenis' },
  { value: 'boxeo', label: 'Boxeo / artes marciales' },
];

// Modalidad de entrenamiento: define qué tipo de ejercicios y estructura tendrá la rutina.
export const STYLE_OPTIONS: Option[] = [
  {
    value: 'no_se',
    label: 'No sé, recomiéndenme',
    hint: 'Te armaremos una rutina de musculación básica para partir.',
  },
  {
    value: 'musculacion',
    label: 'Musculación',
    hint: 'Entrenamiento con pesas y máquinas de gimnasio, general.',
  },
  {
    value: 'hipertrofia',
    label: 'Hipertrofia',
    hint: 'Enfocado en aumentar el tamaño muscular (más series y repeticiones).',
  },
  {
    value: 'fuerza',
    label: 'Fuerza máxima / Powerlifting',
    hint: 'Pocas repeticiones con cargas altas: sentadilla, press banca, peso muerto.',
  },
  {
    value: 'halterofilia',
    label: 'Halterofilia',
    hint: 'Levantamiento olímpico: arranque y envión. Requiere buena técnica.',
  },
  {
    value: 'gimnasia',
    label: 'Gimnasia / Calistenia',
    hint: 'Peso corporal: dominadas, fondos, flexiones, ideal para plazas.',
  },
  {
    value: 'funcional',
    label: 'Funcional / CrossFit',
    hint: 'Movimientos variados y de alta intensidad.',
  },
  {
    value: 'cardio',
    label: 'Cardio / Resistencia',
    hint: 'Mejorar tu condición física y quemar calorías.',
  },
  {
    value: 'movilidad',
    label: 'Movilidad / Yoga / Estiramiento',
    hint: 'Flexibilidad, postura y recuperación.',
  },
  { value: 'otro', label: 'Otro' },
];

export const LAST_TRAINED_OPTIONS: Option[] = [
  { value: 'actualmente', label: 'Entreno actualmente' },
  { value: 'menos_1_mes', label: 'Paré hace menos de 1 mes' },
  { value: 'entre_1_y_6_meses', label: 'Paré hace 1 a 6 meses' },
  { value: 'mas_6_meses', label: 'Paré hace más de 6 meses' },
  { value: 'nunca', label: 'Nunca he entrenado' },
];

export const PAST_ACTIVITY_OPTIONS: Option[] = [
  { value: 'gimnasio', label: 'Pesas / gimnasio' },
  { value: 'calistenia', label: 'Calistenia' },
  { value: 'crossfit', label: 'Funcional / CrossFit' },
  { value: 'running', label: 'Running' },
  { value: 'futbol', label: 'Fútbol' },
  { value: 'otros_deportes', label: 'Otros deportes' },
  { value: 'clases', label: 'Clases grupales / baile / yoga' },
  { value: 'ninguna', label: 'Ninguna' },
];

export const ACTIVITY_LEVEL_OPTIONS: Option[] = [
  { value: 'sedentario', label: 'Sedentario', hint: 'Casi todo el día sentado/a.' },
  { value: 'ligero', label: 'Poco activo', hint: 'Caminas algo, trabajo mayormente sentado/a.' },
  { value: 'activo', label: 'Activo', hint: 'Estás de pie o caminando buena parte del día.' },
  { value: 'muy_activo', label: 'Muy activo', hint: 'Trabajo físico o mucho movimiento diario.' },
];

export const SLEEP_OPTIONS: Option[] = [
  { value: 'menos_5', label: 'Menos de 5 horas' },
  { value: 'entre_5_y_6', label: '5 a 6 horas' },
  { value: 'entre_7_y_8', label: '7 a 8 horas' },
  { value: 'mas_8', label: 'Más de 8 horas' },
];

export const PREGNANCY_OPTIONS: Option[] = [
  { value: 'no', label: 'No' },
  { value: 'embarazada', label: 'Estoy embarazada' },
  { value: 'posparto', label: 'Tuve un bebé hace menos de 12 meses' },
];

/** Cómo prefiere entrenar: decide volumen (series), cercanía al fallo y descansos. */
export const APPROACH_OPTIONS: Option[] = [
  {
    value: 'equilibrado',
    label: 'Equilibrado (recomendado)',
    hint: 'Volumen moderado, 2 veces por semana cada músculo, series cerca del fallo (Schoenfeld, Helms, Israetel).',
  },
  {
    value: 'alta_intensidad',
    label: 'Alta intensidad, pocas series',
    hint: 'Pocas series muy duras y más descanso entre sesiones (estilo Mentzer / Heavy Duty). Solo con algo de experiencia.',
  },
  {
    value: 'alto_volumen',
    label: 'Alto volumen',
    hint: 'Más series por semana y sesiones largas. Requiere buen descanso, sueño y comida.',
  },
];

export const NUTRITION_OPTIONS: Option[] = [
  {
    value: 'deficit',
    label: 'Estoy bajando de peso (déficit)',
    hint: 'Mantenemos la intensidad y cuidamos el volumen.',
  },
  { value: 'mantenimiento', label: 'Mantengo mi peso' },
  { value: 'superavit', label: 'Estoy comiendo para ganar peso (superávit)', hint: 'Tu cuerpo tolera más volumen.' },
  { value: 'no_se', label: 'No lo sé / no llevo control' },
];

export const STRESS_OPTIONS: Option[] = [
  { value: 'bajo', label: 'Bajo', hint: 'Vida tranquila, buena recuperación.' },
  { value: 'medio', label: 'Medio', hint: 'Trabajo o estudios exigentes, pero manejable.' },
  { value: 'alto', label: 'Alto', hint: 'Estrés constante, poco descanso mental.' },
];

export const DAYS_OPTIONS: Option[] = [2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n} días por semana`,
}));

export const MINUTES_OPTIONS: Option[] = [30, 45, 60, 75, 90].map((n) => ({
  value: String(n),
  label: `${n} minutos`,
}));

// Deben coincidir con los códigos de la tabla public.body_areas
export const BODY_AREA_OPTIONS: Option[] = [
  { value: 'cuello', label: 'Cuello' },
  { value: 'hombro', label: 'Hombro' },
  { value: 'codo', label: 'Codo' },
  { value: 'muneca', label: 'Muñeca' },
  { value: 'pecho', label: 'Pecho' },
  { value: 'espalda_alta', label: 'Espalda alta' },
  { value: 'espalda_baja', label: 'Espalda baja / lumbar' },
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'cadera', label: 'Cadera' },
  { value: 'rodilla', label: 'Rodilla' },
  { value: 'tobillo', label: 'Tobillo' },
];

export const INJURY_KIND_OPTIONS: Option[] = [
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'lesion', label: 'Lesión' },
  { value: 'dolor_cronico', label: 'Dolor crónico' },
  { value: 'condicion', label: 'Condición (hernia, escoliosis, etc.)' },
];

export const INJURY_STATUS_OPTIONS: Option[] = [
  { value: 'activa', label: 'Sigue activa / en recuperación' },
  { value: 'recuperada', label: 'Ya estoy recuperado/a' },
];

export function labelOf(options: Option[], value: string | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? value ?? '';
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  country: string | null;
}

export interface HealthProfile {
  user_id: string;
  experience: string | null;
  days_per_week: number | null;
  session_minutes: number | null;
  places: string[];
  goal: string | null;
  secondary_goals: string[];
  focus_areas: string[];
  goal_detail: string | null;
  sports: string[];
  training_styles: string[];
  training_styles_other: string | null;
  place_equipment: Record<string, string[]>;
  last_trained: string | null;
  past_activities: string[];
  activity_level: string | null;
  sleep_hours: string | null;
  pregnancy_status: string;
  training_approach?: string | null;
  nutrition_phase?: string | null;
  stress_level?: string | null;
  /** Mejores marcas: kg y repeticiones de levantamientos base, o repeticiones máximas con el peso corporal. */
  strength_marks?: StrengthMarks | null;
  /** Veces por semana que quiere entrenar cada grupo muscular (1 a 4). */
  muscle_frequency?: Record<string, number> | null;
  has_medical_condition: boolean;
  medical_notes: string | null;
  consent_health_data: boolean;
  consent_at: string | null;
}

export interface InjuryRecord {
  id: string;
  body_area: string;
  kind: string;
  year: number | null;
  status: string;
  description: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  name_es?: string | null;
  category: string | null;
  level: string | null;
  force_type: string | null;
  mechanic: string | null;
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  images: string[];
}

export interface AreaMuscle {
  area: string;
  muscle: string;
  risk: 'alto' | 'medio';
}

export interface ExerciseContraindication {
  exercise_id: string;
  body_area: string;
  severity: 'evitar' | 'precaucion';
}

export interface InjuryDraft {
  body_area: string;
  kind: string;
  year: number | null;
  status: string;
  description: string;
}

export type HealthInput = Omit<HealthProfile, 'user_id' | 'consent_at'>;
