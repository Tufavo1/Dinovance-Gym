-- Límites de una rutina también en el servidor (la app ya los aplica, pero así no se pueden saltar):
-- máximo 15 ejercicios por día (12 de fuerza + cardio y estiramientos de la rutina automática).
-- Ejecutar en Supabase > SQL Editor (después de la 009). Es seguro ejecutarla más de una vez.

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
    insert into public.routine_days (routine_id, day_index, name, estimated_minutes)
    values (
      v_routine_id,
      (v_day ->> 'day_index')::smallint,
      left(v_day ->> 'name', 120),
      nullif(v_day ->> 'estimated_minutes', '')::smallint
    )
    returning id into v_day_id;

    v_pos := 0;
    for v_ex in select value from jsonb_array_elements(v_day -> 'exercises') loop
      v_pos := v_pos + 1;
      insert into public.routine_exercises
        (day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, notes)
      values (
        v_day_id,
        v_ex ->> 'exercise_id',
        v_pos,
        (v_ex ->> 'sets')::smallint,
        (v_ex ->> 'reps_min')::smallint,
        (v_ex ->> 'reps_max')::smallint,
        (v_ex ->> 'rest_seconds')::smallint,
        left(v_ex ->> 'notes', 300)
      );
    end loop;
  end loop;

  return v_routine_id;
end;
$$;

revoke all on function public.save_routine(jsonb) from public, anon;
grant execute on function public.save_routine(jsonb) to authenticated;

notify pgrst, 'reload schema';
