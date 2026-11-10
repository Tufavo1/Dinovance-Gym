import type { Exercise } from '../models';
import type { AthleteProfile } from '../routine/athlete-profile';
import type { StoredRoutine } from '../routine.service';
import { MUSCLE_LABEL_ES, TRACKED_MUSCLES, weeklyRange } from './programming';

export interface VolumeRow {
  muscle: string;
  label: string;
  sets: number;
  min: number;
  max: number;
  status: 'bajo' | 'optimo' | 'alto';
  /** Veces por semana que se entrena. */
  frequency: number;
}

export interface Principle {
  title: string;
  text: string;
  refs: string[];
}

/** Series semanales (solo series con peso: se excluyen estiramientos y cardio) y frecuencia por músculo. */
export function weeklyVolume(routine: StoredRoutine, byId: Map<string, Exercise>, p: AthleteProfile): VolumeRow[] {
  const sets = new Map<string, number>();
  const freq = new Map<string, number>();
  for (const day of routine.routine_days) {
    const seen = new Set<string>();
    for (const e of day.routine_exercises) {
      const ex = byId.get(e.exercise_id);
      if (!ex || ex.category === 'stretching' || ex.category === 'cardio') continue;
      if (e.reps_min === 1 && e.reps_max === 1) continue;
      const m = ex.primary_muscles[0];
      if (!m) continue;
      sets.set(m, (sets.get(m) ?? 0) + e.sets);
      seen.add(m);
    }
    seen.forEach((m) => freq.set(m, (freq.get(m) ?? 0) + 1));
  }
  const rows: VolumeRow[] = [];
  for (const m of TRACKED_MUSCLES) {
    const n = sets.get(m);
    const range = weeklyRange(m, p.programme);
    if (!n || !range) continue;
    rows.push({
      muscle: m,
      label: MUSCLE_LABEL_ES[m],
      sets: n,
      min: range[0],
      max: range[1],
      status: n < range[0] ? 'bajo' : n > range[1] ? 'alto' : 'optimo',
      frequency: freq.get(m) ?? 0,
    });
  }
  return rows;
}

/** Por qué la rutina está armada así: cada principio apunta a sus referencias. */
export function principlesFor(p: AthleteProfile, rows: VolumeRow[]): Principle[] {
  const out: Principle[] = [];
  const pg = p.programme;
  const freqOk = rows.length > 0 && rows.every((r) => r.frequency >= 2);

  out.push({
    title: 'Volumen semanal',
    text: `${pg.weeklySets[0]}–${pg.weeklySets[1]} series por semana por músculo. Menos casi no avanza; más no se recupera.`,
    refs: ['schoenfeld2017-volume', 'israetel-sph'],
  });
  if (freqOk) {
    out.push({
      title: 'Frecuencia de 2 veces por semana',
      text: 'Cada músculo, 2 veces por semana: rinde más que todo en un día.',
      refs: ['schoenfeld2016-frequency'],
    });
  }
  out.push({
    title: pg.approach === 'alta_intensidad' ? 'Pocas series, muy exigentes' : 'Repeticiones y descansos',
    text:
      pg.approach === 'alta_intensidad'
        ? '1–2 series cerca del fallo (estilo Mentzer). Ahorra tiempo, pero más series crecen más.'
        : 'Pesados: 6–10 reps, descanso 2–3 min. Aislados: 10–15 reps, ~75 s.',
    refs:
      pg.approach === 'alta_intensidad'
        ? ['krieger2010-sets', 'androulakis2020-med', 'mentzer-heavyduty']
        : ['schoenfeld2017-load', 'schoenfeld2021-continuum', 'schoenfeld2016-rest'],
  });
  out.push({
    title: `${pg.rir[0]} a ${pg.rir[1]} repeticiones en reserva`,
    text: 'No siempre al fallo: casi el mismo resultado con menos cansancio.',
    refs: ['refalo2023-failure', 'helms2016-rir', 'zourdos2016-rir'],
  });
  out.push({
    title: 'Recorrido completo y músculo estirado',
    text: 'Ejercicios que estiran el músculo: más crecimiento. Recorrido completo y baja lento.',
    refs: ['wolf2023-rom', 'nippard-programs'],
  });
  out.push({
    title: `Descarga cada ${pg.mesocycleWeeks} semanas`,
    text: 'Subes el esfuerzo y luego una semana más suave para recuperarte.',
    refs: ['israetel-sph', 'bell2022-deload', 'helms-pyramids'],
  });
  if (p.beginner) {
    out.push({
      title: 'Empezar con técnica',
      text: 'Máquinas y pocas series al inicio. Sube cuando domines la técnica.',
      refs: ['ratamess2009-acsm'],
    });
  }
  if (p.minutes <= 45) {
    out.push({
      title: 'Sesiones cortas',
      text: 'Pocos ejercicios, los más completos.',
      refs: ['iversen2021-time'],
    });
  }
  if (p.strength || Object.keys(p.marks).length > 0) {
    out.push({
      title: 'Tus marcas de fuerza',
      text: 'Tu RM se estima con pocas repeticiones (fiable hasta ~10) y define tus cargas de partida.',
      refs: ['lesuer1997-1rm', 'brzycki1993-1rm', 'rippetoe-standards'],
    });
  }
  if (Object.keys(p.frequency.target).length > 0) {
    out.push({
      title: 'Frecuencia a tu medida',
      text: 'Respetamos las veces por semana que pediste. Con el mismo volumen, 2 veces basta.',
      refs: ['schoenfeld2016-frequency', 'schoenfeld2019-frequency'],
    });
  }
  out.push({
    title: 'Proteína y cardio',
    text: '1,6–2,2 g de proteína por kg al día. Cardio después de las pesas.',
    refs: ['morton2018-protein', 'norton-protein', 'wilson2012-concurrent'],
  });
  return out;
}
