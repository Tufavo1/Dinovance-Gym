-- Historial de modificaciones (auditoría), exportación e importación de los datos propios.
-- Es seguro ejecutarla más de una vez. Reversa: migrations/down/018_audit_export.down.sql

-- ---------- Historial de modificaciones ----------
-- Cada cambio o borrado de un registro ya guardado deja el valor anterior. Así nunca se pierde
-- qué se registró originalmente (ni se puede "reescribir" el historial sin dejar rastro).
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  owner_id   uuid,
  changed_by uuid,
  table_name text not null,
  row_id     text not null,
  action     text not null check (action in ('UPDATE', 'DELETE')),
  old_data   jsonb not null,
  new_data   jsonb,
  changed_at timestamptz not null default now()
);
create index if not exists audit_log_owner_idx on public.audit_log (owner_id, changed_at desc);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
-- Solo lectura de lo propio. Nadie escribe directamente: solo el disparador.
drop policy if exists "propio_lectura" on public.audit_log;
create policy "propio_lectura" on public.audit_log
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- TG_ARGV[0] = columna con el dueño ('user_id', 'id') o 'workout' para series (dueño del entrenamiento).
-- TG_ARGV[1] = columna que identifica la fila.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) else null end;
  v_owner uuid;
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;
  if tg_argv[0] = 'workout' then
    select user_id into v_owner from public.workout_logs where id = (v_old ->> 'workout_id')::uuid;
  else
    v_owner := (v_old ->> tg_argv[0])::uuid;
  end if;
  insert into public.audit_log (owner_id, changed_by, table_name, row_id, action, old_data, new_data)
  values (coalesce(v_owner, auth.uid()), auth.uid(), tg_table_name, v_old ->> tg_argv[1], tg_op, v_old, v_new);
  return coalesce(new, old);
end;
$$;
revoke all on function public.audit_row() from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('set_logs',               'workout', 'id'),
      ('workout_logs',           'user_id', 'id'),
      ('body_metrics',           'user_id', 'id'),
      ('body_measurements',      'user_id', 'id'),
      ('exercise_load_settings', 'user_id', 'exercise_id'),
      ('fitness_goals',          'user_id', 'id'),
      ('load_recommendations',   'user_id', 'id'),
      ('health_profiles',        'user_id', 'user_id'),
      ('profiles',               'id',      'id')
    ) as x(tbl, owner_col, id_col)
  loop
    execute format('drop trigger if exists audit_%I on public.%I', t.tbl, t.tbl);
    execute format(
      'create trigger audit_%I after update or delete on public.%I for each row execute function public.audit_row(%L, %L)',
      t.tbl, t.tbl, t.owner_col, t.id_col
    );
  end loop;
end;
$$;

-- ---------- Exportar todos mis datos (JSON) ----------
-- SECURITY INVOKER: RLS garantiza que solo salen los datos de quien llama.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'format', 'dinovance-gym',
    'version', 1,
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = v_me),
    'health_profile', (select to_jsonb(h) - 'user_id' from public.health_profiles h where h.user_id = v_me),
    'injuries', coalesce((select jsonb_agg(to_jsonb(i) - 'user_id') from public.injury_records i where i.user_id = v_me), '[]'::jsonb),
    'routines', coalesce((
      select jsonb_agg(to_jsonb(r) - 'user_id' || jsonb_build_object('days', coalesce((
        select jsonb_agg(to_jsonb(d) - 'routine_id' || jsonb_build_object('exercises', coalesce((
          select jsonb_agg(to_jsonb(e) - 'day_id' order by e.position) from public.routine_exercises e where e.day_id = d.id
        ), '[]'::jsonb)) order by d.day_index)
        from public.routine_days d where d.routine_id = r.id
      ), '[]'::jsonb)) order by r.created_at)
      from public.routines r where r.user_id = v_me
    ), '[]'::jsonb),
    'workouts', coalesce((
      select jsonb_agg(to_jsonb(w) - 'user_id' || jsonb_build_object(
        'client_id', coalesce(w.client_id, w.id),
        'sets', coalesce((
          select jsonb_agg(to_jsonb(s) - 'workout_id' order by s.created_at, s.set_number) from public.set_logs s where s.workout_id = w.id
        ), '[]'::jsonb),
        'ratings', coalesce((
          select jsonb_agg(jsonb_build_object('exercise_id', x.exercise_id, 'rating', x.rating)) from public.exercise_ratings x where x.workout_id = w.id
        ), '[]'::jsonb)
      ) order by w.started_at)
      from public.workout_logs w where w.user_id = v_me
    ), '[]'::jsonb),
    'body_metrics', coalesce((select jsonb_agg(to_jsonb(b) - 'user_id' order by b.measured_on) from public.body_metrics b where b.user_id = v_me), '[]'::jsonb),
    'body_measurements', coalesce((select jsonb_agg(to_jsonb(b) - 'user_id' order by b.measured_on) from public.body_measurements b where b.user_id = v_me), '[]'::jsonb),
    'fitness_goals', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id') from public.fitness_goals g where g.user_id = v_me), '[]'::jsonb),
    'load_settings', coalesce((select jsonb_agg(to_jsonb(l) - 'user_id') from public.exercise_load_settings l where l.user_id = v_me), '[]'::jsonb),
    'exercise_preferences', coalesce((select jsonb_agg(to_jsonb(x) - 'user_id') from public.exercise_preferences x where x.user_id = v_me), '[]'::jsonb),
    'load_recommendations', coalesce((select jsonb_agg(to_jsonb(x) - 'user_id') from public.load_recommendations x where x.user_id = v_me), '[]'::jsonb),
    'weekly_reports', coalesce((select jsonb_agg(to_jsonb(x) - 'user_id' order by x.week_start) from public.weekly_reports x where x.user_id = v_me), '[]'::jsonb)
  );
end;
$$;

-- ---------- Importar entrenamientos (de un respaldo JSON o de un CSV ya convertido) ----------
-- Cada entrenamiento se guarda con log_workout: mismas validaciones, y si ya existía (mismo
-- client_id) no se duplica. Los que traen ejercicios desconocidos o datos inválidos se rechazan
-- completos y se informa el motivo: nunca se guarda un entrenamiento "a medias".
create or replace function public.import_my_workouts(p_workouts jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_w jsonb;
  v_client uuid;
  v_day uuid;
  v_imported int := 0;
  v_skipped int := 0;
  v_rejected jsonb := '[]'::jsonb;
  v_n int := 0;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if jsonb_typeof(p_workouts) <> 'array' or jsonb_array_length(p_workouts) > 2000 then
    raise exception 'Se esperaba una lista de hasta 2000 entrenamientos' using errcode = '22023';
  end if;

  for v_w in select value from jsonb_array_elements(p_workouts) loop
    v_n := v_n + 1;
    begin
      -- Sin client_id se deriva uno estable de la fecha de inicio: importar dos veces no duplica.
      v_client := coalesce(
        nullif(v_w ->> 'client_id', '')::uuid,
        md5('dinovance-import:' || (v_w ->> 'started_at'))::uuid
      );
      if exists (select 1 from public.workout_logs where user_id = auth.uid() and (client_id = v_client or id = v_client)) then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      -- El día de rutina solo se conserva si es de una rutina propia que aún existe.
      v_day := nullif(v_w ->> 'routine_day_id', '')::uuid;
      if v_day is not null and not exists (
        select 1 from public.routine_days d join public.routines r on r.id = d.routine_id
        where d.id = v_day and r.user_id = auth.uid()
      ) then
        v_day := null;
      end if;
      perform public.log_workout(
        v_w || jsonb_build_object('client_id', v_client, 'routine_day_id', v_day, 'source', 'importado')
      );
      v_imported := v_imported + 1;
    exception when others then
      v_rejected := v_rejected || jsonb_build_object('index', v_n, 'started_at', v_w ->> 'started_at', 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped_existing', v_skipped, 'rejected', v_rejected);
end;
$$;

revoke all on function public.export_my_data() from public, anon;
revoke all on function public.import_my_workouts(jsonb) from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.import_my_workouts(jsonb) to authenticated;

notify pgrst, 'reload schema';
