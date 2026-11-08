-- Modalidades de entrenamiento (musculación, hipertrofia, halterofilia, gimnasia, etc.)
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.

alter table public.health_profiles
  add column if not exists training_styles text[] not null default '{}',
  add column if not exists training_styles_other text;

alter table public.health_profiles
  drop constraint if exists health_profiles_training_styles_check;

alter table public.health_profiles
  add constraint health_profiles_training_styles_check
  check (training_styles <@ array[
    'musculacion', 'hipertrofia', 'fuerza', 'halterofilia', 'gimnasia',
    'funcional', 'cardio', 'movilidad', 'otro', 'no_se'
  ]::text[]);
