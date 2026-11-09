import type { Exercise } from '../models';
import { patternOf } from '../routine/rules';

/**
 * Claves de técnica en español, cortas (3 por ejercicio) y agrupadas por patrón de movimiento.
 * Se basan en recomendaciones generales de seguridad y eficacia (control excéntrico de ~2 s,
 * rango completo sin dolor, columna neutra).
 */
const CUES: Record<string, string[]> = {
  sentadilla: [
    'Pies al ancho de hombros, rodillas en la línea de los pies',
    'Baja controlado mientras la espalda siga neutra',
    'Empuja el suelo con todo el pie para subir',
  ],
  prensa: [
    'Espalda y glúteos pegados al respaldo',
    'Baja hasta ~90° de rodilla sin despegar la zona lumbar',
    'No bloquees las rodillas arriba',
  ],
  zancada: [
    'Paso largo y torso erguido',
    'La rodilla de atrás baja casi hasta el suelo',
    'Empuja con el talón de la pierna de adelante',
  ],
  bisagra: [
    'Lleva la cadera atrás con rodillas un poco flexionadas',
    'Espalda neutra y el peso cerca de las piernas',
    'Sube apretando los glúteos',
  ],
  puente_gluteo: [
    'Espalda alta apoyada y mentón hacia el pecho',
    'Sube hasta alinear hombros, cadera y rodillas',
    'Aprieta los glúteos 1 segundo arriba',
  ],
  extension_cuadriceps: [
    'Ajusta el respaldo: la rodilla queda en el eje de la máquina',
    'Estira sin golpear al final',
    'Baja lento, en 2 segundos',
  ],
  curl_femoral: [
    'Rodilla alineada con el eje de la máquina',
    'Lleva el talón hacia el glúteo',
    'Vuelve lento, sin soltar el peso',
  ],
  abductor: ['Espalda apoyada', 'Abre lento y controlado', 'Pausa 1 segundo afuera'],
  aductor: ['Espalda apoyada', 'Cierra lento y controlado', 'Pausa 1 segundo adentro'],
  pantorrilla: ['Baja hasta estirar el talón', 'Sube en punta de pies y pausa 1 segundo', 'Sin rebotes'],
  press_pecho: [
    'Junta las escápulas y llévalas hacia abajo',
    'Baja controlado, codos a unos 45° del cuerpo',
    'Pies firmes en el suelo',
  ],
  press_inclinado: [
    'Junta las escápulas y saca pecho',
    'Baja a la parte alta del pecho, codos a ~45°',
    'Empuja sin despegar la espalda del banco',
  ],
  aperturas: [
    'Codos un poco flexionados todo el recorrido',
    'Abre hasta sentir estiramiento, nunca dolor en el hombro',
    'Cierra como si abrazaras un árbol',
  ],
  press_hombro: [
    'Abdomen firme, sin arquear la espalda',
    'Empuja hacia arriba hasta casi estirar',
    'Baja hasta la altura de las orejas',
  ],
  elevacion_lateral: [
    'Sube solo hasta la altura de los hombros',
    'Sin balancear el cuerpo',
    'Baja lento, en 2 segundos',
  ],
  elevacion_frontal: ['Sube hasta la altura de los hombros', 'Sin balancear el cuerpo', 'Baja lento'],
  deltoide_posterior: ['Brazos casi estirados', 'Abre hacia atrás juntando escápulas', 'Sin impulso'],
  jalon: [
    'Pecho arriba y hombros lejos de las orejas',
    'Tira con los codos hacia abajo, a la parte alta del pecho',
    'Sube controlado sin soltar la tensión',
  ],
  dominada: ['Parte colgado con los brazos estirados', 'Tira llevando el pecho hacia la barra', 'Baja controlado'],
  remo: ['Espalda neutra y pecho arriba', 'Tira con los codos hacia atrás y junta escápulas', 'Vuelve lento'],
  encogimiento: ['Sube los hombros hacia las orejas', 'Pausa 1 segundo arriba', 'No gires los hombros'],
  curl: ['Codos pegados al cuerpo', 'Sube sin balancear el tronco', 'Baja lento hasta estirar'],
  curl_martillo: ['Palmas mirándose entre sí', 'Codos pegados al cuerpo', 'Baja lento hasta estirar'],
  curl_predicador: ['Brazo apoyado en el cojín', 'Sube sin despegar el codo', 'Baja lento sin estirar de golpe'],
  pushdown: ['Codos pegados al cuerpo', 'Estira por completo abajo', 'Vuelve controlado'],
  extension_triceps: ['Codos fijos, solo se mueve el antebrazo', 'Estira por completo', 'Vuelve controlado'],
  fondos: ['Hombros lejos de las orejas', 'Baja hasta ~90° de codo', 'Sube sin bloquear de golpe'],
  crunch: ['Exhala al subir', 'Acerca las costillas a la cadera', 'No tires del cuello'],
  plancha: ['Cuerpo en línea recta', 'Aprieta abdomen y glúteos', 'Respira normal'],
  elevacion_piernas: ['Zona lumbar pegada al apoyo', 'Sube y baja controlado', 'Exhala al subir'],
};

const DEFAULT = ['Movimiento controlado: 2 segundos al bajar', 'Rango completo y sin dolor', 'Exhala en el esfuerzo'];
const STRETCH = ['Tensión suave, nunca dolor', 'Sin rebotes', 'Respira lento y profundo'];
const CARDIO = ['Ritmo en el que puedas hablar', 'Postura erguida', 'Si te mareas, baja el ritmo'];

export function techniqueCues(ex: Exercise): string[] {
  if (ex.category === 'stretching') return STRETCH;
  if (ex.category === 'cardio') return CARDIO;
  return CUES[patternOf(ex.name, '')] ?? DEFAULT;
}

type EquipKind = 'maquina' | 'barra' | 'mancuerna' | 'polea' | 'corporal';

function equipKind(ex: Exercise): EquipKind {
  if (ex.equipment === 'barbell') return /smith/i.test(ex.name) ? 'maquina' : 'barra';
  if (ex.equipment === 'dumbbell' || ex.equipment === 'kettlebells') return 'mancuerna';
  if (ex.equipment === 'cable') return 'polea';
  if (ex.equipment === 'machine') return 'maquina';
  return 'corporal';
}

/** Cómo colocarse antes de empezar (posición inicial), por patrón y tipo de equipo. */
const SETUP: Record<string, Partial<Record<EquipKind | 'default', string[]>>> = {
  sentadilla: {
    maquina: ['Espalda y hombros apoyados en los cojines', 'Pies al ancho de hombros en el centro de la plataforma'],
    barra: [
      'Barra en la parte alta de la espalda, nunca sobre el cuello',
      'Pies al ancho de hombros, puntas un poco afuera',
    ],
    mancuerna: ['Mancuerna pegada al pecho, sujeta con ambas manos', 'Pies al ancho de hombros, puntas un poco afuera'],
    default: ['De pie, pies al ancho de hombros', 'Puntas de los pies un poco hacia afuera'],
  },
  prensa: {
    default: ['Siéntate con toda la espalda apoyada', 'Pies al ancho de hombros en el centro de la plataforma'],
  },
  zancada: {
    mancuerna: ['De pie, una mancuerna en cada mano a los costados', 'Mirada al frente y espalda recta'],
    barra: ['Barra en la parte alta de la espalda', 'De pie, pies al ancho de caderas'],
    default: ['De pie, pies al ancho de caderas', 'Manos en la cintura o a los costados'],
  },
  bisagra: {
    barra: [
      'Barra frente a los muslos, manos al ancho de hombros',
      'Pies al ancho de caderas, rodillas un poco flexionadas',
    ],
    mancuerna: [
      'Una mancuerna en cada mano frente a los muslos',
      'Pies al ancho de caderas, rodillas un poco flexionadas',
    ],
    polea: ['De espaldas a la polea baja, cuerda entre las piernas', 'Da 2 pasos adelante para que haya tensión'],
    default: ['Pies al ancho de caderas', 'Rodillas un poco flexionadas'],
  },
  puente_gluteo: {
    corporal: ['Acostado boca arriba, rodillas flexionadas', 'Pies apoyados al ancho de caderas'],
    default: [
      'Espalda alta apoyada en el banco o respaldo',
      'Almohadilla o barra sobre la cadera, pies al ancho de caderas',
    ],
  },
  extension_cuadriceps: { default: ['Siéntate con la espalda apoyada', 'El rodillo sobre los tobillos, por delante'] },
  curl_femoral: {
    default: ['El rodillo sobre los tobillos, por detrás', 'Rodillas justo al borde del asiento o del banco'],
  },
  abductor: { default: ['Siéntate con la espalda apoyada', 'Almohadillas por fuera de las rodillas'] },
  aductor: { default: ['Siéntate con la espalda apoyada', 'Almohadillas por dentro de las rodillas'] },
  pantorrilla: {
    default: ['Puntas de los pies en el borde del apoyo', 'Talones en el aire, rodillas casi estiradas'],
  },
  press_pecho: {
    maquina: [
      'Ajusta el asiento: las manijas quedan a la altura del pecho',
      'Espalda apoyada y pies firmes en el suelo',
    ],
    barra: ['Acostado en el banco, ojos justo bajo la barra', 'Manos un poco más abiertas que los hombros'],
    mancuerna: ['Acostado en el banco, mancuernas a los lados del pecho', 'Pies firmes en el suelo'],
    corporal: ['Manos un poco más abiertas que los hombros', 'Cuerpo recto de cabeza a talones'],
    default: ['Espalda apoyada', 'Manos a la altura del pecho'],
  },
  press_inclinado: {
    maquina: ['Ajusta el asiento: las manijas quedan a la altura de la parte alta del pecho', 'Espalda apoyada'],
    default: ['Banco inclinado a 30-45°', 'Espalda y cabeza apoyadas, pies firmes en el suelo'],
  },
  aperturas: {
    maquina: ['Ajusta el asiento: las manijas quedan a la altura del pecho', 'Espalda apoyada en el respaldo'],
    polea: ['De pie entre las poleas altas, un paso adelante', 'Una manija en cada mano, brazos abiertos'],
    mancuerna: ['Acostado en el banco, mancuernas arriba del pecho', 'Palmas mirándose entre sí'],
    default: ['Espalda apoyada', 'Brazos abiertos a la altura del pecho'],
  },
  press_hombro: {
    maquina: ['Ajusta el asiento: las manijas quedan a la altura de los hombros', 'Espalda apoyada'],
    mancuerna: ['Sentado con respaldo, mancuernas a la altura de las orejas', 'Pies firmes en el suelo'],
    barra: ['De pie, barra apoyada sobre la parte alta del pecho', 'Manos un poco más abiertas que los hombros'],
    polea: ['Sentado entre las poleas, manijas a la altura de los hombros', 'Espalda apoyada'],
    default: ['Espalda recta', 'Manos a la altura de los hombros'],
  },
  elevacion_lateral: { default: ['De pie, una mancuerna en cada mano a los costados', 'Rodillas un poco flexionadas'] },
  elevacion_frontal: { default: ['De pie, mancuernas frente a los muslos', 'Rodillas un poco flexionadas'] },
  deltoide_posterior: {
    polea: ['Poleas a la altura de los hombros, cables cruzados', 'De pie, un paso atrás'],
    maquina: ['Pecho apoyado en el respaldo', 'Manijas a la altura de los hombros'],
    default: ['Inclinado hacia adelante con la espalda recta', 'Mancuernas colgando bajo los hombros'],
  },
  jalon: {
    default: [
      'Ajusta el rodillo para que los muslos queden fijos',
      'Agarra la barra un poco más abierto que los hombros',
    ],
  },
  dominada: {
    default: ['En la máquina asistida: rodillas o pies sobre la plataforma', 'Agarra la barra al ancho de los hombros'],
  },
  remo: {
    maquina: ['Pecho apoyado en el cojín', 'Brazos estirados agarrando las manijas'],
    polea: ['Sentado, pies en los apoyos y rodillas un poco flexionadas', 'Espalda recta, brazos estirados'],
    mancuerna: ['Una mano y una rodilla apoyadas en el banco', 'Espalda recta y paralela al suelo'],
    barra: ['Inclinado hacia adelante con la espalda recta', 'Barra colgando bajo los hombros'],
    default: ['Espalda recta', 'Brazos estirados'],
  },
  encogimiento: { default: ['De pie, peso a los costados o frente a los muslos', 'Brazos estirados'] },
  curl: {
    polea: ['De pie frente a la polea baja', 'Brazos estirados y codos pegados al cuerpo'],
    default: ['De pie, brazos estirados a los costados', 'Codos pegados al cuerpo'],
  },
  curl_martillo: { default: ['De pie, una mancuerna en cada mano a los costados', 'Palmas mirándose entre sí'] },
  curl_predicador: { default: ['Sentado, axilas apoyadas en el borde del cojín', 'Brazos estirados sobre el cojín'] },
  pushdown: { default: ['De pie frente a la polea alta', 'Codos pegados al cuerpo, a 90°'] },
  extension_triceps: {
    polea: ['De espaldas a la polea, cuerda detrás de la cabeza', 'Un pie adelante para tener equilibrio'],
    default: ['Codos apuntando hacia adelante o arriba', 'Espalda recta'],
  },
  fondos: { default: ['Manos en las barras o en el borde del banco', 'Brazos estirados para empezar'] },
  crunch: {
    polea: ['De rodillas frente a la polea alta', 'Cuerda junto a la cabeza'],
    maquina: ['Ajusta el asiento y sujeta las manijas', 'Pies bajo los rodillos'],
    default: ['Acostado boca arriba, rodillas flexionadas', 'Manos en el pecho o junto a las orejas'],
  },
  plancha: {
    default: ['Antebrazos en el suelo, codos bajo los hombros', 'Piernas estiradas apoyando las puntas de los pies'],
  },
  elevacion_piernas: { default: ['Acostado boca arriba, manos sujetando el banco', 'Piernas estiradas'] },
};

/** Cómo colocarse antes de empezar (1-2 frases). */
export function setupCues(ex: Exercise): string[] {
  if (ex.category === 'stretching') return ['Busca un espacio cómodo y estable', 'Entra en la posición lentamente'];
  if (ex.category === 'cardio') {
    if (/treadmill/i.test(ex.name))
      return ['Sube a la trotadora y empieza caminando suave', 'Luego sube la inclinación'];
    return ['Ajusta el asiento o los pedales a tu altura', 'Empieza suave los primeros 2 minutos'];
  }
  const kind = equipKind(ex);
  const byPattern = SETUP[patternOf(ex.name, '')];
  const cues = byPattern?.[kind] ?? byPattern?.default;
  if (cues) return cues;
  return kind === 'maquina' || kind === 'polea'
    ? ['Ajusta el asiento o la polea a tu altura', 'Posición estable antes de mover el peso']
    : ['Posición estable, espalda recta', 'Mirada al frente'];
}
