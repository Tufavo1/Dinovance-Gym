import type { Exercise, Option } from './models';

export interface GearOption extends Option {
  group: string;
}

/** Equipamiento que la persona puede tener disponible en un lugar. */
export const GEAR_OPTIONS: GearOption[] = [
  { value: 'barra', label: 'Barra olímpica y discos', group: 'Pesas libres' },
  { value: 'mancuernas', label: 'Mancuernas', group: 'Pesas libres' },
  { value: 'barra_ez', label: 'Barra EZ (curl)', group: 'Pesas libres' },
  { value: 'kettlebells', label: 'Kettlebells (pesas rusas)', group: 'Pesas libres' },
  { value: 'banco', label: 'Banco (plano o inclinable)', group: 'Pesas libres' },
  { value: 'rack', label: 'Rack o jaula de sentadillas', group: 'Pesas libres' },
  { value: 'plataforma', label: 'Plataforma de halterofilia y discos bumper', group: 'Pesas libres' },
  { value: 'smith', label: 'Máquina Smith', group: 'Máquinas y cardio' },
  { value: 'poleas', label: 'Poleas / cables', group: 'Máquinas y cardio' },
  {
    value: 'maquinas',
    label: 'Máquinas guiadas (prensa, jalón, extensión, etc.)',
    group: 'Máquinas y cardio',
  },
  {
    value: 'cardio',
    label: 'Máquinas de cardio (trotadora, bicicleta, elíptica)',
    group: 'Máquinas y cardio',
  },
  { value: 'barra_dominadas', label: 'Barra de dominadas', group: 'Calistenia' },
  { value: 'paralelas', label: 'Paralelas / barras de fondos', group: 'Calistenia' },
  { value: 'bandas', label: 'Bandas elásticas', group: 'Accesorios' },
  { value: 'pelota', label: 'Pelota de pilates (fitball)', group: 'Accesorios' },
  { value: 'balon_medicinal', label: 'Balón medicinal', group: 'Accesorios' },
  { value: 'foam_roller', label: 'Rodillo de espuma', group: 'Accesorios' },
];

export const GEAR_GROUPS = ['Pesas libres', 'Máquinas y cardio', 'Calistenia', 'Accesorios'].map(
  (name) => ({ name, items: GEAR_OPTIONS.filter((g) => g.group === name) }),
);

/**
 * Equipo marcado de partida por lugar. Smart Fit informa en sus sedes: zona de peso libre
 * (mancuernas, barras, discos, bancos y racks), peso integrado (máquinas guiadas), poleas,
 * máquina Smith (según sede) y cardio. NO se asume plataforma de halterofilia, kettlebells
 * ni accesorios, porque no están confirmados. Cada persona ajusta según su sede.
 */
const GYM_PRESET = ['barra', 'mancuernas', 'banco', 'rack', 'smith', 'poleas', 'maquinas', 'cardio'];

export const PLACE_PRESETS: Record<string, string[]> = {
  smartfit: GYM_PRESET,
  otro_gimnasio: GYM_PRESET,
  plaza: [],
  casa: [],
};

export const CALISTHENICS_GEAR = ['barra_dominadas', 'paralelas', 'bandas'];

/**
 * Equipo que exige un ejercicio del dataset. Devuelve null si no se puede saber
 * (equipo "other": trineos, piedras Atlas, etc.), y ese ejercicio no se recomienda.
 * El dataset solo trae categorías gruesas, así que se afina por el nombre.
 */
/**
 * Movimientos que necesitan implementos que ni siquiera ofrecemos marcar (cadenas, cajones,
 * trineos, piedras, barras especiales, etc.). Se descartan para no recomendar algo inviable.
 */
const EXOTIC =
  /chains?\b|\bboxes?\b|\bpins?\b|bosu|balance board|axle|atlas|\blog\b|yoke|\btires?\b|\bsled|rickshaw|zercher|trap bar|safety bar|farmer|jammer|car driver|speed |wheel|iron cross|with a twist|suspended|\bcar\b|stones?\b|hanging bar|kneeling squat/;

export function requiredGear(ex: Exercise): string[] | null {
  const name = ex.name.toLowerCase();
  if (EXOTIC.test(name)) return null;
  const need = new Set<string>();

  switch (ex.equipment) {
    case 'barbell':
      need.add('barra');
      break;
    case 'dumbbell':
      need.add('mancuernas');
      break;
    case 'cable':
      need.add('poleas');
      break;
    case 'machine':
      need.add(ex.category === 'cardio' ? 'cardio' : 'maquinas');
      break;
    case 'kettlebells':
      need.add('kettlebells');
      break;
    case 'bands':
      need.add('bandas');
      break;
    case 'e-z curl bar':
      need.add('barra_ez');
      break;
    case 'exercise ball':
      need.add('pelota');
      break;
    case 'medicine ball':
      need.add('balon_medicinal');
      break;
    case 'foam roll':
      need.add('foam_roller');
      break;
    case 'body only':
    case null:
    case '':
      break;
    default:
      // "other" y valores desconocidos: solo se aceptan los estiramientos (en el suelo).
      if (ex.category !== 'stretching') return null;
  }

  if (/\bbands?\b/.test(name)) need.add('bandas');
  if (/inverted row/.test(name)) need.add('barra_dominadas');

  const isSmith = name.includes('smith');
  if (isSmith) {
    need.delete('maquinas');
    need.delete('barra');
    need.add('smith');
  }

  const weighted = ex.equipment === 'barbell' || ex.equipment === 'dumbbell' || isSmith;
  if (weighted && /bench|incline|decline/.test(name) && !/bench dip|bench jump|bench sprint/.test(name)) {
    need.add('banco');
  }

  if (ex.equipment === 'barbell' && /squat/.test(name) && !/goblet|split/.test(name)) {
    need.add('rack');
  }

  if (!ex.equipment || ex.equipment === 'body only') {
    if (/pull-?up|chin-?up/.test(name)) need.add('barra_dominadas');
    else if (/bench dip/.test(name)) need.add('banco');
    else if (/\bdips?\b/.test(name)) need.add('paralelas');
  }

  if (ex.category === 'olympic weightlifting') need.add('plataforma');

  return [...need];
}
