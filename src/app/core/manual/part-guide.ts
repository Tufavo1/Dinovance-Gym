/**
 * Guía por parte del cuerpo para crear rutinas a mano: consejos cortos (basados en
 * recomendaciones generales de entrenamiento de fuerza) y con qué partes combina bien el mismo día.
 *
 * Las combinaciones siguen la lógica de empuje / tirón / piernas: músculos que trabajan juntos
 * en los mismos movimientos se entrenan el mismo día y luego descansan juntos.
 */
export interface PartGuide {
  tips: string[];
  /** Partes (ids de BODY_PARTS) que combinan bien el mismo día. */
  pairsWith: string[];
  /** Por qué combinan. */
  pairWhy: string;
}

export const PART_GUIDE: Record<string, PartGuide> = {
  pecho: {
    tips: [
      'Empieza con un press (máquina, barra o mancuernas) y termina con aperturas.',
      'Junta las escápulas: así el trabajo va al pecho y no al hombro.',
      'Para empezar bastan 6 a 10 series a la semana.',
    ],
    pairsWith: ['hombros', 'triceps'],
    pairWhy: 'Al empujar también trabajan hombros y tríceps.',
  },
  hombros: {
    tips: [
      'Un press arriba de la cabeza y elevaciones laterales cubren casi todo el hombro.',
      'Usa poco peso en las elevaciones: el hombro es una articulación delicada.',
      'No olvides la parte de atrás del hombro (face pull o aperturas invertidas).',
    ],
    pairsWith: ['pecho', 'triceps'],
    pairWhy: 'Trabajan juntos en los empujes.',
  },
  biceps: {
    tips: [
      'Ya trabajan en remos y jalones: 1 o 2 ejercicios directos bastan.',
      'Codos pegados al cuerpo y sin balancear el tronco.',
      'Baja lento: la bajada también hace crecer el músculo.',
    ],
    pairsWith: ['espalda', 'antebrazos'],
    pairWhy: 'Al tirar (remos, jalones) también trabajan los bíceps.',
  },
  triceps: {
    tips: [
      'Ya trabajan en los press de pecho y hombro: 1 o 2 ejercicios directos bastan.',
      'Un ejercicio con los brazos arriba de la cabeza estira mejor el tríceps.',
      'Codos fijos: solo se mueve el antebrazo.',
    ],
    pairsWith: ['pecho', 'hombros'],
    pairWhy: 'Al empujar también trabajan los tríceps.',
  },
  antebrazos: {
    tips: [
      'El agarre ya se entrena en remos, jalones y peso muerto.',
      'Si los entrenas directo, hazlo al final para no cansar el agarre antes.',
    ],
    pairsWith: ['biceps', 'espalda'],
    pairWhy: 'Trabajan cada vez que agarras y tiras.',
  },
  abdomen: {
    tips: [
      'Puedes entrenarlo casi cualquier día: se recupera rápido.',
      'Mejor al final de la sesión, para que esté fresco en los ejercicios grandes.',
      'Combina un ejercicio de flexión (crunch) con uno de estabilidad (plancha).',
    ],
    pairsWith: ['lumbar', 'gluteos'],
    pairWhy: 'Juntos forman el "core" que protege tu columna.',
  },
  cadera: {
    tips: [
      'Las máquinas de abductores y aductores son seguras para empezar.',
      'Movimiento lento y con pausa de 1 segundo en el extremo.',
      'Ayudan a estabilizar la rodilla y la cadera.',
    ],
    pairsWith: ['gluteos', 'cuadriceps'],
    pairWhy: 'Estabilizan la pierna en sentadillas y zancadas.',
  },
  cuadriceps: {
    tips: [
      'Empieza con sentadilla o prensa y termina con extensión de cuádriceps.',
      'Rodillas en la línea de los pies, sin que se vayan hacia adentro.',
      'Es un músculo grande: descansa 2 minutos entre series pesadas.',
    ],
    pairsWith: ['gluteos', 'isquiotibiales', 'pantorrillas'],
    pairWhy: 'Un día de piernas completo trabaja todo el muslo y la cadera.',
  },
  trapecio: {
    tips: [
      'Ya trabaja en remos y peso muerto: rara vez necesita ejercicios aparte.',
      'En los encogimientos sube y baja recto, sin girar los hombros.',
    ],
    pairsWith: ['espalda', 'hombros'],
    pairWhy: 'Trabaja junto a la espalda alta y los hombros.',
  },
  espalda: {
    tips: [
      'Combina un tirón desde arriba (jalón o dominada) con uno hacia atrás (remo).',
      'Piensa en tirar con los codos, no con las manos.',
      'Entrenar espalda tanto como pecho cuida tu postura.',
    ],
    pairsWith: ['biceps', 'trapecio'],
    pairWhy: 'Al tirar también trabajan bíceps y trapecio.',
  },
  lumbar: {
    tips: [
      'Necesita pocas series directas: ya trabaja en sentadillas y peso muerto.',
      'Siempre con espalda neutra y movimientos controlados.',
      'Si tienes dolor lumbar, consulta antes de cargar peso.',
    ],
    pairsWith: ['gluteos', 'isquiotibiales', 'abdomen'],
    pairWhy: 'Juntos sostienen la cadera y la columna.',
  },
  gluteos: {
    tips: [
      'El hip thrust y el puente son de los mejores para activarlos.',
      'Aprieta 1 segundo arriba en cada repetición.',
      'Sentadillas y zancadas profundas también los trabajan.',
    ],
    pairsWith: ['isquiotibiales', 'cuadriceps', 'cadera'],
    pairWhy: 'Trabajan juntos en casi todos los ejercicios de pierna.',
  },
  isquiotibiales: {
    tips: [
      'Combina un peso muerto rumano (cadera) con un curl femoral (rodilla).',
      'Equilibrarlos con el cuádriceps cuida tus rodillas.',
      'Baja lento: es donde más trabajan.',
    ],
    pairsWith: ['gluteos', 'cuadriceps'],
    pairWhy: 'Un día de piernas completo trabaja adelante y atrás del muslo.',
  },
  pantorrillas: {
    tips: [
      'Baja hasta estirar el talón y sube en punta de pies con pausa.',
      'Responden bien a más repeticiones (12 a 20).',
      'Puedes entrenarlas varios días a la semana.',
    ],
    pairsWith: ['cuadriceps', 'isquiotibiales'],
    pairWhy: 'Se suman al final de un día de piernas.',
  },
};
