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
