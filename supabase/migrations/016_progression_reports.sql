-- Progresión de cargas, informes semanales, metas y mediciones corporales.
-- Además: cada ejercicio de la rutina guarda su RIR objetivo, tempo y la justificación de por qué
-- se eligió; cada día guarda su objetivo.
-- Es seguro ejecutarla más de una vez. Reversa: migrations/down/016_progression_reports.down.sql

-- ---------- Rutinas: objetivo de la sesión y justificación de cada ejercicio ----------
alter table public.routine_days
  add column if not exists objective text check (objective is null or char_length(objective) <= 300);

alter table public.routine_exercises
  add column if not exists rir_min   smallint check (rir_min is null or rir_min between 0 and 6),
  add column if not exists rir_max   smallint,
  add column if not exists tempo     text check (tempo is null or char_length(tempo) <= 20),
  add column if not exists rationale text check (rationale is null or char_length(rationale) <= 600);

alter table public.routine_exercises drop constraint if exists routine_exercises_rir_check;
alter table public.routine_exercises add constraint routine_exercises_rir_check
  check (rir_max is null or (rir_min is not null and rir_max between rir_min and 6));

alter table public.routines
  add column if not exists shared_from    uuid references auth.users(id) on delete set null,
  add column if not exists shared_by_name text check (shared_by_name is null or char_length(shared_by_name) <= 120);

-- ---------- Recomendaciones de carga (la persona las acepta o rechaza; nunca se aplican solas) ----------
create table if not exists public.load_recommendations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id     text not null references public.exercises(id) on delete cascade,
  week_start      date not null,
  action          text not null check (action in ('subir', 'mantener', 'bajar', 'progresar_reps', 'sin_datos')),
  current_value   numeric(7,2),
  suggested_value numeric(7,2),
  load_unit       text not null default 'kg' check (load_unit in ('kg', 'lb', 'nivel', 'placas', 'otro')),
  reason          text not null check (char_length(reason) <= 600),
  -- Datos concretos en los que se basó (series, repeticiones, RIR, regla aplicada).
  evidence        jsonb not null default '{}'::jsonb check (pg_column_size(evidence) < 8000),
  status          text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'rechazada')),
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, exercise_id, week_start)
);
create index if not exists load_recommendations_user_idx on public.load_recommendations (user_id, week_start desc);

alter table public.load_recommendations enable row level security;
drop policy if exists "propio" on public.load_recommendations;
create policy "propio" on public.load_recommendations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Informe semanal (uno por persona y semana; calculado solo con registros reales) ----------
create table if not exists public.weekly_reports (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start   date not null,
  report       jsonb not null check (jsonb_typeof(report) = 'object' and pg_column_size(report) < 60000),
  generated_at timestamptz not null default now(),
  primary key (user_id, week_start),
  -- Las semanas empiezan en lunes.
  constraint weekly_reports_monday_check check (extract(isodow from week_start) = 1)
);

alter table public.weekly_reports enable row level security;
drop policy if exists "propio" on public.weekly_reports;
create policy "propio" on public.weekly_reports
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Metas con seguimiento ----------
create table if not exists public.fitness_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('peso_corporal', 'carga_ejercicio', 'repeticiones_ejercicio', 'entrenos_semana', 'medida')),
  exercise_id  text references public.exercises(id) on delete cascade,
  measure_kind text,
  title        text not null check (char_length(title) between 1 and 120),
  start_value  numeric(8,2),
  target_value numeric(8,2) not null,
  unit         text not null default 'kg' check (char_length(unit) <= 20),
  start_date   date not null default current_date,
  target_date  date,
  status       text not null default 'en_curso' check (status in ('en_curso', 'lograda', 'abandonada')),
  achieved_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint fitness_goals_exercise_check
    check ((kind in ('carga_ejercicio', 'repeticiones_ejercicio')) = (exercise_id is not null)),
  constraint fitness_goals_dates_check check (target_date is null or target_date >= start_date)
);
create index if not exists fitness_goals_user_idx on public.fitness_goals (user_id, status);

alter table public.fitness_goals enable row level security;
drop policy if exists "propio" on public.fitness_goals;
create policy "propio" on public.fitness_goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Mediciones corporales (una por día y tipo) ----------
create table if not exists public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  kind        text not null check (kind in ('cintura', 'cadera', 'pecho', 'brazo', 'muslo', 'pantorrilla', 'cuello', 'grasa_pct', 'masa_muscular_kg')),
  value       numeric(6,2) not null check (value > 0 and value <= 400),
  created_at  timestamptz not null default now(),
  unique (user_id, measured_on, kind),
  constraint body_measurements_pct_check check (kind <> 'grasa_pct' or value <= 75)
);
create index if not exists body_measurements_user_idx on public.body_measurements (user_id, kind, measured_on desc);

alter table public.body_measurements enable row level security;
drop policy if exists "propio" on public.body_measurements;
create policy "propio" on public.body_measurements
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Rutinas: las funciones guardan también objetivo, RIR, tempo y justificación ----------
create or replace function public.insert_routine_exercise(p_day_id uuid, p_pos int, p_ex jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.routine_exercises
    (day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, notes, rir_min, rir_max, tempo, rationale)
  values (
    p_day_id,
    p_ex ->> 'exercise_id',
    p_pos,
    (p_ex ->> 'sets')::smallint,
    (p_ex ->> 'reps_min')::smallint,
    (p_ex ->> 'reps_max')::smallint,
    (p_ex ->> 'rest_seconds')::smallint,
    nullif(left(p_ex ->> 'notes', 300), ''),
    nullif(p_ex ->> 'rir_min', '')::smallint,
    nullif(p_ex ->> 'rir_max', '')::smallint,
    nullif(left(p_ex ->> 'tempo', 20), ''),
    nullif(left(p_ex ->> 'rationale', 600), '')
  );
end;
$$;
revoke all on function public.insert_routine_exercise(uuid, int, jsonb) from public, anon;
grant execute on function public.insert_routine_exercise(uuid, int, jsonb) to authenticated;

create or replace function public.save_routine(p_routine jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_routine_id uuid;
  v_day jsonb;
  v_day_id uuid;
  v_ex jsonb;
  v_pos int;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if jsonb_typeof(p_routine -> 'days') <> 'array'
     or jsonb_array_length(p_routine -> 'days') not between 1 and 7 then
    raise exception 'La rutina debe tener entre 1 y 7 días' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_routine -> 'days') d
    where jsonb_typeof(d -> 'exercises') <> 'array' or jsonb_array_length(d -> 'exercises') > 15
  ) then
    raise exception 'Cada día puede tener como máximo 15 ejercicios' using errcode = '22023';
  end if;

  -- Primero se desactiva la rutina actual (índice único: una activa por usuario).
  update public.routines set is_active = false where user_id = auth.uid() and is_active;

  insert into public.routines (name, goal, days_per_week, place, notes, is_active)
  values (
    left(p_routine ->> 'name', 120),
    p_routine ->> 'goal',
    (p_routine ->> 'days_per_week')::smallint,
    p_routine ->> 'place',
    left(p_routine ->> 'notes', 4000),
    true
  )
  returning id into v_routine_id;

  for v_day in select value from jsonb_array_elements(p_routine -> 'days') loop
    insert into public.routine_days (routine_id, day_index, name, estimated_minutes, objective)
    values (
      v_routine_id,
      (v_day ->> 'day_index')::smallint,
      left(v_day ->> 'name', 120),
      nullif(v_day ->> 'estimated_minutes', '')::smallint,
      nullif(left(v_day ->> 'objective', 300), '')
    )
    returning id into v_day_id;

    v_pos := 0;
    for v_ex in select value from jsonb_array_elements(v_day -> 'exercises') loop
      v_pos := v_pos + 1;
      perform public.insert_routine_exercise(v_day_id, v_pos, v_ex);
    end loop;
  end loop;

  return v_routine_id;
end;
$$;

create or replace function public.replace_day_exercises(
  p_day_id uuid,
  p_exercises jsonb,
  p_minutes integer default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ex jsonb;
  v_pos int := 0;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.routine_days d
    join public.routines r on r.id = d.routine_id
    where d.id = p_day_id and r.user_id = auth.uid()
  ) then
    raise exception 'Día no encontrado' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) > 15 then
    raise exception 'Cada día puede tener como máximo 15 ejercicios' using errcode = '22023';
  end if;

  delete from public.routine_exercises where day_id = p_day_id;

  for v_ex in select value from jsonb_array_elements(p_exercises) loop
    v_pos := v_pos + 1;
    perform public.insert_routine_exercise(p_day_id, v_pos, v_ex);
  end loop;

  if p_minutes is not null then
    update public.routine_days set estimated_minutes = least(300, greatest(0, p_minutes)) where id = p_day_id;
  end if;
end;
$$;

create or replace function public.swap_exercise(
  p_routine_id uuid,
  p_old_exercise text,
  p_new jsonb,
  p_reason text default 'no_me_gusta'
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if not exists (select 1 from public.routines where id = p_routine_id and user_id = auth.uid()) then
    raise exception 'Rutina no encontrada' using errcode = 'P0002';
  end if;
  if (p_new ->> 'exercise_id') = p_old_exercise then
    raise exception 'Es el mismo ejercicio' using errcode = '22023';
  end if;

  update public.routine_exercises re set
    exercise_id  = p_new ->> 'exercise_id',
    sets         = (p_new ->> 'sets')::smallint,
    reps_min     = (p_new ->> 'reps_min')::smallint,
    reps_max     = (p_new ->> 'reps_max')::smallint,
    rest_seconds = (p_new ->> 'rest_seconds')::smallint,
    notes        = nullif(left(p_new ->> 'notes', 300), ''),
    rir_min      = nullif(p_new ->> 'rir_min', '')::smallint,
    rir_max      = nullif(p_new ->> 'rir_max', '')::smallint,
    tempo        = nullif(left(p_new ->> 'tempo', 20), ''),
    rationale    = nullif(left(p_new ->> 'rationale', 600), '')
  from public.routine_days d
  where re.day_id = d.id
    and d.routine_id = p_routine_id
    and re.exercise_id = p_old_exercise;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'El ejercicio no está en la rutina' using errcode = 'P0002';
  end if;

  insert into public.exercise_preferences (exercise_id, reason)
  values (p_old_exercise, coalesce(p_reason, 'no_me_gusta'))
  on conflict (user_id, exercise_id) do update set reason = excluded.reason, created_at = now();

  return v_count;
end;
$$;

revoke all on function public.save_routine(jsonb) from public, anon;
grant execute on function public.save_routine(jsonb) to authenticated;
revoke all on function public.replace_day_exercises(uuid, jsonb, integer) from public, anon;
grant execute on function public.replace_day_exercises(uuid, jsonb, integer) to authenticated;
revoke all on function public.swap_exercise(uuid, text, jsonb, text) from public, anon;
grant execute on function public.swap_exercise(uuid, text, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
