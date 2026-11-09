-- Tiempos reales del entrenamiento: cuánto duró cada serie y cuánto descanso se tomó antes de ella.
-- Con esto se sabe cuánto demora cada ejercicio y se puede ajustar la duración de las rutinas.
-- Ejecutar en Supabase > SQL Editor (después de la 006). Es seguro ejecutarla más de una vez.

alter table public.set_logs
  add column if not exists duration_s smallint check (duration_s between 0 and 3600),  -- trabajo de la serie
  add column if not exists rest_s smallint check (rest_s between 0 and 3600);          -- descanso real antes de la serie

create or replace function public.log_workout(p_workout jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_set jsonb;
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
     or jsonb_array_length(coalesce(p_workout -> 'sets', '[]'::jsonb)) > 300 then
    raise exception 'Series no válidas' using errcode = '22023';
  end if;

  insert into public.workout_logs (routine_day_id, started_at, finished_at, session_rpe, guide_rating, notes)
  values (
    (p_workout ->> 'routine_day_id')::uuid,
    v_started,
    v_finished,
    nullif(p_workout ->> 'session_rpe', '')::smallint,
    nullif(p_workout ->> 'guide_rating', '')::smallint,
    nullif(left(p_workout ->> 'notes', 500), '')
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

  -- Tonelaje y series efectivas se calculan aquí (fuente de verdad); el INOL lo envía la app,
  -- porque necesita el e1RM de cada ejercicio.
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

-- Tiempo por ejercicio de cada entrenamiento (trabajo + descanso), solo del usuario que consulta:
-- security_invoker hace que la vista respete el RLS de set_logs y workout_logs.
create or replace view public.exercise_times
with (security_invoker = true) as
select
  s.workout_id,
  w.started_at::date as day,
  s.exercise_id,
  count(*) as sets,
  sum(coalesce(s.duration_s, 0)) as work_s,
  sum(coalesce(s.rest_s, 0)) as rest_s,
  sum(coalesce(s.duration_s, 0) + coalesce(s.rest_s, 0)) as total_s
from public.set_logs s
join public.workout_logs w on w.id = s.workout_id
group by s.workout_id, w.started_at, s.exercise_id;

revoke all on public.exercise_times from anon;
grant select on public.exercise_times to authenticated;

notify pgrst, 'reload schema';
