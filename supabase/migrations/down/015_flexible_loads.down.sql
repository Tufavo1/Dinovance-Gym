-- Reversa de 015. ATENCIÓN: se pierden las cargas registradas en unidades que no son kg/lb
-- (niveles, placas) y el estado declarado. Haz un respaldo antes (scripts/backup.sh).
-- scripts/migrate-down.sh vuelve a aplicar la migración 009 para restaurar log_workout.
drop view if exists public.set_history;
drop index if exists public.workout_logs_client_idx;
alter table public.workout_logs
  drop column if exists client_id, drop column if exists readiness, drop column if exists fatigue,
  drop column if exists discomfort_areas, drop column if exists discomfort_note, drop column if exists source;
alter table public.set_logs
  drop column if exists load_value, drop column if exists load_unit, drop column if exists unit_label,
  drop column if exists load_kind, drop column if exists bodyweight_kg, drop column if exists note;
drop table if exists public.exercise_load_settings;
delete from public.app_migrations where name = '015_flexible_loads.sql';
-- reapply: 009_end_day_reasons.sql
notify pgrst, 'reload schema';
