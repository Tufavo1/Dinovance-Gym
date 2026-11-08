-- Equipamiento por lugar y datos extra de las rutinas generadas.
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.

-- Equipo disponible por lugar, ej: {"smartfit": ["barra","mancuernas"], "casa": ["bandas"]}
alter table public.health_profiles
  add column if not exists place_equipment jsonb not null default '{}'::jsonb;

-- Lugar para el que se generó la rutina y avisos del generador
alter table public.routines
  add column if not exists place text,
  add column if not exists notes text;
