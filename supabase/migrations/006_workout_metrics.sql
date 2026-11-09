-- Métricas del entrenamiento guiado: peso, repeticiones y RIR por serie, esfuerzo de la sesión
-- (sRPE) y opinión sobre la guía. Se usan para recomendar el peso y mejorar las rutinas.
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.

alter table public.set_logs
  add column if not exists rir smallint check (rir between 0 and 10);

alter table public.workout_logs
  add column if not exists session_rpe smallint check (session_rpe between 1 and 10),
  add column if not exists guide_rating smallint check (guide_rating between 1 and 5),
  -- Métricas de salida por entrenamiento (para gráficos de progreso):
  add column if not exists tonnage_kg numeric(10,1) check (tonnage_kg >= 0),       -- Σ reps × peso
  add column if not exists effective_sets smallint check (effective_sets >= 0),    -- series con RIR ≤ 3
  add column if not exists inol numeric(4,2) check (inol between 0 and 20);        -- INOL promedio por ejercicio

do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('set_logs', 'set_logs_ranges_check',
       'set_number between 1 and 20 and (reps is null or reps <= 200) and (weight_kg is null or weight_kg <= 1000)')
    ) as t(tbl, name, expr)
  loop
    execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table public.%I add constraint %I check (%s)', c.tbl, c.name, c.expr);
  end loop;
end;
$$;

-- Historial por ejercicio (para recomendar el peso de la próxima vez).
create index if not exists set_logs_exercise_idx on public.set_logs (exercise_id, created_at desc);

-- ---------- Guardar un entrenamiento completo (todo o nada) ----------
-- SECURITY INVOKER: las políticas RLS validan que el día pertenezca a una rutina propia.
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
    insert into public.set_logs (workout_id, exercise_id, set_number, reps, weight_kg, rir, rpe)
    values (
      v_id,
      v_set ->> 'exercise_id',
      (v_set ->> 'set_number')::smallint,
      nullif(v_set ->> 'reps', '')::smallint,
      nullif(v_set ->> 'weight_kg', '')::numeric,
      nullif(v_set ->> 'rir', '')::smallint,
      -- Escala RPE basada en RIR (Zourdos et al., 2016): RPE = 10 - RIR.
      case when v_set ->> 'rir' is null then null
           else greatest(1, 10 - (v_set ->> 'rir')::smallint) end
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

notify pgrst, 'reload schema';
