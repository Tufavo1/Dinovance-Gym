// Importa free-exercise-db (Unlicense) a la tabla public.exercises de Supabase.
//
// Uso (desde la carpeta gym-app):
//   node --env-file=.env.local scripts/import-exercises.mjs
//
// Requiere en .env.local:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...   (NUNCA en la app ni en git; solo para este script)
import { createClient } from '@supabase/supabase-js';

const SOURCE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const BATCH = 200;

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('Descargando dataset...');
const res = await fetch(SOURCE);
if (!res.ok) {
  console.error(`No se pudo descargar el dataset: HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();
console.log(`${data.length} ejercicios descargados.`);

const rows = data.map((e) => ({
  id: e.id,
  name: e.name,
  category: e.category ?? null,
  level: e.level ?? null,
  force_type: e.force ?? null,
  mechanic: e.mechanic ?? null,
  equipment: e.equipment ?? null,
  primary_muscles: e.primaryMuscles ?? [],
  secondary_muscles: e.secondaryMuscles ?? [],
  instructions: e.instructions ?? [],
  images: e.images ?? [], // rutas relativas: <id>/0.jpg
}));

let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  // upsert: no pisa name_es ni instructions_es porque no vienen en el objeto
  const { error } = await supabase.from('exercises').upsert(chunk, { onConflict: 'id' });
  if (error) {
    console.error(`Error en el lote ${i}-${i + chunk.length}:`, error.message);
    process.exit(1);
  }
  done += chunk.length;
  console.log(`  ${done}/${rows.length}`);
}

console.log('Listo.');
