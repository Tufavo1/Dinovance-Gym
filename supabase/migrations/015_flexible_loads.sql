-- Cargas flexibles: cualquier peso (con decimales), libras, niveles de máquina, placas numeradas
-- u otra unidad; peso por lado, peso corporal, lastre y asistencia. Configuración por persona y
-- ejercicio. También: recuperación/fatiga/molestias declaradas e idempotencia del guardado.
-- Regla: lo que la persona registra NUNCA se convierte ni se corrige. Solo kg y lb tienen
-- equivalencia real en kilos; niveles y placas se guardan tal cual, sin inventar kilos.
-- Es seguro ejecutarla más de una vez. Reversa: migrations/down/015_flexible_loads.down.sql

-- ---------- Configuración de carga por persona y ejercicio (máquina) ----------
create table if not exists public.exercise_load_settings (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id   text not null references public.exercises(id) on delete cascade,
  load_unit     text not null default 'kg' check (load_unit in ('kg', 'lb', 'nivel', 'placas', 'otro')),
  unit_label    text check (unit_label is null or char_length(unit_label) between 1 and 20),
  load_kind     text not null default 'total' check (load_kind in ('total', 'por_lado', 'corporal', 'lastre', 'asistido')),
  -- Salto mínimo disponible (2,5 kg, 1 nivel, 1 placa…). Null = sin definir.
  min_increment numeric(6,2) check (min_increment is null or (min_increment > 0 and min_increment <= 100)),
  -- Tope inferior y superior de la máquina (por ejemplo niveles 1 a 8). Null = sin definir.
  scale_min     numeric(7,2) check (scale_min is null or scale_min >= 0),
  scale_max     numeric(7,2),
  -- Carga inicial elegida por la persona. Null = sin definir (la app no la inventa).
  start_load    numeric(7,2) check (start_load is null or (start_load >= 0 and start_load <= 2000)),
  machine_name  text check (machine_name is null or char_length(machine_name) <= 60),
  notes         text check (notes is null or char_length(notes) <= 300),
  updated_at    timestamptz not null default now(),
  primary key (user_id, exercise_id),
  constraint load_settings_scale_check check (scale_max is null or scale_min is null or scale_max > scale_min)
);

drop trigger if exists exercise_load_settings_updated_at on public.exercise_load_settings;
create trigger exercise_load_settings_updated_at
  before update on public.exercise_load_settings
  for each row execute function public.set_updated_at();

alter table public.exercise_load_settings enable row level security;
drop policy if exists "propio" on public.exercise_load_settings;
create policy "propio" on public.exercise_load_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Series: carga en su unidad original ----------
alter table public.set_logs
  add column if not exists load_value    numeric(7,2) check (load_value is null or (load_value >= 0 and load_value <= 2000)),
  add column if not exists load_unit     text not null default 'kg',
  add column if not exists unit_label    text check (unit_label is null or char_length(unit_label) <= 20),
  add column if not exists load_kind     text not null default 'total',
  add column if not exists bodyweight_kg numeric(5,1) check (bodyweight_kg is null or bodyweight_kg between 20 and 400),
  add column if not exists note          text check (note is null or char_length(note) <= 200);

do $$
begin
  alter table public.set_logs drop constraint if exists set_logs_load_unit_check;
  alter table public.set_logs add constraint set_logs_load_unit_check
    check (load_unit in ('kg', 'lb', 'nivel', 'placas', 'otro'));
  alter table public.set_logs drop constraint if exists set_logs_load_kind_check;
  alter table public.set_logs add constraint set_logs_load_kind_check
    check (load_kind in ('total', 'por_lado', 'corporal', 'lastre', 'asistido'));
  -- weight_kg solo existe cuando la unidad tiene equivalencia real en kilos.
  alter table public.set_logs drop constraint if exists set_logs_kg_equivalence_check;
  alter table public.set_logs add constraint set_logs_kg_equivalence_check
    check (weight_kg is null or load_unit in ('kg', 'lb'));
end;
$$;

-- Historial anterior: todo estaba en kg. Se copia tal cual, sin tocar weight_kg.
update public.set_logs set load_value = weight_kg where load_value is null and weight_kg is not null;

-- ---------- Entrenamientos: estado declarado e idempotencia ----------
alter table public.workout_logs
  add column if not exists client_id        uuid,
  add column if not exists readiness        smallint check (readiness is null or readiness between 1 and 5),
  add column if not exists fatigue          smallint check (fatigue is null or fatigue between 1 and 5),
  add column if not exists discomfort_areas text[] not null default '{}',
  add column if not exists discomfort_note  text check (discomfort_note is null or char_length(discomfort_note) <= 300),
  add column if not exists source           text not null default 'app';

do $$
begin
  alter table public.workout_logs drop constraint if exists workout_logs_source_check;
  alter table public.workout_logs add constraint workout_logs_source_check check (source in ('app', 'importado'));
  alter table public.workout_logs drop constraint if exists workout_logs_discomfort_check;
  alter table public.workout_logs add constraint workout_logs_discomfort_check
    check (cardinality(discomfort_areas) <= 11 and discomfort_areas <@ array[
      'cuello', 'hombro', 'codo', 'muneca', 'pecho', 'espalda_alta', 'espalda_baja', 'abdomen', 'cadera', 'rodilla', 'tobillo'
    ]::text[]);
end;
$$;

-- Un mismo entrenamiento (mismo client_id) no se guarda dos veces: reintentos sin conexión e importaciones.
create unique index if not exists workout_logs_client_idx
  on public.workout_logs (user_id, client_id) where client_id is not null;

-- ---------- log_workout: unidades, RPE, estado declarado e idempotencia ----------
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
  v_client uuid := nullif(p_workout ->> 'client_id', '')::uuid;
  v_started timestamptz := (p_workout ->> 'started_at')::timestamptz;
  v_finished timestamptz := coalesce((p_workout ->> 'finished_at')::timestamptz, now());
  v_unit text;
  v_kind text;
  v_value numeric;
  v_kg numeric;
  v_rir smallint;
  v_rpe numeric;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if v_started is null or v_started > v_finished or v_finished - v_started > interval '12 hours' then
    raise exception 'Fechas no válidas' using errcode = '22023';
  end if;
  if v_started > now() + interval '1 day' then
    raise exception 'La fecha del entrenamiento está en el futuro' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_workout -> 'sets', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_workout -> 'sets', '[]'::jsonb)) > 300
     or jsonb_array_length(coalesce(p_workout -> 'ratings', '[]'::jsonb)) > 50 then
    raise exception 'Datos no válidos' using errcode = '22023';
  end if;

  -- Idempotencia: si este entrenamiento ya se guardó, se devuelve el mismo id sin duplicar nada.
  if v_client is not null then
    select id into v_id from public.workout_logs where user_id = auth.uid() and client_id = v_client;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.workout_logs (
    routine_day_id, started_at, finished_at, session_rpe, guide_rating, notes, paused_s,
    ended_early, end_reasons, end_note, exercises_planned, exercises_done, skipped_exercises,
    client_id, readiness, fatigue, discomfort_areas, discomfort_note, source
  )
  values (
    nullif(p_workout ->> 'routine_day_id', '')::uuid,
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
    coalesce(array(select jsonb_array_elements_text(p_workout -> 'skipped_exercises')), '{}'),
    v_client,
    nullif(p_workout ->> 'readiness', '')::smallint,
    nullif(p_workout ->> 'fatigue', '')::smallint,
    coalesce(array(select jsonb_array_elements_text(p_workout -> 'discomfort_areas')), '{}'),
    nullif(left(p_workout ->> 'discomfort_note', 300), ''),
    case when p_workout ->> 'source' = 'importado' then 'importado' else 'app' end
  )
  returning id into v_id;

  for v_set in select value from jsonb_array_elements(coalesce(p_workout -> 'sets', '[]'::jsonb)) loop
    v_unit := coalesce(nullif(v_set ->> 'load_unit', ''), 'kg');
    v_kind := coalesce(nullif(v_set ->> 'load_kind', ''), 'total');
    -- Compatibilidad: las versiones anteriores de la app solo envían weight_kg.
    v_value := coalesce(nullif(v_set ->> 'load_value', '')::numeric, nullif(v_set ->> 'weight_kg', '')::numeric);
    if v_unit not in ('kg', 'lb', 'nivel', 'placas', 'otro') then
      raise exception 'Unidad de carga no válida: %', v_unit using errcode = '22023';
    end if;
    if v_kind not in ('total', 'por_lado', 'corporal', 'lastre', 'asistido') then
      raise exception 'Tipo de carga no válido: %', v_kind using errcode = '22023';
    end if;
    -- Solo kg y lb tienen equivalencia en kilos. Un nivel o una placa NO se convierte.
    v_kg := case v_unit when 'kg' then v_value when 'lb' then round(v_value * 0.45359237, 2) else null end;
    v_rir := nullif(v_set ->> 'rir', '')::smallint;
    -- Escala RPE basada en RIR (Zourdos et al., 2016): RPE = 10 - RIR. Si la persona dio RPE, se respeta.
    v_rpe := coalesce(nullif(v_set ->> 'rpe', '')::numeric, case when v_rir is null then null else greatest(1, 10 - v_rir) end);

    insert into public.set_logs
      (workout_id, exercise_id, set_number, reps, weight_kg, rir, rpe, duration_s, rest_s,
       load_value, load_unit, unit_label, load_kind, bodyweight_kg, note)
    values (
      v_id,
      v_set ->> 'exercise_id',
      (v_set ->> 'set_number')::smallint,
      nullif(v_set ->> 'reps', '')::smallint,
      v_kg,
      v_rir,
      v_rpe,
      least(3600, greatest(0, nullif(v_set ->> 'duration_s', '')::int))::smallint,
      least(3600, greatest(0, nullif(v_set ->> 'rest_s', '')::int))::smallint,
      v_value,
      v_unit,
      nullif(left(v_set ->> 'unit_label', 20), ''),
      v_kind,
      nullif(v_set ->> 'bodyweight_kg', '')::numeric,
      nullif(left(v_set ->> 'note', 200), '')
    );
  end loop;

  for v_rating in select value from jsonb_array_elements(coalesce(p_workout -> 'ratings', '[]'::jsonb)) loop
    insert into public.exercise_ratings (workout_id, exercise_id, rating)
    values (v_id, v_rating ->> 'exercise_id', (v_rating ->> 'rating')::smallint)
    on conflict (workout_id, exercise_id) do update set rating = excluded.rating;
  end loop;

  -- Tonelaje: solo series con equivalencia real en kilos (kg o lb). Las de nivel/placa no suman.
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

-- ---------- Historial de series con la fecha REAL de la sesión ----------
-- set_logs.created_at es el momento en que se guardó la fila (en una importación, el día en que se
-- importó). Para ordenar la progresión se usa siempre la fecha del entrenamiento.
-- security_invoker: la vista respeta el RLS de set_logs y workout_logs (cada quien ve lo suyo).
create or replace view public.set_history
with (security_invoker = true) as
select
  s.id,
  s.workout_id,
  w.started_at,
  s.exercise_id,
  s.set_number,
  s.reps,
  s.load_value,
  s.load_unit,
  s.load_kind,
  s.weight_kg,
  s.rir
from public.set_logs s
join public.workout_logs w on w.id = s.workout_id
where w.finished_at is not null;

revoke all on public.set_history from anon;
grant select on public.set_history to authenticated;

notify pgrst, 'reload schema';
