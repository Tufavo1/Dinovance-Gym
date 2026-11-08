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
