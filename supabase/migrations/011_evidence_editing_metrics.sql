-- Preguntas nuevas para programar con evidencia (enfoque, fase nutricional, estrés),
-- registro de peso corporal y edición completa de un día de la rutina.
-- Ejecutar en Supabase > SQL Editor (después de la 010). Es seguro ejecutarla más de una vez.

-- ---------- Preguntas nuevas del cuestionario ----------
alter table public.health_profiles
  add column if not exists training_approach text
    check (training_approach is null or training_approach in ('equilibrado', 'alta_intensidad', 'alto_volumen')),
  add column if not exists nutrition_phase text
    check (nutrition_phase is null or nutrition_phase in ('deficit', 'mantenimiento', 'superavit', 'no_se')),
  add column if not exists stress_level text
    check (stress_level is null or stress_level in ('bajo', 'medio', 'alto'));

-- ---------- Peso corporal (una medición por día) ----------
create table if not exists public.body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg   numeric(5,1) not null check (weight_kg between 20 and 400),
  created_at  timestamptz not null default now(),
  unique (user_id, measured_on)
);
create index if not exists body_metrics_user_idx on public.body_metrics (user_id, measured_on desc);

alter table public.body_metrics enable row level security;
drop policy if exists "propio" on public.body_metrics;
create policy "propio" on public.body_metrics
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Reemplazar los ejercicios de un día (agregar, quitar, reordenar, editar) ----------
-- SECURITY INVOKER: RLS valida que el día sea de una rutina propia.
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
    insert into public.routine_exercises
      (day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, notes)
    values (
      p_day_id,
      v_ex ->> 'exercise_id',
      v_pos,
      (v_ex ->> 'sets')::smallint,
      (v_ex ->> 'reps_min')::smallint,
      (v_ex ->> 'reps_max')::smallint,
      (v_ex ->> 'rest_seconds')::smallint,
      nullif(left(v_ex ->> 'notes', 300), '')
    );
  end loop;

  if p_minutes is not null then
    update public.routine_days set estimated_minutes = least(300, greatest(0, p_minutes)) where id = p_day_id;
  end if;
end;
$$;

revoke all on function public.replace_day_exercises(uuid, jsonb, integer) from public, anon;
grant execute on function public.replace_day_exercises(uuid, jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
