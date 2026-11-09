-- Calificación 1-10 de cada ejercicio, ejercicios que no le gustan a la persona (y por qué),
-- cambio de un ejercicio dentro de la rutina y tiempo en pausa del entrenamiento.
-- Ejecutar en Supabase > SQL Editor (después de la 007). Es seguro ejecutarla más de una vez.

-- ---------- Calificación de cada ejercicio en un entrenamiento ----------
create table if not exists public.exercise_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id  uuid not null references public.workout_logs(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  rating      smallint not null check (rating between 1 and 10),
  created_at  timestamptz not null default now(),
  unique (workout_id, exercise_id)
);
create index if not exists exercise_ratings_user_idx on public.exercise_ratings (user_id, exercise_id);

alter table public.exercise_ratings enable row level security;
drop policy if exists "propio" on public.exercise_ratings;
create policy "propio" on public.exercise_ratings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_logs w where w.id = workout_id and w.user_id = (select auth.uid()))
  );

-- ---------- Ejercicios que no le gustan (el generador no los vuelve a proponer) ----------
create table if not exists public.exercise_preferences (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  reason      text not null default 'no_me_gusta'
    check (reason in ('no_me_gusta', 'molestia', 'no_hay_maquina', 'muy_dificil')),
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_preferences enable row level security;
drop policy if exists "propio" on public.exercise_preferences;
create policy "propio" on public.exercise_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Tiempo en pausa ----------
alter table public.workout_logs
  add column if not exists paused_s integer check (paused_s between 0 and 43200);

-- ---------- Cambiar un ejercicio en la rutina (misma posición, todos sus días) ----------
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
    notes        = left(p_new ->> 'notes', 300)
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

revoke all on function public.swap_exercise(uuid, text, jsonb, text) from public, anon;
grant execute on function public.swap_exercise(uuid, text, jsonb, text) to authenticated;

-- ---------- log_workout: ahora también guarda la pausa y las calificaciones ----------
create or replace function public.log_workout(p_workout jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_set jsonb;
  v_rating jsonb;
  v_started timestamptz := (p_workout ->> 'started_at')::timestamptz;
  v_finished timestamptz := coalesce((p_workout ->> 'finished_at')::timestamptz, now());
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if v_started is null or v_started > v_finished or v_finished - v_started > interval '12 hours' then
    raise exception 'Fechas no válidas' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_workout -> 'sets', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_workout -> 'sets', '[]'::jsonb)) > 300
     or jsonb_array_length(coalesce(p_workout -> 'ratings', '[]'::jsonb)) > 50 then
    raise exception 'Datos no válidos' using errcode = '22023';
  end if;

  insert into public.workout_logs (routine_day_id, started_at, finished_at, session_rpe, guide_rating, notes, paused_s)
  values (
    (p_workout ->> 'routine_day_id')::uuid,
    v_started,
    v_finished,
    nullif(p_workout ->> 'session_rpe', '')::smallint,
    nullif(p_workout ->> 'guide_rating', '')::smallint,
    nullif(left(p_workout ->> 'notes', 500), ''),
    least(43200, greatest(0, coalesce(nullif(p_workout ->> 'paused_s', '')::int, 0)))
  )
  returning id into v_id;

  for v_set in select value from jsonb_array_elements(coalesce(p_workout -> 'sets', '[]'::jsonb)) loop
    insert into public.set_logs
      (workout_id, exercise_id, set_number, reps, weight_kg, rir, rpe, duration_s, rest_s)
    values (
      v_id,
      v_set ->> 'exercise_id',
      (v_set ->> 'set_number')::smallint,
      nullif(v_set ->> 'reps', '')::smallint,
      nullif(v_set ->> 'weight_kg', '')::numeric,
      nullif(v_set ->> 'rir', '')::smallint,
      -- Escala RPE basada en RIR (Zourdos et al., 2016): RPE = 10 - RIR.
      case when v_set ->> 'rir' is null then null
           else greatest(1, 10 - (v_set ->> 'rir')::smallint) end,
      least(3600, greatest(0, nullif(v_set ->> 'duration_s', '')::int))::smallint,
      least(3600, greatest(0, nullif(v_set ->> 'rest_s', '')::int))::smallint
    );
  end loop;

  for v_rating in select value from jsonb_array_elements(coalesce(p_workout -> 'ratings', '[]'::jsonb)) loop
    insert into public.exercise_ratings (workout_id, exercise_id, rating)
    values (v_id, v_rating ->> 'exercise_id', (v_rating ->> 'rating')::smallint)
    on conflict (workout_id, exercise_id) do update set rating = excluded.rating;
  end loop;

  update public.workout_logs w set
    tonnage_kg = coalesce((select sum(s.reps * s.weight_kg) from public.set_logs s where s.workout_id = v_id), 0),
    effective_sets = (select count(*) from public.set_logs s where s.workout_id = v_id and s.rir <= 3),
    inol = least(20, greatest(0, nullif(p_workout ->> 'inol', '')::numeric))
  where w.id = v_id;

  return v_id;
end;
$$;

revoke all on function public.log_workout(jsonb) from public, anon;
grant execute on function public.log_workout(jsonb) to authenticated;

notify pgrst, 'reload schema';
