-- Anatomía muscular y catálogo avanzado de ejercicios (estructura).
-- Los datos (músculos, patrones y fichas curadas) los carga la migración 014, generada desde
-- src/app/core/anatomy/muscles.ts y src/app/core/catalog/curated.ts.
-- Es seguro ejecutarla más de una vez. Reversa: migrations/down/013_anatomy_catalog.down.sql

-- ---------- Músculos: grupo -> músculo -> porción ----------
create table if not exists public.muscles (
  code       text primary key,
  name_es    text not null,
  name_en    text not null,
  region     text not null check (region in ('tren_superior', 'core', 'tren_inferior')),
  level      text not null check (level in ('grupo', 'musculo', 'porcion')),
  parent     text references public.muscles(code) on delete restrict,
  -- Clave gruesa para contar volumen semanal (coincide con los músculos del dataset).
  volume_key text not null
);
create index if not exists muscles_parent_idx on public.muscles (parent);

-- ---------- Patrones de movimiento ----------
create table if not exists public.movement_patterns (
  code    text primary key,
  name_es text not null,
  name_en text not null
);

-- ---------- Ficha avanzada de cada ejercicio ----------
alter table public.exercises
  add column if not exists movement_pattern text references public.movement_patterns(code),
  add column if not exists muscle_function  text,
  add column if not exists common_errors    text[] not null default '{}',
  add column if not exists variants         text[] not null default '{}',
  add column if not exists precautions      text[] not null default '{}',
  add column if not exists safety_notes     text[] not null default '{}',
  add column if not exists rep_range_min    smallint,
  add column if not exists rep_range_max    smallint,
  -- Equipo exigido cuando la regla general (columna equipment) no alcanza.
  add column if not exists required_gear    text[],
  -- 'verificado' = ficha curada a mano; 'pendiente_revision' = solo datos del dataset o deducidos.
  add column if not exists review_status    text not null default 'pendiente_revision',
  add column if not exists source           text not null default 'free-exercise-db',
  -- Copia de los músculos originales del dataset antes de corregirlos con la ficha curada.
  add column if not exists dataset_muscles  jsonb;

do $$
begin
  alter table public.exercises drop constraint if exists exercises_review_status_check;
  alter table public.exercises add constraint exercises_review_status_check
    check (review_status in ('verificado', 'pendiente_revision'));
  alter table public.exercises drop constraint if exists exercises_source_check;
  alter table public.exercises add constraint exercises_source_check
    check (source in ('free-exercise-db', 'dinovance'));
  alter table public.exercises drop constraint if exists exercises_rep_range_check;
  alter table public.exercises add constraint exercises_rep_range_check
    check (rep_range_min is null or (rep_range_min between 1 and 100 and rep_range_max between rep_range_min and 100));
end;
$$;

create index if not exists exercises_pattern_idx on public.exercises (movement_pattern);

-- ---------- Músculos de cada ejercicio (normalizado) ----------
create table if not exists public.exercise_muscles (
  exercise_id text not null references public.exercises(id) on delete cascade,
  muscle_code text not null references public.muscles(code) on delete restrict,
  role        text not null check (role in ('principal', 'secundario')),
  -- Orden dentro del rol: 1 = motor primario.
  position    smallint not null default 1 check (position between 1 and 20),
  -- 'dataset' = traducido del músculo grueso del dataset; 'curado' = revisado a mano.
  source      text not null default 'dataset' check (source in ('dataset', 'curado')),
  primary key (exercise_id, muscle_code)
);
create index if not exists exercise_muscles_muscle_idx on public.exercise_muscles (muscle_code, role);

-- ---------- Seguridad: catálogos de solo lectura ----------
alter table public.muscles           enable row level security;
alter table public.movement_patterns enable row level security;
alter table public.exercise_muscles  enable row level security;

drop policy if exists "catalogo_lectura" on public.muscles;
create policy "catalogo_lectura" on public.muscles for select to authenticated using (true);
drop policy if exists "catalogo_lectura" on public.movement_patterns;
create policy "catalogo_lectura" on public.movement_patterns for select to authenticated using (true);
drop policy if exists "catalogo_lectura" on public.exercise_muscles;
create policy "catalogo_lectura" on public.exercise_muscles for select to authenticated using (true);

-- Vista de consulta: ejercicios con su patrón y músculos por nombre (útil para exportar a CSV).
create or replace view public.exercise_catalog
with (security_invoker = true) as
select
  e.id,
  coalesce(e.name_es, e.name) as nombre_es,
  e.name as nombre_en,
  e.movement_pattern,
  e.mechanic,
  e.equipment,
  e.level,
  e.review_status,
  (select string_agg(m.name_es, ', ' order by em.position)
     from public.exercise_muscles em join public.muscles m on m.code = em.muscle_code
    where em.exercise_id = e.id and em.role = 'principal') as musculos_principales,
  (select string_agg(m.name_es, ', ' order by em.position)
     from public.exercise_muscles em join public.muscles m on m.code = em.muscle_code
    where em.exercise_id = e.id and em.role = 'secundario') as musculos_secundarios
from public.exercises e;

revoke all on public.exercise_catalog from anon;
grant select on public.exercise_catalog to authenticated;

notify pgrst, 'reload schema';
