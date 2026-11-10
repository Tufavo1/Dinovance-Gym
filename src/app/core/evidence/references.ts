/**
 * Biblioteca de evidencia que respalda las reglas del generador.
 *
 * IMPORTANTE: la app NO consulta PubMed ni JSCR en tiempo real. Estas son las referencias
 * publicadas cuyas conclusiones se tradujeron a reglas (volumen, frecuencia, repeticiones,
 * descanso, cercanía al fallo, deload, proteína). Cada referencia enlaza a una búsqueda en
 * PubMed para que cualquiera pueda comprobar el estudio original.
 */

export type ReferenceSource = 'PubMed' | 'JSCR' | 'Libro / programa' | 'Otra revista';

export interface Reference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  source: ReferenceSource;
  /** Qué conclusión práctica se usa en la app. */
  takeaway: string;
}

export const REFERENCES: Reference[] = [
  {
    id: 'schoenfeld2019-frequency',
    authors: 'Schoenfeld BJ, Grgic J, Krieger J',
    year: 2019,
    title:
      'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency',
    journal: 'Journal of Sports Sciences',
    source: 'PubMed',
    takeaway:
      'Con el mismo volumen semanal, la frecuencia importa poco; lo clave es completar las series. 2 veces por semana es un buen mínimo.',
  },
  {
    id: 'lesuer1997-1rm',
    authors: 'LeSuer DA, McCormick JH, Mayhew JL, Wasserstein RL, Arios MD',
    year: 1997,
    title:
      'The accuracy of prediction equations for estimating 1-RM performance in the bench press, squat, and deadlift',
    journal: 'Journal of Strength and Conditioning Research',
    source: 'JSCR',
    takeaway:
      'El RM estimado con pocas repeticiones (hasta ~10) es confiable; con más repeticiones se vuelve impreciso.',
  },
  {
    id: 'rippetoe-standards',
    authors: 'Rippetoe M, Kilgore L',
    year: 2006,
    title: 'Practical Programming for Strength Training',
    journal: 'The Aasgaard Company',
    source: 'Libro / programa',
    takeaway: 'Tablas de fuerza por peso corporal para ubicar tu nivel (principiante, intermedio, avanzado).',
  },
  {
    id: 'brzycki1993-1rm',
    authors: 'Brzycki M',
    year: 1993,
    title: 'Strength testing: predicting a one-rep max from reps-to-fatigue',
    journal: 'Journal of Physical Education, Recreation & Dance',
    source: 'Otra revista',
    takeaway: 'Fórmula para estimar tu 1RM a partir de las repeticiones que haces con un peso.',
  },
  {
    id: 'schoenfeld2017-volume',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    year: 2017,
    title:
      'Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis',
    journal: 'Journal of Sports Sciences',
    source: 'PubMed',
    takeaway:
      'Más series semanales por músculo dan más hipertrofia; 10 o más series por semana rindieron mejor que menos de 5.',
  },
  {
    id: 'schoenfeld2016-frequency',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    year: 2016,
    title:
      'Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis',
    journal: 'Sports Medicine',
    source: 'PubMed',
    takeaway: 'Entrenar cada músculo al menos 2 veces por semana supera a 1 vez con el mismo volumen.',
  },
  {
    id: 'schoenfeld2017-load',
    authors: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW',
    year: 2017,
    title:
      'Strength and hypertrophy adaptations between low- vs. high-load resistance training: a systematic review and meta-analysis',
    journal: 'Journal of Strength and Conditioning Research',
    source: 'JSCR',
    takeaway:
      'La hipertrofia es similar con cargas bajas o altas si las series se acercan al fallo; la fuerza máxima mejora más con cargas altas.',
  },
  {
    id: 'schoenfeld2016-rest',
    authors: 'Schoenfeld BJ, Pope ZK, Benik FM, et al.',
    year: 2016,
    title: 'Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men',
    journal: 'Journal of Strength and Conditioning Research',
    source: 'JSCR',
    takeaway: 'En ejercicios compuestos conviene descansar 2 a 3 minutos entre series.',
  },
  {
    id: 'schoenfeld2021-continuum',
    authors: 'Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL',
    year: 2021,
    title:
      'Loading recommendations for muscle strength, hypertrophy, and local endurance: a re-examination of the repetition continuum',
    journal: 'Sports',
    source: 'PubMed',
    takeaway:
      'Fuerza: cargas pesadas (≈1 a 5 reps). Hipertrofia: sirve un rango amplio (≈5 a 30 reps) cerca del fallo.',
  },
  {
    id: 'krieger2010-sets',
    authors: 'Krieger JW',
    year: 2010,
    title: 'Single vs. multiple sets of resistance exercise for muscle hypertrophy: a meta-analysis',
    journal: 'Journal of Strength and Conditioning Research',
    source: 'JSCR',
    takeaway:
      'Una sola serie sí produce resultados, pero varias series dan alrededor de 40 % más hipertrofia. Por eso el enfoque de pocas series es una opción, no la regla.',
  },
  {
    id: 'androulakis2020-med',
    authors: 'Androulakis-Korakakis P, Fisher JP, Steele J',
    year: 2020,
    title:
      'The minimum effective training dose required to increase 1RM strength in resistance-trained men: a systematic review and meta-analysis',
    journal: 'Sports Medicine',
    source: 'PubMed',
    takeaway: 'Con muy poco volumen (1 a 2 series por ejercicio) se puede ganar fuerza, sobre todo si hay poco tiempo.',
  },
  {
    id: 'wolf2023-rom',
    authors: 'Wolf M, Androulakis-Korakakis P, Fisher J, Schoenfeld B, Steele J',
    year: 2023,
    title: 'Partial vs full range of motion resistance training: a systematic review and meta-analysis',
    journal: 'International Journal of Strength and Conditioning',
    source: 'Otra revista',
    takeaway:
      'Recorrido completo, con énfasis en la posición de estiramiento del músculo, es la opción segura para crecer.',
  },
  {
    id: 'refalo2023-failure',
    authors: 'Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ',
    year: 2023,
    title:
      'Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis',
    journal: 'Sports Medicine',
    source: 'PubMed',
    takeaway:
      'No hace falta llegar siempre al fallo: terminar con 0 a 3 repeticiones en reserva da resultados similares con menos fatiga.',
  },
  {
    id: 'helms2016-rir',
    authors: 'Helms ER, Cronin J, Storey A, Zourdos MC',
    year: 2016,
    title: 'Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training',
    journal: 'Strength and Conditioning Journal',
    source: 'PubMed',
    takeaway: 'La escala de repeticiones en reserva (RIR) sirve para elegir el peso y progresar con seguridad.',
  },
  {
    id: 'zourdos2016-rir',
    authors: 'Zourdos MC, Klemp A, Dolan C, et al.',
    year: 2016,
    title: 'Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve',
    journal: 'Journal of Strength and Conditioning Research',
    source: 'JSCR',
    takeaway: 'Valida la escala RPE-RIR (RPE = 10 − RIR) que usa la app en cada serie.',
  },
  {
    id: 'morton2018-protein',
    authors: 'Morton RW, Murphy KT, McKellar SR, et al.',
    year: 2018,
    title:
      'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
    journal: 'British Journal of Sports Medicine',
    source: 'PubMed',
    takeaway: 'Alrededor de 1,6 g de proteína por kg de peso al día maximiza las ganancias; más de eso aporta poco.',
  },
  {
    id: 'helms2014-protein',
    authors: 'Helms ER, Zinn C, Rowlands DS, Brown SR',
    year: 2014,
    title:
      'A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes',
    journal: 'International Journal of Sport Nutrition and Exercise Metabolism',
    source: 'PubMed',
    takeaway: 'Bajando de peso conviene subir la proteína (2,3 a 3,1 g/kg de masa magra) para conservar músculo.',
  },
  {
    id: 'wilson2012-concurrent',
    authors: 'Wilson JM, Marin PJ, Rhea MR, et al.',
    year: 2012,
    title: 'Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises',
    journal: 'Journal of Strength and Conditioning Research',
    source: 'JSCR',
    takeaway:
      'El cardio de alto impacto o muy largo resta ganancias; por eso va después de las pesas y de forma moderada.',
  },
  {
    id: 'iversen2021-time',
    authors: 'Iversen VM, Norum M, Schoenfeld BJ, Fimland MS',
    year: 2021,
    title:
      'No time to lift? Designing time-efficient training programs for strength and hypertrophy: a narrative review',
    journal: 'Sports Medicine',
    source: 'PubMed',
    takeaway: 'Con poco tiempo, prioriza ejercicios compuestos, series cerca del fallo y supersets.',
  },
  {
    id: 'ratamess2009-acsm',
    authors: 'American College of Sports Medicine (Ratamess N, et al.)',
    year: 2009,
    title: 'Progression models in resistance training for healthy adults (position stand)',
    journal: 'Medicine & Science in Sports & Exercise',
    source: 'PubMed',
    takeaway: 'Principiantes: 1 a 3 series de 8 a 12 reps, 2 a 3 días por semana, y progresión gradual de la carga.',
  },
  {
    id: 'foster1998-srpe',
    authors: 'Foster C',
    year: 1998,
    title: 'Monitoring training in athletes with reference to overtraining syndrome',
    journal: 'Medicine & Science in Sports & Exercise',
    source: 'PubMed',
    takeaway: 'El esfuerzo percibido de la sesión (sRPE) multiplicado por los minutos mide la carga de entrenamiento.',
  },
  {
    id: 'bell2022-deload',
    authors: 'Bell L, Nolan D, Immonen V, Helms E',
    year: 2022,
    title:
      "\"You can't shoot another bullet until you've reloaded the gun\": coaches' perceptions, practices and experiences of deloading",
    journal: 'Frontiers in Sports and Active Living',
    source: 'PubMed',
    takeaway: 'Las semanas de descarga se usan cada 4 a 8 semanas o cuando el rendimiento y el ánimo caen.',
  },
  {
    id: 'israetel-sph',
    authors: 'Israetel M, Hoffmann J, Smith CW',
    year: 2019,
    title: 'Scientific Principles of Hypertrophy Training (Renaissance Periodization)',
    journal: 'Renaissance Periodization',
    source: 'Libro / programa',
    takeaway:
      'Marco de volumen: mínimo efectivo (MEV), volumen óptimo (MAV) y máximo recuperable (MRV), con mesociclos que suben el esfuerzo y terminan en descarga.',
  },
  {
    id: 'helms-pyramids',
    authors: 'Helms E, Valdez A, Morgan A',
    year: 2015,
    title: 'The Muscle and Strength Pyramid: Training',
    journal: '3DMJ',
    source: 'Libro / programa',
    takeaway:
      'Orden de prioridades: constancia, luego volumen/intensidad/frecuencia, luego progresión y recién después los detalles.',
  },
  {
    id: 'mentzer-heavyduty',
    authors: 'Mentzer M',
    year: 1993,
    title: 'Heavy Duty (alta intensidad, pocas series al fallo)',
    journal: 'Libro',
    source: 'Libro / programa',
    takeaway:
      'Base del enfoque de "alta intensidad": pocas series, al fallo y con mucho descanso. La evidencia respalda que funciona, pero rinde menos que un volumen moderado (Krieger 2010).',
  },
  {
    id: 'nippard-programs',
    authors: 'Nippard J',
    year: 2022,
    title: 'Programas "science-based": selección de ejercicios con tensión en posición alargada y técnica controlada',
    journal: 'Jeff Nippard Fitness',
    source: 'Libro / programa',
    takeaway:
      'Se prefieren ejercicios que cargan el músculo estirado (curl inclinado, extensión sobre la cabeza, curl femoral sentado).',
  },
  {
    id: 'norton-protein',
    authors: 'Norton LE (BioLayne)',
    year: 2020,
    title: 'Distribución de proteína y constancia nutricional para el músculo',
    journal: 'BioLayne',
    source: 'Libro / programa',
    takeaway: 'Repartir la proteína en 3 a 5 comidas con 0,4 g/kg cada una favorece la síntesis muscular.',
  },
];

export const REFERENCE_BY_ID = new Map(REFERENCES.map((r) => [r.id, r]));

export function pubmedUrl(r: Reference): string {
  return 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(r.title.replace(/["“”]/g, ''));
}

/** Citas del tipo "Schoenfeld 2017" para mostrar junto a cada principio. */
export function shortCite(r: Reference): string {
  const first = r.authors.split(/[ ,]/)[0];
  return `${first} ${r.year}`;
}
