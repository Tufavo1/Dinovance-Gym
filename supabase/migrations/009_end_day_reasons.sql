-- Terminar el día antes de tiempo: motivos, avance real y ejercicios saltados.
-- Sirve para detectar qué mejorar (rutinas muy largas, ejercicios que molestan, falta de equipo...).
-- Ejecutar en Supabase > SQL Editor (después de la 008). Es seguro ejecutarla más de una vez.

alter table public.workout_logs
  add column if not exists ended_early boolean not null default false,
  add column if not exists end_reasons text[] not null default '{}',
  add column if not exists end_note text,
  add column if not exists exercises_planned smallint check (exercises_planned between 0 and 50),
  add column if not exists exercises_done smallint check (exercises_done between 0 and 50),
  add column if not exists skipped_exercises text[] not null default '{}';

alter table public.workout_logs drop constraint if exists workout_end_reasons_check;
alter table public.workout_logs add constraint workout_end_reasons_check
  check (
    end_reasons <@ array[
      'cansancio', 'sin_tiempo', 'dolor', 'sin_equipo', 'muy_dificil', 'muy_facil', 'no_entendi', 'otro'
    ]::text[]
    and (end_note is null or char_length(end_note) <= 300)
    and cardinality(skipped_exercises) <= 50
  );

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

  insert into public.workout_logs (
    routine_day_id, started_at, finished_at, session_rpe, guide_rating, notes, paused_s,
    ended_early, end_reasons, end_note, exercises_planned, exercises_done, skipped_exercises
  )
  values (
    (p_workout ->> 'routine_day_id')::uuid,
    v_started,
    v_finished,
    nullif(p_workout ->> 'session_rpe', '')::smallint,
    nullif(p_workout ->> 'guide_rating', '')::smallint,
    nullif(left(p_workout ->> 'notes', 500), ''),
    least(43200, greatest(0, coalesce(nullif(p_workout ->> 'paused_s', '')::int, 0))),
    coalesce((p_workout ->> 'ended_early')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(p_workout -> 'end_reasons')), '{}'),
    nullif(left(p_workout ->> 'end_note', 300), ''),
    nullif(p_workout ->> 'exercises_planned', '')::smallint,
    nullif(p_workout ->> 'exercises_done', '')::smallint,
    coalesce(array(select jsonb_array_elements_text(p_workout -> 'skipped_exercises')), '{}')
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

-- Motivos para terminar antes, por usuario (cada persona ve solo los suyos gracias a RLS).
-- Para analizar a todos los usuarios, consultar como administrador desde el SQL Editor.
create or replace view public.end_reason_stats
with (security_invoker = true) as
select
  w.user_id,
  r.reason,
  count(*) as times,
  round(avg(w.exercises_done::numeric / nullif(w.exercises_planned, 0)) * 100) as avg_completion_pct
from public.workout_logs w
cross join lateral unnest(w.end_reasons) as r(reason)
where w.ended_early
group by w.user_id, r.reason;

revoke all on public.end_reason_stats from anon;
grant select on public.end_reason_stats to authenticated;

notify pgrst, 'reload schema';
