-- Rutinas guardadas de forma atómica, una sola rutina activa por usuario, registro de días
-- entrenados y límites de tamaño en los textos libres.
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.

-- ---------- Una sola rutina activa por usuario ----------
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc) as rn
  from public.routines
  where is_active
)
update public.routines set is_active = false where id in (select id from ranked where rn > 1);

create unique index if not exists routines_one_active_per_user
  on public.routines (user_id) where is_active;

-- ---------- Duración estimada por día ----------
alter table public.routine_days
  add column if not exists estimated_minutes smallint
  check (estimated_minutes between 0 and 300);

-- ---------- Límites de tamaño (evita abusos y textos gigantes) ----------
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('routines',          'routines_name_len',            'char_length(name) <= 120'),
      ('routines',          'routines_notes_len',           'notes is null or char_length(notes) <= 4000'),
      ('routine_days',      'routine_days_name_len',        'char_length(name) <= 120'),
      ('routine_exercises', 'routine_exercises_notes_len',  'notes is null or char_length(notes) <= 300'),
      ('routine_exercises', 'routine_exercises_reps_check', 'reps_min between 1 and 100 and reps_max between reps_min and 100'),
      ('routine_exercises', 'routine_exercises_rest_check', 'rest_seconds between 0 and 600'),
      ('health_profiles',   'health_goal_detail_len',       'goal_detail is null or char_length(goal_detail) <= 500'),
      ('health_profiles',   'health_medical_notes_len',     'medical_notes is null or char_length(medical_notes) <= 1000'),
      ('health_profiles',   'health_styles_other_len',      'training_styles_other is null or char_length(training_styles_other) <= 100'),
      ('injury_records',    'injury_description_len',       'description is null or char_length(description) <= 300'),
      ('workout_logs',      'workout_notes_len',            'notes is null or char_length(notes) <= 500'),
      ('workout_logs',      'workout_dates_check',          'finished_at is null or finished_at >= started_at')
    ) as t(tbl, name, expr)
  loop
    execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table public.%I add constraint %I check (%s)', c.tbl, c.name, c.expr);
  end loop;
end;
$$;

create index if not exists workout_logs_day_idx on public.workout_logs (routine_day_id);

-- ---------- workout_logs: solo se puede registrar sobre días de rutinas propias ----------
drop policy if exists "propio" on public.workout_logs;
create policy "propio" on public.workout_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      routine_day_id is null
      or exists (
        select 1 from public.routine_days d
        join public.routines r on r.id = d.routine_id
        where d.id = routine_day_id and r.user_id = (select auth.uid())
      )
    )
  );

-- ---------- Guardar una rutina generada (todo o nada) ----------
-- SECURITY INVOKER: corre con los permisos de quien llama, así que RLS sigue aplicando.
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

-- ---------- Activar una rutina guardada ----------
create or replace function public.activate_routine(p_routine_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if not exists (select 1 from public.routines where id = p_routine_id and user_id = auth.uid()) then
    raise exception 'Rutina no encontrada' using errcode = 'P0002';
  end if;
  update public.routines set is_active = false
    where user_id = auth.uid() and is_active and id <> p_routine_id;
  update public.routines set is_active = true where id = p_routine_id;
end;
$$;

-- Solo usuarios con sesión pueden llamarlas (nunca anon).
revoke all on function public.save_routine(jsonb) from public, anon;
revoke all on function public.activate_routine(uuid) from public, anon;
grant execute on function public.save_routine(jsonb) to authenticated;
grant execute on function public.activate_routine(uuid) to authenticated;

notify pgrst, 'reload schema';
