-- Historial de entrenamiento y hábitos, para adaptar mejor la rutina.
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.

alter table public.health_profiles
  add column if not exists last_trained text
    check (last_trained in ('actualmente', 'menos_1_mes', 'entre_1_y_6_meses', 'mas_6_meses', 'nunca')),
  add column if not exists past_activities text[] not null default '{}',
  add column if not exists activity_level text
    check (activity_level in ('sedentario', 'ligero', 'activo', 'muy_activo')),
  add column if not exists sleep_hours text
    check (sleep_hours in ('menos_5', 'entre_5_y_6', 'entre_7_y_8', 'mas_8')),
  add column if not exists pregnancy_status text not null default 'no'
    check (pregnancy_status in ('no', 'embarazada', 'posparto'));

notify pgrst, 'reload schema';
