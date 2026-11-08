-- Objetivos más específicos: principal ampliado, secundarios, zonas a priorizar y detalle libre.
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.

alter table public.health_profiles
  add column if not exists secondary_goals text[] not null default '{}',
  add column if not exists focus_areas text[] not null default '{}',
  add column if not exists goal_detail text;

-- Objetivo principal: ahora admite más valores
alter table public.health_profiles drop constraint if exists health_profiles_goal_check;
alter table public.health_profiles add constraint health_profiles_goal_check
  check (goal in (
    'perder_grasa', 'ganar_musculo', 'fuerza', 'tonificar', 'resistencia', 'salud_general',
    'postura', 'movilidad', 'deporte', 'retomar'
  ));

alter table public.health_profiles drop constraint if exists health_profiles_secondary_goals_check;
alter table public.health_profiles add constraint health_profiles_secondary_goals_check
  check (secondary_goals <@ array[
    'perder_grasa', 'ganar_musculo', 'fuerza', 'tonificar', 'resistencia', 'salud_general',
    'postura', 'movilidad', 'deporte', 'retomar'
  ]::text[]);

alter table public.health_profiles drop constraint if exists health_profiles_focus_areas_check;
alter table public.health_profiles add constraint health_profiles_focus_areas_check
  check (focus_areas <@ array[
    'pecho', 'espalda', 'hombros', 'brazos', 'abdomen', 'gluteos', 'piernas'
  ]::text[]);

-- Refresca la caché del API para que reconozca las columnas nuevas
notify pgrst, 'reload schema';
