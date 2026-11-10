-- Marcas de fuerza (RM / PR) y frecuencia deseada por grupo muscular.
-- Ejecutar en Supabase > SQL Editor (después de la 011). Es seguro ejecutarla más de una vez.
--
-- strength_marks:   {"sentadilla": {"kg": 100, "reps": 5}, "dominadas": {"reps": 8}, ...}
-- muscle_frequency: {"pecho": 2, "piernas": 3, ...}  (veces por semana, 1 a 4)

alter table public.health_profiles
  add column if not exists strength_marks jsonb not null default '{}'::jsonb
    check (jsonb_typeof(strength_marks) = 'object' and pg_column_size(strength_marks) < 2000),
  add column if not exists muscle_frequency jsonb not null default '{}'::jsonb
    check (jsonb_typeof(muscle_frequency) = 'object' and pg_column_size(muscle_frequency) < 1000);

notify pgrst, 'reload schema';
