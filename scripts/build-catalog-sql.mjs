// Genera supabase/migrations/014_catalog_seed.sql a partir de las fuentes en TypeScript:
//   src/app/core/anatomy/muscles.ts   (músculos y patrones)
//   src/app/core/catalog/curated.ts   (fichas curadas y reglas de patrón provisional)
//
// Uso:  node scripts/build-catalog-sql.mjs
// Node 22.18+ importa los .ts directamente (son archivos sin dependencias en tiempo de ejecución).
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DATASET_MUSCLE_CODE, MOVEMENT_PATTERNS, MUSCLES } from '../src/app/core/anatomy/muscles.ts';
import { CURATED, PATTERN_RULES } from '../src/app/core/catalog/curated.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (xs) => (xs.length ? `array[${xs.map(q).join(', ')}]::text[]` : `'{}'::text[]`);

// ---------- Validación: nada apunta a un código que no existe ----------
const muscleByCode = new Map(MUSCLES.map((m) => [m.code, m]));
const patternCodes = new Set(MOVEMENT_PATTERNS.map((p) => p.code));
const errors = [];
const seen = new Set();
MUSCLES.forEach((m, i) => {
  if (m.parent && !MUSCLES.slice(0, i).some((x) => x.code === m.parent)) errors.push(`músculo ${m.code}: padre ${m.parent} no definido antes`);
});
for (const c of CURATED) {
  if (seen.has(c.id)) errors.push(`ejercicio repetido: ${c.id}`);
  seen.add(c.id);
  if (!patternCodes.has(c.pattern)) errors.push(`${c.id}: patrón desconocido ${c.pattern}`);
  for (const code of [...c.principal, ...c.secundarios]) if (!muscleByCode.has(code)) errors.push(`${c.id}: músculo desconocido ${code}`);
  if (c.principal.length === 0) errors.push(`${c.id}: sin músculo principal`);
  if (c.principal.some((x) => c.secundarios.includes(x))) errors.push(`${c.id}: un músculo es principal y secundario`);
  if (c.id.startsWith('DV_') !== !!c.create) errors.push(`${c.id}: los ids DV_ (y solo ellos) llevan "create"`);
}
for (const [, pattern] of PATTERN_RULES) if (!patternCodes.has(pattern)) errors.push(`regla con patrón desconocido ${pattern}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const uniq = (xs) => [...new Set(xs)];
const out = [];
out.push(`-- GENERADO por scripts/build-catalog-sql.mjs. No editar a mano: cambia las fuentes y vuelve a generar.
-- Datos del catálogo: músculos, patrones de movimiento, ejercicios propios y fichas curadas.
-- Es seguro ejecutarla más de una vez (todo son upserts).
`);

out.push('-- ---------- Músculos ----------');
out.push('insert into public.muscles (code, name_es, name_en, region, level, parent, volume_key) values');
out.push(
  MUSCLES.map((m) => `  (${[m.code, m.nameEs, m.nameEn, m.region, m.level, m.parent, m.volumeKey].map(q).join(', ')})`).join(',\n'),
);
out.push(`on conflict (code) do update set name_es = excluded.name_es, name_en = excluded.name_en, region = excluded.region,
  level = excluded.level, parent = excluded.parent, volume_key = excluded.volume_key;
`);

out.push('-- ---------- Patrones de movimiento ----------');
out.push('insert into public.movement_patterns (code, name_es, name_en) values');
out.push(MOVEMENT_PATTERNS.map((p) => `  (${[p.code, p.nameEs, p.nameEn].map(q).join(', ')})`).join(',\n'));
out.push('on conflict (code) do update set name_es = excluded.name_es, name_en = excluded.name_en;\n');

out.push('-- ---------- Ejercicios propios (reales, pero ausentes en free-exercise-db) ----------');
for (const c of CURATED.filter((x) => x.create)) {
  const k = c.create;
  out.push(`insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values (${[c.id, k.name, k.nameEs, 'strength', k.level, k.force, k.mechanic, k.equipment].map(q).join(', ')}, ${arr(k.instructionsEs)}, 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';`);
}

out.push(`
-- ---------- Copia de los músculos originales del dataset (una sola vez) ----------
update public.exercises set dataset_muscles = jsonb_build_object('primary', to_jsonb(primary_muscles), 'secondary', to_jsonb(secondary_muscles))
where dataset_muscles is null and source = 'free-exercise-db';

-- ---------- Músculos de cada ejercicio según el dataset (sin inventar porciones) ----------
with map(dataset_muscle, code) as (values
${Object.entries(DATASET_MUSCLE_CODE).map(([d, c]) => `  (${q(d)}, ${q(c)})`).join(',\n')}
)
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select e.id, map.code, 'principal', least(u.ord, 20)::smallint, 'dataset'
from public.exercises e
cross join lateral unnest(e.primary_muscles) with ordinality as u(muscle, ord)
join map on map.dataset_muscle = u.muscle
where e.review_status <> 'verificado'
on conflict (exercise_id, muscle_code) do nothing;

with map(dataset_muscle, code) as (values
${Object.entries(DATASET_MUSCLE_CODE).map(([d, c]) => `  (${q(d)}, ${q(c)})`).join(',\n')}
)
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select e.id, map.code, 'secundario', least(u.ord, 20)::smallint, 'dataset'
from public.exercises e
cross join lateral unnest(e.secondary_muscles) with ordinality as u(muscle, ord)
join map on map.dataset_muscle = u.muscle
where e.review_status <> 'verificado'
on conflict (exercise_id, muscle_code) do nothing;

-- ---------- Patrón PROVISIONAL por nombre para lo no curado (queda pendiente de revisión) ----------
-- Se recalcula entero en cada ejecución: así un cambio de reglas no deja patrones viejos.
update public.exercises set movement_pattern = null where review_status <> 'verificado';`);
for (const [re, pattern] of PATTERN_RULES) {
  out.push(`update public.exercises set movement_pattern = ${q(pattern)}
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* ${q(re)};`);
}

out.push('\n-- ---------- Fichas curadas (verificadas) ----------');
for (const c of CURATED) {
  const primaryKeys = uniq(c.principal.map((x) => muscleByCode.get(x).volumeKey));
  const secondaryKeys = uniq(c.secundarios.map((x) => muscleByCode.get(x).volumeKey)).filter((k) => !primaryKeys.includes(k));
  out.push(`update public.exercises set movement_pattern = ${q(c.pattern)}, muscle_function = ${q(c.funcion)},
  common_errors = ${arr(c.errores)}, variants = ${arr(c.variantes)}, precautions = ${arr(c.precauciones)}, safety_notes = ${arr(c.seguridad)},
  rep_range_min = ${c.reps[0]}, rep_range_max = ${c.reps[1]}, required_gear = ${c.gear ? arr(c.gear) : 'null'},
  primary_muscles = ${arr(primaryKeys)}, secondary_muscles = ${arr(secondaryKeys)}, review_status = 'verificado'
where id = ${q(c.id)};
delete from public.exercise_muscles where exercise_id = ${q(c.id)};
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select ${q(c.id)}, v.code, v.role, v.pos, 'curado'
from (values ${[
    ...c.principal.map((m, i) => `(${q(m)}, 'principal', ${i + 1}::smallint)`),
    ...c.secundarios.map((m, i) => `(${q(m)}, 'secundario', ${i + 1}::smallint)`),
  ].join(', ')}) as v(code, role, pos)
where exists (select 1 from public.exercises where id = ${q(c.id)});`);
}
out.push("\nnotify pgrst, 'reload schema';\n");

const file = resolve(root, 'supabase/migrations/014_catalog_seed.sql');
writeFileSync(file, out.join('\n'));
console.log(`${file}: ${MUSCLES.length} músculos, ${MOVEMENT_PATTERNS.length} patrones, ${CURATED.length} fichas curadas.`);
