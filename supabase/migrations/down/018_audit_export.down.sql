-- Reversa de 018. Se pierde el historial de modificaciones: respalda antes.
drop function if exists public.import_my_workouts(jsonb);
drop function if exists public.export_my_data();
do $$
declare
  t text;
begin
  foreach t in array array['set_logs', 'workout_logs', 'body_metrics', 'body_measurements', 'exercise_load_settings',
                           'fitness_goals', 'load_recommendations', 'health_profiles', 'profiles'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_%I on public.%I', t, t);
    end if;
  end loop;
end;
$$;
drop function if exists public.audit_row();
drop table if exists public.audit_log;
delete from public.app_migrations where name = '018_audit_export.sql';
notify pgrst, 'reload schema';
