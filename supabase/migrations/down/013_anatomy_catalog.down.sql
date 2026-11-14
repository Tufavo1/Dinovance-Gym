-- Reversa de 013 (y de los datos de 014). Restaura los músculos originales del dataset.
update public.exercises set
  primary_muscles   = coalesce(array(select jsonb_array_elements_text(dataset_muscles -> 'primary')), primary_muscles),
  secondary_muscles = coalesce(array(select jsonb_array_elements_text(dataset_muscles -> 'secondary')), secondary_muscles)
where dataset_muscles is not null;

drop view if exists public.exercise_catalog;
drop table if exists public.exercise_muscles;
-- Los ejercicios propios (DV_) solo se borran si nadie los usó; si no, se conservan.
delete from public.exercises e
where e.source = 'dinovance'
  and not exists (select 1 from public.routine_exercises r where r.exercise_id = e.id)
  and not exists (select 1 from public.set_logs s where s.exercise_id = e.id);
alter table public.exercises
  drop column if exists movement_pattern,
  drop column if exists muscle_function,
  drop column if exists common_errors,
  drop column if exists variants,
  drop column if exists precautions,
  drop column if exists safety_notes,
  drop column if exists rep_range_min,
  drop column if exists rep_range_max,
  drop column if exists required_gear,
  drop column if exists review_status,
  drop column if exists source,
  drop column if exists dataset_muscles;
drop table if exists public.movement_patterns;
drop table if exists public.muscles;
delete from public.app_migrations where name in ('013_anatomy_catalog.sql', '014_catalog_seed.sql');
notify pgrst, 'reload schema';
