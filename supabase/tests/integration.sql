-- Pruebas de integración de la base (relaciones, RLS, funciones) con DATOS SINTÉTICOS.
-- Todo corre en una transacción que termina en ROLLBACK: no deja nada en la base.
--
-- Uso:  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/integration.sql
-- (o scripts/test-db.sh contra la base local en Docker). Si algo falla, psql termina con error.
begin;

-- ---------- Dos personas sintéticas ----------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ana.prueba@example.test', '{"full_name": "Ana Prueba"}'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'beto.prueba@example.test', '{"full_name": "Beto Prueba"}');
insert into public.profiles (id, full_name) values
  ('00000000-0000-4000-a000-00000000000a', 'Ana Prueba'),
  ('00000000-0000-4000-a000-00000000000b', 'Beto Prueba')
on conflict (id) do update set full_name = excluded.full_name;

create function pg_temp.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
end;
$$;
create function pg_temp.ana() returns void language sql as $$ select pg_temp.login('00000000-0000-4000-a000-00000000000a') $$;
create function pg_temp.beto() returns void language sql as $$ select pg_temp.login('00000000-0000-4000-a000-00000000000b') $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------- 1. Catálogo: integridad y aductores ----------
do $$
declare n int;
begin
  select count(*) into n from public.exercises where movement_pattern = 'aduccion_cadera' and review_status = 'verificado';
  assert n >= 5, format('se esperaban al menos 5 ejercicios directos de aductores verificados, hay %s', n);

  select count(*) into n from public.exercises e
  where e.movement_pattern = 'aduccion_cadera' and e.review_status = 'verificado'
    and not exists (
      select 1 from public.exercise_muscles em join public.muscles m on m.code = em.muscle_code
      where em.exercise_id = e.id and em.role = 'principal' and m.volume_key = 'adductors');
  assert n = 0, 'hay ejercicios de aducción sin un aductor como músculo principal';

  select count(*) into n from public.exercises e
  where e.category = 'strength' and not exists (select 1 from public.exercise_muscles em where em.exercise_id = e.id and em.role = 'principal');
  assert n = 0, format('%s ejercicios de fuerza sin músculo principal', n);

  select count(*) into n from public.muscles m where m.parent is not null and not exists (select 1 from public.muscles p where p.code = m.parent);
  assert n = 0, 'músculo con padre inexistente';

  -- Todos los grupos pedidos existen.
  select count(*) into n from public.muscles where code in (
    'pectoral_clavicular','pectoral_esternal','pectoral_abdominal','deltoides_anterior','deltoides_lateral','deltoides_posterior',
    'trapecio_superior','trapecio_medio','trapecio_inferior','romboides','dorsal_ancho','redondo_mayor','redondo_menor',
    'biceps_braquial','braquial','braquiorradial','triceps_cabeza_larga','triceps_cabeza_lateral','triceps_cabeza_medial',
    'recto_abdominal','oblicuo_externo','oblicuo_interno','transverso_abdominal','erectores_espinales',
    'recto_femoral','vasto_lateral','vasto_medial','vasto_intermedio','biceps_femoral','semitendinoso','semimembranoso',
    'gluteo_mayor','gluteo_medio','gluteo_menor','aductor_mayor','aductor_largo','aductor_corto','gracil','pectineo',
    'iliopsoas','gastrocnemio','soleo','tibial_anterior','peroneos');
  assert n = 44, format('faltan músculos del catálogo: %s de 44', n);

  -- Claves foráneas: no se puede asociar un músculo o un patrón que no existe.
  begin
    insert into public.exercise_muscles (exercise_id, muscle_code, role) values ('Leg_Press', 'musculo_inventado', 'principal');
    assert false, 'se aceptó un músculo inexistente';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.exercises set movement_pattern = 'patron_inventado' where id = 'Leg_Press';
    assert false, 'se aceptó un patrón inexistente';
  exception when foreign_key_violation then null;
  end;
end;
$$;

-- ---------- 2. Ana registra un entrenamiento: kg, libras y niveles ----------
select pg_temp.ana();
do $$
declare
  v_id uuid;
  v_again uuid;
  r record;
begin
  v_id := public.log_workout(jsonb_build_object(
    'client_id', '11111111-1111-4111-8111-111111111111',
    'started_at', now() - interval '1 hour', 'finished_at', now(),
    'session_rpe', 7, 'readiness', 4, 'fatigue', 2, 'discomfort_areas', jsonb_build_array('rodilla'),
    'sets', jsonb_build_array(
      jsonb_build_object('exercise_id', 'Leg_Press', 'set_number', 1, 'reps', 10, 'load_value', 82.5, 'load_unit', 'kg', 'rir', 2),
      jsonb_build_object('exercise_id', 'Leg_Press', 'set_number', 2, 'reps', 10, 'load_value', 100, 'load_unit', 'lb', 'rir', 2),
      jsonb_build_object('exercise_id', 'Thigh_Adductor', 'set_number', 1, 'reps', 15, 'load_value', 5, 'load_unit', 'nivel', 'rir', 2),
      jsonb_build_object('exercise_id', 'Thigh_Adductor', 'set_number', 2, 'reps', 14, 'load_value', 6, 'load_unit', 'nivel', 'rir', 1),
      -- Versión anterior de la app: solo weight_kg.
      jsonb_build_object('exercise_id', 'Leg_Extensions', 'set_number', 1, 'reps', 12, 'weight_kg', 17.5, 'rir', 3)
    )));

  select * into r from public.set_logs where workout_id = v_id and load_unit = 'nivel' and set_number = 1;
  assert r.load_value = 5 and r.weight_kg is null, 'un nivel de máquina no debe convertirse a kilos';
  select * into r from public.set_logs where workout_id = v_id and load_unit = 'lb';
  assert r.weight_kg = 45.36, format('100 lb deben ser 45,36 kg, se guardó %s', r.weight_kg);
  select * into r from public.set_logs where workout_id = v_id and exercise_id = 'Leg_Extensions';
  assert r.load_value = 17.5 and r.load_unit = 'kg' and r.weight_kg = 17.5, 'compatibilidad con weight_kg';
  select * into r from public.workout_logs where id = v_id;
  -- Tonelaje: 10×82,5 + 10×45,36 + 12×17,5 = 1488,6 (las series por nivel no suman).
  assert r.tonnage_kg = 1488.6, format('tonelaje %s', r.tonnage_kg);
  assert r.effective_sets = 5 and r.readiness = 4 and r.discomfort_areas = array['rodilla'], 'estado declarado';

  -- Idempotencia: reenviar el mismo entrenamiento no lo duplica.
  v_again := public.log_workout(jsonb_build_object(
    'client_id', '11111111-1111-4111-8111-111111111111', 'started_at', now() - interval '1 hour', 'finished_at', now(),
    'sets', jsonb_build_array(jsonb_build_object('exercise_id', 'Leg_Press', 'set_number', 1, 'reps', 99, 'load_value', 999))));
  assert v_again = v_id, 'el reenvío debe devolver el mismo entrenamiento';
  assert (select count(*) from public.workout_logs) = 1 and (select count(*) from public.set_logs) = 5, 'no debe duplicar';

  -- Validaciones del servidor.
  begin
    perform public.log_workout(jsonb_build_object('started_at', now() - interval '1 hour', 'finished_at', now(),
      'sets', jsonb_build_array(jsonb_build_object('exercise_id', 'Leg_Press', 'set_number', 1, 'reps', 10, 'load_value', 5, 'load_unit', 'arrobas'))));
    assert false, 'se aceptó una unidad desconocida';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.log_workout(jsonb_build_object('started_at', now() - interval '1 hour', 'finished_at', now(),
      'sets', jsonb_build_array(jsonb_build_object('exercise_id', 'Ejercicio_Inventado', 'set_number', 1, 'reps', 10))));
    assert false, 'se aceptó un ejercicio que no existe';
  exception when foreign_key_violation then null;
  end;
  begin
    perform public.log_workout(jsonb_build_object('started_at', now() + interval '3 days', 'finished_at', now() + interval '3 days 1 hour', 'sets', '[]'::jsonb));
    assert false, 'se aceptó un entrenamiento en el futuro';
  exception when sqlstate '22023' then null;
  end;

  -- Configuración de máquina y recomendación propias.
  insert into public.exercise_load_settings (exercise_id, load_unit, min_increment, scale_min, scale_max)
  values ('Thigh_Adductor', 'nivel', 1, 1, 8);
  begin
    insert into public.exercise_load_settings (exercise_id, load_unit, scale_min, scale_max) values ('Leg_Press', 'kg', 8, 1);
    assert false, 'se aceptó un rango de máquina invertido';
  exception when check_violation then null;
  end;
  insert into public.load_recommendations (exercise_id, week_start, action, current_value, suggested_value, load_unit, reason)
  values ('Thigh_Adductor', date_trunc('week', now())::date, 'subir', 5, 6, 'nivel', 'prueba');
  insert into public.weekly_reports (week_start, report) values (date_trunc('week', now())::date, '{"version": 1}'::jsonb);
  begin
    insert into public.weekly_reports (week_start, report) values (date_trunc('week', now())::date + 2, '{}'::jsonb);
    assert false, 'un informe semanal debe empezar en lunes';
  exception when check_violation then null;
  end;
  insert into public.body_measurements (kind, value) values ('cintura', 80);
  insert into public.fitness_goals (kind, title, target_value, unit) values ('peso_corporal', 'Llegar a 70 kg', 70, 'kg');
end;
$$;

-- ---------- 3. Rutina con justificación, RIR y aductores ----------
do $$
declare
  v_routine uuid;
  r record;
begin
  v_routine := public.save_routine(jsonb_build_object(
    'name', 'Rutina de prueba', 'goal', 'ganar_musculo', 'days_per_week', 1, 'place', 'smartfit', 'notes', 'n',
    'days', jsonb_build_array(jsonb_build_object(
      'day_index', 1, 'name', 'Día 1 · Tren inferior', 'estimated_minutes', 45, 'objective', 'Trabajo directo de aductores',
      'exercises', jsonb_build_array(
        jsonb_build_object('exercise_id', 'Leg_Press', 'sets', 3, 'reps_min', 8, 'reps_max', 12, 'rest_seconds', 120,
                           'rir_min', 2, 'rir_max', 3, 'rationale', 'Trabajo directo de cuádriceps'),
        jsonb_build_object('exercise_id', 'Thigh_Adductor', 'sets', 3, 'reps_min', 10, 'reps_max', 15, 'rest_seconds', 75,
                           'rir_min', 2, 'rir_max', 3, 'tempo', 'bajada 2-3 s', 'rationale', 'Regla de cobertura: aductores'),
        -- Formato anterior (sin campos nuevos): debe seguir funcionando.
        jsonb_build_object('exercise_id', 'Leg_Extensions', 'sets', 3, 'reps_min', 10, 'reps_max', 15, 'rest_seconds', 75, 'notes', null)
      )))));
  select e.* into r from public.routine_exercises e join public.routine_days d on d.id = e.day_id
  where d.routine_id = v_routine and e.exercise_id = 'Thigh_Adductor';
  assert r.rationale = 'Regla de cobertura: aductores' and r.rir_min = 2 and r.tempo = 'bajada 2-3 s', 'justificación y RIR guardados';
  assert (select objective from public.routine_days where routine_id = v_routine) = 'Trabajo directo de aductores', 'objetivo del día';
  select e.* into r from public.routine_exercises e join public.routine_days d on d.id = e.day_id
  where d.routine_id = v_routine and e.exercise_id = 'Leg_Extensions';
  assert r.rationale is null and r.rir_min is null, 'los campos nuevos son opcionales';
end;
$$;

-- ---------- 4. Beto no ve nada de Ana (RLS) ----------
select pg_temp.beto();
do $$
begin
  assert (select count(*) from public.workout_logs) = 0, 'Beto ve entrenamientos de Ana';
  assert (select count(*) from public.set_logs) = 0, 'Beto ve series de Ana';
  assert (select count(*) from public.exercise_load_settings) = 0, 'Beto ve la configuración de Ana';
  assert (select count(*) from public.load_recommendations) = 0, 'Beto ve recomendaciones de Ana';
  assert (select count(*) from public.weekly_reports) = 0, 'Beto ve informes de Ana';
  assert (select count(*) from public.body_measurements) = 0, 'Beto ve mediciones de Ana';
  assert (select count(*) from public.fitness_goals) = 0, 'Beto ve metas de Ana';
  assert (select count(*) from public.routines) = 0, 'Beto ve rutinas de Ana';
  assert (select count(*) from public.audit_log) = 0, 'Beto ve el historial de Ana';
  assert jsonb_array_length(public.export_my_data() -> 'workouts') = 0, 'la exportación de Beto trae datos de Ana';

  -- Tampoco puede escribir a nombre de Ana.
  begin
    insert into public.exercise_load_settings (user_id, exercise_id) values ('00000000-0000-4000-a000-00000000000a', 'Leg_Press');
    assert false, 'Beto pudo escribir una configuración a nombre de Ana';
  exception when insufficient_privilege then null;
  end;
  update public.set_logs set reps = 1;
  delete from public.workout_logs;

  -- Beto usa la misma máquina con SU configuración (en kg) y su propio registro.
  insert into public.exercise_load_settings (exercise_id, load_unit, min_increment) values ('Thigh_Adductor', 'kg', 5);
  perform public.log_workout(jsonb_build_object('started_at', now() - interval '2 hours', 'finished_at', now() - interval '1 hour',
    'sets', jsonb_build_array(jsonb_build_object('exercise_id', 'Thigh_Adductor', 'set_number', 1, 'reps', 12, 'load_value', 40, 'rir', 2))));
  assert (select count(*) from public.set_logs) = 1, 'Beto solo ve su serie';

  -- Sin vínculo no hay resumen de la otra persona.
  assert (public.partner_weekly_summary(4) ->> 'available')::boolean = false, 'resumen sin vínculo';
  begin
    perform public.share_routine_with_partner(gen_random_uuid());
    assert false, 'compartió una rutina ajena';
  exception when sqlstate 'P0002' then null;
  end;
end;
$$;

select pg_temp.ana();
do $$
begin
  assert (select count(*) from public.set_logs) = 5 and (select min(reps) from public.set_logs) = 10, 'los registros de Ana quedaron intactos';
  assert (select load_unit from public.exercise_load_settings where exercise_id = 'Thigh_Adductor') = 'nivel', 'la configuración de Ana no cambió';
end;
$$;

-- ---------- 5. Vínculo de pareja, rutina compartida y comparación opcional ----------
do $$
declare
  v_link uuid;
  v_copy uuid;
  v_summary jsonb;
begin
  perform pg_temp.ana();
  begin
    perform public.invite_partner('ana.prueba@example.test');
    assert false, 'se vinculó consigo misma';
  exception when sqlstate '22023' then null;
  end;
  v_link := public.invite_partner('BETO.prueba@example.test');
  begin
    perform public.share_routine_with_partner((select id from public.routines limit 1));
    assert false, 'compartió antes de que aceptaran el vínculo';
  exception when sqlstate 'P0002' then null;
  end;
  begin
    perform public.respond_partner(v_link, true);
    assert false, 'quien invita no puede aceptarse sola';
  exception when sqlstate 'P0002' then null;
  end;

  perform pg_temp.beto();
  assert (select status from public.my_partner()) = 'pendiente' and (select partner_name from public.my_partner()) = 'Ana Prueba', 'invitación visible';
  perform public.respond_partner(v_link, true);
  -- Vinculados, pero Ana aún no comparte su resumen.
  assert (public.partner_weekly_summary(4) ->> 'reason') = 'no_comparte', 'el resumen exige consentimiento';

  perform pg_temp.ana();
  v_copy := public.share_routine_with_partner((select id from public.routines limit 1));
  perform public.set_partner_sharing(true);
  assert (select count(*) from public.routines) = 1, 'Ana no ve la copia de Beto';
  -- Beto no comparte: Ana no ve su resumen.
  assert (public.partner_weekly_summary(4) ->> 'reason') = 'no_comparte', 'Beto no comparte';

  perform pg_temp.beto();
  assert (select count(*) from public.routines where id = v_copy and not is_active and shared_by_name = 'Ana Prueba') = 1, 'Beto recibió la copia inactiva';
  assert (select count(*) from public.routine_exercises e join public.routine_days d on d.id = e.day_id where d.routine_id = v_copy) = 3, 'copia con los 3 ejercicios';
  -- La copia no trae cargas: la carga de Beto en aductores sigue siendo la suya (40 kg), no el nivel de Ana.
  assert (select load_unit from public.exercise_load_settings where exercise_id = 'Thigh_Adductor') = 'kg', 'la configuración de Beto es independiente';
  assert (select max(load_value) from public.set_logs where exercise_id = 'Thigh_Adductor') = 40, 'Beto solo ve su carga';
  v_summary := public.partner_weekly_summary(4);
  assert (v_summary ->> 'available')::boolean, 'Ana comparte su resumen';
  assert (v_summary -> 'weeks' -> 0 ->> 'sessions')::int = 1, 'una sesión de Ana';
  assert (v_summary -> 'muscle_sets' ->> 'adductors')::int = 2, 'series de aductores de Ana';
  -- El resumen son solo conteos: ni cargas ni repeticiones.
  assert v_summary::text !~ '82\.5|load_value|weight_kg|reps', 'el resumen expone cargas';
  -- Beto edita SU copia sin tocar la rutina de Ana.
  update public.routine_exercises e set sets = 5 from public.routine_days d where d.id = e.day_id and d.routine_id = v_copy;

  perform pg_temp.ana();
  assert (select max(e.sets) from public.routine_exercises e join public.routine_days d on d.id = e.day_id join public.routines r on r.id = d.routine_id) = 3, 'la rutina de Ana no cambió';
  delete from public.partner_links where id = v_link;
  assert (public.partner_weekly_summary(4) ->> 'reason') = 'sin_vinculo', 'sin vínculo ya no hay resumen';
end;
$$;

-- ---------- 6. Historial de modificaciones ----------
select pg_temp.ana();
do $$
declare r record;
begin
  update public.set_logs set reps = 11 where exercise_id = 'Leg_Press' and set_number = 1;
  select * into r from public.audit_log where table_name = 'set_logs' order by id desc limit 1;
  assert r.action = 'UPDATE' and (r.old_data ->> 'reps')::int = 10 and (r.new_data ->> 'reps')::int = 11, 'la corrección conserva el valor original';
  assert r.owner_id = '00000000-0000-4000-a000-00000000000a', 'dueña del registro';
  delete from public.body_measurements;
  assert (select count(*) from public.audit_log where table_name = 'body_measurements' and action = 'DELETE') = 1, 'el borrado queda registrado';
  begin
    delete from public.audit_log;
    update public.audit_log set old_data = '{}'::jsonb;
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.audit_log) >= 2, 'el historial no se puede borrar ni alterar';
end;
$$;

-- ---------- 7. Exportar e importar sin duplicar ----------
do $$
declare
  v_export jsonb;
  v_result jsonb;
begin
  perform pg_temp.ana();
  v_export := public.export_my_data();
  assert v_export ->> 'format' = 'dinovance-gym' and jsonb_array_length(v_export -> 'workouts') = 1, 'exportación de Ana';
  assert jsonb_array_length(v_export -> 'workouts' -> 0 -> 'sets') = 5, 'la exportación trae las 5 series';
  assert v_export::text !~ 'beto', 'la exportación de Ana no trae nada de Beto';

  -- Importar lo mismo en la cuenta de Ana: ya existe, no se duplica.
  v_result := public.import_my_workouts(v_export -> 'workouts');
  assert (v_result ->> 'imported')::int = 0 and (v_result ->> 'skipped_existing')::int = 1, format('reimportación: %s', v_result);

  -- Importar un entrenamiento nuevo y uno inválido: el inválido se rechaza completo.
  v_result := public.import_my_workouts(jsonb_build_array(
    jsonb_build_object('started_at', now() - interval '8 days', 'finished_at', now() - interval '8 days' + interval '50 minutes',
      'sets', jsonb_build_array(jsonb_build_object('exercise_id', 'Leg_Press', 'set_number', 1, 'reps', 9, 'load_value', 80, 'load_unit', 'kg'))),
    jsonb_build_object('started_at', now() - interval '9 days', 'finished_at', now() - interval '9 days' + interval '50 minutes',
      'sets', jsonb_build_array(
        jsonb_build_object('exercise_id', 'Leg_Press', 'set_number', 1, 'reps', 9, 'load_value', 80),
        jsonb_build_object('exercise_id', 'No_Existe', 'set_number', 1, 'reps', 9)))));
  assert (v_result ->> 'imported')::int = 1 and jsonb_array_length(v_result -> 'rejected') = 1, format('importación: %s', v_result);
  assert (select count(*) from public.workout_logs) = 2, 'solo entró el entrenamiento válido';
  assert (select count(*) from public.workout_logs where source = 'importado') = 1, 'queda marcado como importado';
  assert (select count(*) from public.set_logs s join public.workout_logs w on w.id = s.workout_id where w.source = 'importado') = 1, 'sin series a medias';
  -- La progresión ordena por la fecha del entrenamiento, no por la de importación.
  assert (select exercise_id from public.set_history order by started_at limit 1) = 'Leg_Press'
     and (select started_at from public.set_history order by started_at limit 1) < now() - interval '7 days', 'set_history usa la fecha real de la sesión';
  perform pg_temp.beto();
  assert (select count(*) from public.set_history) = 1, 'set_history respeta el RLS';
  perform pg_temp.ana();
end;
$$;

reset role;
select 'OK: pruebas de integración superadas' as resultado;
rollback;
