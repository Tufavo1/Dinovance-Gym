-- =====================================================================
-- Dinovance Gym - Esquema Supabase
-- Pegar completo en: Supabase > SQL Editor > New query > Run
-- Es idempotente en lo posible, pero está pensado para una base nueva.
-- =====================================================================

-- ---------- Utilidad: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Catálogos de zonas corporales ----------
create table public.body_areas (
  code     text primary key,
  label_es text not null
);

insert into public.body_areas (code, label_es) values
  ('cuello',       'Cuello'),
  ('hombro',       'Hombro'),
  ('codo',         'Codo'),
  ('muneca',       'Muñeca'),
  ('pecho',        'Pecho'),
  ('espalda_alta', 'Espalda alta'),
  ('espalda_baja', 'Espalda baja / lumbar'),
  ('abdomen',      'Abdomen'),
  ('cadera',       'Cadera'),
  ('rodilla',      'Rodilla'),
  ('tobillo',      'Tobillo');

-- Qué músculos del dataset cargan cada zona (base para filtrar ejercicios).
create table public.area_muscles (
  area   text not null references public.body_areas(code) on delete cascade,
  muscle text not null,
  risk   text not null check (risk in ('alto', 'medio')),
  primary key (area, muscle)
);

insert into public.area_muscles (area, muscle, risk) values
  ('cuello',       'neck',        'alto'),
  ('cuello',       'traps',       'medio'),
  ('hombro',       'shoulders',   'alto'),
  ('hombro',       'chest',       'medio'),
  ('hombro',       'lats',        'medio'),
  ('hombro',       'traps',       'medio'),
  ('hombro',       'triceps',     'medio'),
  ('codo',         'biceps',      'alto'),
  ('codo',         'triceps',     'alto'),
  ('codo',         'forearms',    'medio'),
  ('muneca',       'forearms',    'alto'),
  ('muneca',       'biceps',      'medio'),
  ('muneca',       'triceps',     'medio'),
  ('pecho',        'chest',       'alto'),
  ('espalda_alta', 'middle back', 'alto'),
  ('espalda_alta', 'lats',        'alto'),
  ('espalda_alta', 'traps',       'medio'),
  ('espalda_baja', 'lower back',  'alto'),
  ('espalda_baja', 'hamstrings',  'medio'),
  ('espalda_baja', 'glutes',      'medio'),
  ('espalda_baja', 'abdominals',  'medio'),
  ('abdomen',      'abdominals',  'alto'),
  ('cadera',       'glutes',      'alto'),
  ('cadera',       'abductors',   'alto'),
  ('cadera',       'adductors',   'alto'),
  ('cadera',       'hamstrings',  'medio'),
  ('cadera',       'quadriceps',  'medio'),
  ('rodilla',      'quadriceps',  'alto'),
  ('rodilla',      'hamstrings',  'medio'),
  ('rodilla',      'calves',      'medio'),
  ('tobillo',      'calves',      'alto');

-- ---------- Ejercicios (importados de free-exercise-db) ----------
create table public.exercises (
  id                text primary key,
  name              text not null,
  name_es           text,
  category          text,
  level             text,
  force_type        text,
  mechanic          text,
  equipment         text,
  primary_muscles   text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions      text[] not null default '{}',
  instructions_es   text[] not null default '{}',
  images            text[] not null default '{}',
  created_at        timestamptz not null default now()
);

create index exercises_level_idx     on public.exercises (level);
create index exercises_equipment_idx on public.exercises (equipment);
create index exercises_primary_gin   on public.exercises using gin (primary_muscles);

-- Ajustes manuales por ejercicio (más allá del mapeo por músculo).
create table public.exercise_contraindications (
  exercise_id text not null references public.exercises(id) on delete cascade,
  body_area   text not null references public.body_areas(code) on delete cascade,
  severity    text not null check (severity in ('evitar', 'precaucion')),
  reason      text,
  primary key (exercise_id, body_area)
);

-- ---------- Perfil del usuario ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  birth_date date,
  gender     text check (gender in ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
  weight_kg  numeric(5,2) check (weight_kg between 20 and 400),
  height_cm  numeric(5,1) check (height_cm between 80 and 250),
  country    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil al registrarse, leyendo los datos enviados en signUp(options.data).
-- Si algún dato viene mal formado, igualmente se crea el perfil (vacío) para no bloquear el registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.profiles (id, full_name, phone, birth_date, gender, weight_kg, height_cm, country)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
      nullif(new.raw_user_meta_data ->> 'gender', ''),
      nullif(new.raw_user_meta_data ->> 'weight_kg', '')::numeric,
      nullif(new.raw_user_meta_data ->> 'height_cm', '')::numeric,
      nullif(new.raw_user_meta_data ->> 'country', '')
    );
  exception when others then
    insert into public.profiles (id) values (new.id);
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Datos de salud y objetivos (tabla separada, más sensible) ----------
create table public.health_profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  experience            text check (experience in ('nunca', 'principiante', 'intermedio', 'avanzado')),
  days_per_week         smallint check (days_per_week between 1 and 7),
  session_minutes       smallint check (session_minutes between 10 and 180),
  places                text[] not null default '{}',   -- smartfit, plaza, casa, otro_gimnasio
  goal                  text check (goal in ('perder_grasa', 'ganar_musculo', 'fuerza', 'tonificar', 'resistencia', 'salud_general', 'postura', 'movilidad', 'deporte', 'retomar')),
  secondary_goals       text[] not null default '{}'
    check (secondary_goals <@ array['perder_grasa', 'ganar_musculo', 'fuerza', 'tonificar', 'resistencia', 'salud_general', 'postura', 'movilidad', 'deporte', 'retomar']::text[]),
  focus_areas           text[] not null default '{}'
    check (focus_areas <@ array['pecho', 'espalda', 'hombros', 'brazos', 'abdomen', 'gluteos', 'piernas']::text[]),
  goal_detail           text,
  sports                text[] not null default '{}',   -- deportes que le gustaría practicar
  training_styles       text[] not null default '{}'    -- modalidad: musculacion, hipertrofia, halterofilia...
    check (training_styles <@ array['musculacion', 'hipertrofia', 'fuerza', 'halterofilia', 'gimnasia', 'funcional', 'cardio', 'movilidad', 'otro', 'no_se']::text[]),
  training_styles_other text,
  place_equipment       jsonb not null default '{}'::jsonb,   -- equipo por lugar: {"smartfit": ["barra", ...]}
  last_trained          text check (last_trained in ('actualmente', 'menos_1_mes', 'entre_1_y_6_meses', 'mas_6_meses', 'nunca')),
  past_activities       text[] not null default '{}',
  activity_level        text check (activity_level in ('sedentario', 'ligero', 'activo', 'muy_activo')),
  sleep_hours           text check (sleep_hours in ('menos_5', 'entre_5_y_6', 'entre_7_y_8', 'mas_8')),
  pregnancy_status      text not null default 'no' check (pregnancy_status in ('no', 'embarazada', 'posparto')),
  has_medical_condition boolean not null default false,
  medical_notes         text,
  consent_health_data   boolean not null default false,
  consent_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger health_profiles_updated_at
  before update on public.health_profiles
  for each row execute function public.set_updated_at();

create table public.injury_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body_area   text not null references public.body_areas(code),
  kind        text not null check (kind in ('cirugia', 'lesion', 'dolor_cronico', 'condicion')),
  description text,
  year        smallint check (year between 1950 and 2100),
  status      text not null default 'activa' check (status in ('activa', 'recuperada')),
  created_at  timestamptz not null default now()
);

create index injury_records_user_idx on public.injury_records (user_id);

-- ---------- Rutinas ----------
create table public.routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  goal          text,
  days_per_week smallint check (days_per_week between 1 and 7),
  is_active     boolean not null default true,
  place         text,
  notes         text,
  created_at    timestamptz not null default now()
);

create index routines_user_idx on public.routines (user_id);

create table public.routine_days (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_index  smallint not null check (day_index between 1 and 7),
  name       text not null,
  unique (routine_id, day_index)
);

create table public.routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references public.routine_days(id) on delete cascade,
  exercise_id  text not null references public.exercises(id),
  position     smallint not null,
  sets         smallint not null default 3 check (sets between 1 and 20),
  reps_min     smallint not null default 8,
  reps_max     smallint not null default 12,
  rest_seconds smallint not null default 90,
  notes        text,
  unique (day_id, position)
);

-- ---------- Registro de entrenamientos (los ids los genera el cliente para sync offline) ----------
create table public.workout_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  notes          text
);

create index workout_logs_user_idx on public.workout_logs (user_id, started_at desc);

create table public.set_logs (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workout_logs(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  set_number  smallint not null,
  reps        smallint check (reps >= 0),
  weight_kg   numeric(6,2) check (weight_kg >= 0),
  rpe         numeric(3,1) check (rpe between 1 and 10),
  created_at  timestamptz not null default now()
);

create index set_logs_workout_idx on public.set_logs (workout_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.body_areas                enable row level security;
alter table public.area_muscles              enable row level security;
alter table public.exercises                 enable row level security;
alter table public.exercise_contraindications enable row level security;
alter table public.profiles                  enable row level security;
alter table public.health_profiles           enable row level security;
alter table public.injury_records            enable row level security;
alter table public.routines                  enable row level security;
alter table public.routine_days              enable row level security;
alter table public.routine_exercises         enable row level security;
alter table public.workout_logs              enable row level security;
alter table public.set_logs                  enable row level security;

-- Catálogos: solo lectura para usuarios con sesión (sin políticas de escritura).
create policy "catalogo_lectura" on public.body_areas
  for select to authenticated using (true);
create policy "catalogo_lectura" on public.area_muscles
  for select to authenticated using (true);
create policy "catalogo_lectura" on public.exercises
  for select to authenticated using (true);
create policy "catalogo_lectura" on public.exercise_contraindications
  for select to authenticated using (true);

-- Tablas del usuario: cada quien solo ve y modifica lo suyo.
create policy "propio" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "propio" on public.health_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "propio" on public.injury_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "propio" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "propio" on public.workout_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Tablas hijas: se valida contra el dueño del padre.
create policy "propio" on public.routine_days
  for all to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routines r
                      where r.id = routine_id and r.user_id = (select auth.uid())));

create policy "propio" on public.routine_exercises
  for all to authenticated
  using (exists (select 1 from public.routine_days d
                 join public.routines r on r.id = d.routine_id
                 where d.id = day_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routine_days d
                      join public.routines r on r.id = d.routine_id
                      where d.id = day_id and r.user_id = (select auth.uid())));

create policy "propio" on public.set_logs
  for all to authenticated
  using (exists (select 1 from public.workout_logs w
                 where w.id = workout_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workout_logs w
                      where w.id = workout_id and w.user_id = (select auth.uid())));

-- =====================================================================
-- Rutinas: guardado atómico, una activa por usuario y límites (igual que migrations/005)
-- =====================================================================
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

-- =====================================================================
-- Métricas del entrenamiento guiado (igual que migrations/006)
-- =====================================================================
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

-- =====================================================================
-- Tiempos del entrenamiento (igual que migrations/007)
-- =====================================================================
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

-- =====================================================================
-- Calificaciones, cambios de ejercicio y pausa (igual que migrations/008)
-- =====================================================================
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

-- =====================================================================
-- Terminar el día antes: motivos (igual que migrations/009)
-- =====================================================================
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

-- =====================================================================
-- Límites de la rutina (igual que migrations/010)
-- =====================================================================
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
