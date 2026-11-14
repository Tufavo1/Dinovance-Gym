-- Reversa de 016. Se pierden recomendaciones, informes, metas y mediciones: respalda antes.
-- scripts/migrate-down.sh vuelve a aplicar después las migraciones de la línea "reapply" para dejar
-- save_routine / replace_day_exercises / swap_exercise / log_workout en su versión anterior.
drop table if exists public.body_measurements;
drop table if exists public.fitness_goals;
drop table if exists public.weekly_reports;
drop table if exists public.load_recommendations;
drop function if exists public.insert_routine_exercise(uuid, int, jsonb);
alter table public.routines drop column if exists shared_from, drop column if exists shared_by_name;
alter table public.routine_exercises
  drop column if exists rir_min, drop column if exists rir_max, drop column if exists tempo, drop column if exists rationale;
alter table public.routine_days drop column if exists objective;
delete from public.app_migrations where name = '016_progression_reports.sql';
-- reapply: 008_ratings_swaps_pause.sql 010_routine_limits.sql 011_evidence_editing_metrics.sql 015_flexible_loads.sql
notify pgrst, 'reload schema';
