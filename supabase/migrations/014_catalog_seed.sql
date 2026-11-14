-- GENERADO por scripts/build-catalog-sql.mjs. No editar a mano: cambia las fuentes y vuelve a generar.
-- Datos del catálogo: músculos, patrones de movimiento, ejercicios propios y fichas curadas.
-- Es seguro ejecutarla más de una vez (todo son upserts).

-- ---------- Músculos ----------
insert into public.muscles (code, name_es, name_en, region, level, parent, volume_key) values
  ('pectoral_mayor', 'Pectoral mayor', 'Pectoralis major', 'tren_superior', 'musculo', null, 'chest'),
  ('pectoral_clavicular', 'Pectoral mayor · porción clavicular', 'Pectoralis major, clavicular head', 'tren_superior', 'porcion', 'pectoral_mayor', 'chest'),
  ('pectoral_esternal', 'Pectoral mayor · porción esternal', 'Pectoralis major, sternal head', 'tren_superior', 'porcion', 'pectoral_mayor', 'chest'),
  ('pectoral_abdominal', 'Pectoral mayor · porción abdominal', 'Pectoralis major, abdominal part', 'tren_superior', 'porcion', 'pectoral_mayor', 'chest'),
  ('deltoides', 'Deltoides', 'Deltoid', 'tren_superior', 'musculo', null, 'shoulders'),
  ('deltoides_anterior', 'Deltoides anterior', 'Anterior deltoid', 'tren_superior', 'porcion', 'deltoides', 'shoulders'),
  ('deltoides_lateral', 'Deltoides lateral', 'Lateral deltoid', 'tren_superior', 'porcion', 'deltoides', 'shoulders'),
  ('deltoides_posterior', 'Deltoides posterior', 'Posterior deltoid', 'tren_superior', 'porcion', 'deltoides', 'shoulders'),
  ('trapecio', 'Trapecio', 'Trapezius', 'tren_superior', 'musculo', null, 'traps'),
  ('trapecio_superior', 'Trapecio superior', 'Upper trapezius', 'tren_superior', 'porcion', 'trapecio', 'traps'),
  ('trapecio_medio', 'Trapecio medio', 'Middle trapezius', 'tren_superior', 'porcion', 'trapecio', 'middle back'),
  ('trapecio_inferior', 'Trapecio inferior', 'Lower trapezius', 'tren_superior', 'porcion', 'trapecio', 'middle back'),
  ('romboides', 'Romboides', 'Rhomboids', 'tren_superior', 'musculo', null, 'middle back'),
  ('dorsal_ancho', 'Dorsal ancho', 'Latissimus dorsi', 'tren_superior', 'musculo', null, 'lats'),
  ('redondo_mayor', 'Redondo mayor', 'Teres major', 'tren_superior', 'musculo', null, 'lats'),
  ('redondo_menor', 'Redondo menor', 'Teres minor', 'tren_superior', 'musculo', null, 'shoulders'),
  ('biceps_braquial', 'Bíceps braquial', 'Biceps brachii', 'tren_superior', 'musculo', null, 'biceps'),
  ('braquial', 'Braquial', 'Brachialis', 'tren_superior', 'musculo', null, 'biceps'),
  ('braquiorradial', 'Braquiorradial', 'Brachioradialis', 'tren_superior', 'musculo', null, 'forearms'),
  ('triceps', 'Tríceps braquial', 'Triceps brachii', 'tren_superior', 'musculo', null, 'triceps'),
  ('triceps_cabeza_larga', 'Tríceps · cabeza larga', 'Triceps, long head', 'tren_superior', 'porcion', 'triceps', 'triceps'),
  ('triceps_cabeza_lateral', 'Tríceps · cabeza lateral', 'Triceps, lateral head', 'tren_superior', 'porcion', 'triceps', 'triceps'),
  ('triceps_cabeza_medial', 'Tríceps · cabeza medial', 'Triceps, medial head', 'tren_superior', 'porcion', 'triceps', 'triceps'),
  ('antebrazo', 'Antebrazos y agarre', 'Forearms and grip', 'tren_superior', 'grupo', null, 'forearms'),
  ('flexores_antebrazo', 'Flexores de muñeca y dedos (agarre)', 'Wrist and finger flexors', 'tren_superior', 'musculo', 'antebrazo', 'forearms'),
  ('extensores_antebrazo', 'Extensores de muñeca', 'Wrist extensors', 'tren_superior', 'musculo', 'antebrazo', 'forearms'),
  ('cuello', 'Musculatura del cuello', 'Neck muscles', 'tren_superior', 'grupo', null, 'neck'),
  ('recto_abdominal', 'Recto abdominal', 'Rectus abdominis', 'core', 'musculo', null, 'abdominals'),
  ('oblicuo_externo', 'Oblicuo externo', 'External oblique', 'core', 'musculo', null, 'abdominals'),
  ('oblicuo_interno', 'Oblicuo interno', 'Internal oblique', 'core', 'musculo', null, 'abdominals'),
  ('transverso_abdominal', 'Transverso abdominal', 'Transversus abdominis', 'core', 'musculo', null, 'abdominals'),
  ('erectores_espinales', 'Erectores espinales', 'Erector spinae', 'core', 'musculo', null, 'lower back'),
  ('lumbar', 'Musculatura lumbar', 'Lumbar muscles', 'core', 'grupo', null, 'lower back'),
  ('cuadrado_lumbar', 'Cuadrado lumbar', 'Quadratus lumborum', 'core', 'musculo', 'lumbar', 'lower back'),
  ('multifidos', 'Multífidos', 'Multifidus', 'core', 'musculo', 'lumbar', 'lower back'),
  ('cuadriceps', 'Cuádriceps', 'Quadriceps femoris', 'tren_inferior', 'musculo', null, 'quadriceps'),
  ('recto_femoral', 'Recto femoral', 'Rectus femoris', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  ('vasto_lateral', 'Vasto lateral', 'Vastus lateralis', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  ('vasto_medial', 'Vasto medial', 'Vastus medialis', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  ('vasto_intermedio', 'Vasto intermedio', 'Vastus intermedius', 'tren_inferior', 'porcion', 'cuadriceps', 'quadriceps'),
  ('isquiotibiales', 'Isquiotibiales', 'Hamstrings', 'tren_inferior', 'grupo', null, 'hamstrings'),
  ('biceps_femoral', 'Bíceps femoral', 'Biceps femoris', 'tren_inferior', 'musculo', 'isquiotibiales', 'hamstrings'),
  ('semitendinoso', 'Semitendinoso', 'Semitendinosus', 'tren_inferior', 'musculo', 'isquiotibiales', 'hamstrings'),
  ('semimembranoso', 'Semimembranoso', 'Semimembranosus', 'tren_inferior', 'musculo', 'isquiotibiales', 'hamstrings'),
  ('gluteos', 'Glúteos', 'Gluteal muscles', 'tren_inferior', 'grupo', null, 'glutes'),
  ('gluteo_mayor', 'Glúteo mayor', 'Gluteus maximus', 'tren_inferior', 'musculo', 'gluteos', 'glutes'),
  ('gluteo_medio', 'Glúteo medio', 'Gluteus medius', 'tren_inferior', 'musculo', 'gluteos', 'abductors'),
  ('gluteo_menor', 'Glúteo menor', 'Gluteus minimus', 'tren_inferior', 'musculo', 'gluteos', 'abductors'),
  ('aductores', 'Aductores de cadera', 'Hip adductors', 'tren_inferior', 'grupo', null, 'adductors'),
  ('aductor_mayor', 'Aductor mayor', 'Adductor magnus', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  ('aductor_largo', 'Aductor largo', 'Adductor longus', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  ('aductor_corto', 'Aductor corto', 'Adductor brevis', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  ('gracil', 'Grácil', 'Gracilis', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  ('pectineo', 'Pectíneo', 'Pectineus', 'tren_inferior', 'musculo', 'aductores', 'adductors'),
  ('abductores_cadera', 'Abductores de cadera', 'Hip abductors', 'tren_inferior', 'grupo', null, 'abductors'),
  ('tensor_fascia_lata', 'Tensor de la fascia lata', 'Tensor fasciae latae', 'tren_inferior', 'musculo', 'abductores_cadera', 'abductors'),
  ('flexores_cadera', 'Flexores de cadera', 'Hip flexors', 'tren_inferior', 'grupo', null, 'hip flexors'),
  ('iliopsoas', 'Iliopsoas', 'Iliopsoas', 'tren_inferior', 'musculo', 'flexores_cadera', 'hip flexors'),
  ('gastrocnemio', 'Gastrocnemio', 'Gastrocnemius', 'tren_inferior', 'musculo', null, 'calves'),
  ('soleo', 'Sóleo', 'Soleus', 'tren_inferior', 'musculo', null, 'calves'),
  ('tibial_anterior', 'Tibial anterior', 'Tibialis anterior', 'tren_inferior', 'musculo', null, 'tibialis'),
  ('peroneos', 'Peroneos', 'Fibularis (peroneal) muscles', 'tren_inferior', 'musculo', null, 'peroneals')
on conflict (code) do update set name_es = excluded.name_es, name_en = excluded.name_en, region = excluded.region,
  level = excluded.level, parent = excluded.parent, volume_key = excluded.volume_key;

-- ---------- Patrones de movimiento ----------
insert into public.movement_patterns (code, name_es, name_en) values
  ('empuje_horizontal', 'Empuje horizontal', 'Horizontal push'),
  ('empuje_vertical', 'Empuje vertical', 'Vertical push'),
  ('traccion_horizontal', 'Tracción horizontal', 'Horizontal pull'),
  ('traccion_vertical', 'Tracción vertical', 'Vertical pull'),
  ('dominante_rodilla', 'Dominante de rodilla', 'Knee dominant'),
  ('dominante_cadera', 'Dominante de cadera', 'Hip dominant (hinge)'),
  ('flexion_rodilla', 'Flexión de rodilla', 'Knee flexion'),
  ('extension_rodilla', 'Extensión de rodilla', 'Knee extension'),
  ('extension_cadera', 'Extensión de cadera', 'Hip extension'),
  ('aduccion_cadera', 'Aducción de cadera', 'Hip adduction'),
  ('abduccion_cadera', 'Abducción de cadera', 'Hip abduction'),
  ('flexion_cadera', 'Flexión de cadera', 'Hip flexion'),
  ('flexion_plantar', 'Flexión plantar', 'Plantar flexion'),
  ('flexion_dorsal', 'Flexión dorsal', 'Dorsiflexion'),
  ('eversion_tobillo', 'Eversión de tobillo', 'Ankle eversion'),
  ('core_estabilidad', 'Estabilidad y trabajo de core', 'Core stability'),
  ('flexion_columna', 'Flexión de columna', 'Spinal flexion'),
  ('extension_columna', 'Extensión de columna', 'Spinal extension'),
  ('flexion_codo', 'Flexión de codo', 'Elbow flexion'),
  ('extension_codo', 'Extensión de codo', 'Elbow extension'),
  ('abduccion_hombro', 'Abducción de hombro', 'Shoulder abduction'),
  ('flexion_hombro', 'Flexión de hombro', 'Shoulder flexion'),
  ('aduccion_horizontal_hombro', 'Aducción horizontal de hombro', 'Shoulder horizontal adduction'),
  ('abduccion_horizontal_hombro', 'Abducción horizontal de hombro', 'Shoulder horizontal abduction'),
  ('extension_hombro', 'Extensión de hombro', 'Shoulder extension'),
  ('elevacion_escapular', 'Elevación escapular', 'Scapular elevation'),
  ('antebrazo_agarre', 'Antebrazo y agarre', 'Forearm and grip')
on conflict (code) do update set name_es = excluded.name_es, name_en = excluded.name_en;

-- ---------- Ejercicios propios (reales, pero ausentes en free-exercise-db) ----------
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Copenhagen_Plank', 'Copenhagen Plank', 'Plancha Copenhague (aductores)', 'strength', 'intermediate', 'static', 'isolation', 'body only', array['Túmbate de lado con el antebrazo en el suelo y la pierna de arriba apoyada sobre un banco (rodilla o tobillo).', 'Eleva la cadera hasta que el cuerpo quede en línea recta, empujando el banco con la pierna de arriba.', 'La pierna de abajo queda en el aire, junto a la de arriba.', 'Mantén la posición el tiempo indicado y cambia de lado.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Side_Lying_Hip_Adduction', 'Side Lying Hip Adduction', 'Aducción de cadera tumbado de lado', 'strength', 'beginner', 'pull', 'isolation', 'body only', array['Túmbate de lado. Cruza la pierna de arriba por delante y apoya ese pie en el suelo.', 'Con la pierna de abajo estirada, elévala hacia el techo sin girar la cadera.', 'Mantén un segundo arriba y baja con control.', 'Completa las repeticiones y cambia de lado.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Dumbbell_Lateral_Lunge', 'Dumbbell Lateral Lunge', 'Zancada lateral con mancuerna', 'strength', 'beginner', 'push', 'compound', 'dumbbell', array['De pie, sostén una mancuerna frente al pecho o una en cada mano.', 'Da un paso amplio hacia un lado y flexiona esa rodilla llevando la cadera atrás; la otra pierna queda estirada.', 'Baja hasta donde mantengas el talón apoyado y la espalda recta.', 'Empuja el suelo para volver al centro y repite; luego cambia de lado.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Cable_Hip_Abduction', 'Cable Hip Abduction', 'Abducción de cadera en polea', 'strength', 'beginner', 'push', 'isolation', 'cable', array['Engancha la tobillera de la polea baja en el tobillo más alejado de la máquina.', 'De pie, de lado a la polea y sujeto a un apoyo, separa la pierna hacia fuera sin inclinar el tronco.', 'Mantén un segundo y vuelve con control.', 'Completa las repeticiones y cambia de lado.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Side_Lying_Hip_Abduction', 'Side Lying Hip Abduction', 'Abducción de cadera tumbado de lado', 'strength', 'beginner', 'push', 'isolation', 'body only', array['Túmbate de lado con las piernas estiradas y la cadera alineada.', 'Eleva la pierna de arriba hacia el techo, con el talón guiando y sin llevarla hacia delante.', 'Mantén un segundo arriba y baja con control.', 'Completa las repeticiones y cambia de lado.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Tibialis_Raise', 'Tibialis Raise', 'Elevación de puntas (tibial anterior)', 'strength', 'beginner', 'pull', 'isolation', 'body only', array['Apoya la espalda y la cadera en una pared, con los pies adelantados unos 30 cm y las piernas estiradas.', 'Eleva las puntas de los pies lo más alto posible, apoyado en los talones.', 'Mantén un segundo arriba y baja con control.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Band_Ankle_Eversion', 'Band Ankle Eversion', 'Eversión de tobillo con banda', 'strength', 'beginner', 'push', 'isolation', 'bands', array['Sentado con la pierna estirada, pasa una banda por el antepié y ánclala hacia el lado interno.', 'Sin mover la rodilla, gira la planta del pie hacia fuera contra la banda.', 'Vuelve con control y repite; luego cambia de pie.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';
insert into public.exercises (id, name, name_es, category, level, force_type, mechanic, equipment, instructions_es, source)
values ('DV_Bird_Dog', 'Bird Dog', 'Bird dog (perro-pájaro)', 'strength', 'beginner', 'static', 'compound', 'body only', array['En cuadrupedia, manos bajo los hombros y rodillas bajo la cadera.', 'Extiende a la vez un brazo al frente y la pierna contraria atrás, sin arquear la espalda.', 'Mantén dos segundos, vuelve con control y cambia de lado.']::text[], 'dinovance')
on conflict (id) do update set name = excluded.name, name_es = excluded.name_es, level = excluded.level, force_type = excluded.force_type,
  mechanic = excluded.mechanic, equipment = excluded.equipment, instructions_es = excluded.instructions_es, source = 'dinovance';

-- ---------- Copia de los músculos originales del dataset (una sola vez) ----------
update public.exercises set dataset_muscles = jsonb_build_object('primary', to_jsonb(primary_muscles), 'secondary', to_jsonb(secondary_muscles))
where dataset_muscles is null and source = 'free-exercise-db';

-- ---------- Músculos de cada ejercicio según el dataset (sin inventar porciones) ----------
with map(dataset_muscle, code) as (values
  ('chest', 'pectoral_mayor'),
  ('shoulders', 'deltoides'),
  ('traps', 'trapecio'),
  ('middle back', 'romboides'),
  ('lats', 'dorsal_ancho'),
  ('biceps', 'biceps_braquial'),
  ('triceps', 'triceps'),
  ('forearms', 'antebrazo'),
  ('neck', 'cuello'),
  ('abdominals', 'recto_abdominal'),
  ('lower back', 'erectores_espinales'),
  ('quadriceps', 'cuadriceps'),
  ('hamstrings', 'isquiotibiales'),
  ('glutes', 'gluteo_mayor'),
  ('adductors', 'aductores'),
  ('abductors', 'abductores_cadera'),
  ('calves', 'gastrocnemio')
)
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select e.id, map.code, 'principal', least(u.ord, 20)::smallint, 'dataset'
from public.exercises e
cross join lateral unnest(e.primary_muscles) with ordinality as u(muscle, ord)
join map on map.dataset_muscle = u.muscle
where e.review_status <> 'verificado'
on conflict (exercise_id, muscle_code) do nothing;

with map(dataset_muscle, code) as (values
  ('chest', 'pectoral_mayor'),
  ('shoulders', 'deltoides'),
  ('traps', 'trapecio'),
  ('middle back', 'romboides'),
  ('lats', 'dorsal_ancho'),
  ('biceps', 'biceps_braquial'),
  ('triceps', 'triceps'),
  ('forearms', 'antebrazo'),
  ('neck', 'cuello'),
  ('abdominals', 'recto_abdominal'),
  ('lower back', 'erectores_espinales'),
  ('quadriceps', 'cuadriceps'),
  ('hamstrings', 'isquiotibiales'),
  ('glutes', 'gluteo_mayor'),
  ('adductors', 'aductores'),
  ('abductors', 'abductores_cadera'),
  ('calves', 'gastrocnemio')
)
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select e.id, map.code, 'secundario', least(u.ord, 20)::smallint, 'dataset'
from public.exercises e
cross join lateral unnest(e.secondary_muscles) with ordinality as u(muscle, ord)
join map on map.dataset_muscle = u.muscle
where e.review_status <> 'verificado'
on conflict (exercise_id, muscle_code) do nothing;

-- ---------- Patrón PROVISIONAL por nombre para lo no curado (queda pendiente de revisión) ----------
-- Se recalcula entero en cada ejecución: así un cambio de reglas no deja patrones viejos.
update public.exercises set movement_pattern = null where review_status <> 'verificado';
update public.exercises set movement_pattern = 'aduccion_cadera'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'adduct';
update public.exercises set movement_pattern = 'abduccion_cadera'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'abduct|monster walk|lateral band walk';
update public.exercises set movement_pattern = 'flexion_plantar'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'calf|calves';
update public.exercises set movement_pattern = 'flexion_rodilla'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'leg curl|ham.?string curl|glute ham';
update public.exercises set movement_pattern = 'extension_rodilla'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'leg extension';
update public.exercises set movement_pattern = 'elevacion_escapular'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'shrug';
update public.exercises set movement_pattern = 'antebrazo_agarre'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'wrist|finger curl|plate pinch|hand squeeze';
update public.exercises set movement_pattern = 'extension_cadera'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'hip thrust|glute bridge|butt lift|glute kickback|cable kickback|pull through|hip extension|hip lift';
update public.exercises set movement_pattern = 'dominante_cadera'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'deadlift|good morning|rack pull';
update public.exercises set movement_pattern = 'extension_columna'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'hyperextension|back extension|superman';
update public.exercises set movement_pattern = 'dominante_rodilla'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'squat|lunge|leg press|step.?up|hack';
update public.exercises set movement_pattern = 'traccion_vertical'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'pulldown|pull[- ]?ups?|chin[- ]?ups?|\ychins?\y';
update public.exercises set movement_pattern = 'traccion_horizontal'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* '\yrows?\y';
update public.exercises set movement_pattern = 'abduccion_horizontal_hombro'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'rear delt|reverse fl|face pull';
update public.exercises set movement_pattern = 'abduccion_hombro'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'lateral raise|side lateral';
update public.exercises set movement_pattern = 'flexion_hombro'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'front.*raise';
update public.exercises set movement_pattern = 'empuje_vertical'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'shoulder press|military press|overhead press|arnold|push press';
update public.exercises set movement_pattern = 'aduccion_horizontal_hombro'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'fly|flye|butterfly|crossover|pec deck';
update public.exercises set movement_pattern = 'empuje_horizontal'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'bench press|chest press|push-?ups?\y|\ydips?\y';
update public.exercises set movement_pattern = 'extension_codo'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'pushdown|triceps? extension|skull|kickback|triceps? press|french press';
update public.exercises set movement_pattern = 'flexion_codo'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'curl';
update public.exercises set movement_pattern = 'core_estabilidad'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'plank|side bridge|dead bug|pallof|bird dog|hollow';
update public.exercises set movement_pattern = 'flexion_cadera'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'leg raise|knee raise|hip raise';
update public.exercises set movement_pattern = 'flexion_columna'
where movement_pattern is null and review_status <> 'verificado'
  and category not in ('stretching', 'cardio') and name ~* 'crunch|sit-?up';

-- ---------- Fichas curadas (verificadas) ----------
update public.exercises set movement_pattern = 'aduccion_cadera', muscle_function = 'Aducción de cadera: acercar el muslo a la línea media contra resistencia.',
  common_errors = array['Abrir más de lo que la movilidad permite', 'Cerrar de golpe y soltar la vuelta', 'Despegar la espalda del respaldo']::text[], variants = array['Aducción en polea', 'Aducción con banda', 'Plancha Copenhague']::text[], precautions = array['Con molestia en la ingle o el pubis, reduce el recorrido y la carga', 'Empieza con una apertura moderada y amplíala de a poco']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['adductors']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Thigh_Adductor';
delete from public.exercise_muscles where exercise_id = 'Thigh_Adductor';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Thigh_Adductor', v.code, v.role, v.pos, 'curado'
from (values ('aductor_mayor', 'principal', 1::smallint), ('aductor_largo', 'principal', 2::smallint), ('aductor_corto', 'principal', 3::smallint), ('gracil', 'secundario', 1::smallint), ('pectineo', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Thigh_Adductor');
update public.exercises set movement_pattern = 'aduccion_cadera', muscle_function = 'Aducción de cadera de pie, una pierna a la vez, con la polea baja.',
  common_errors = array['Inclinar el tronco para ayudarse', 'Girar la cadera en vez de cruzar la pierna', 'Usar impulso']::text[], variants = array['Máquina de aductores', 'Aducción con banda']::text[], precautions = array['Sujétate de un apoyo firme', 'Con molestia en la ingle, reduce el recorrido']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['adductors']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Cable_Hip_Adduction';
delete from public.exercise_muscles where exercise_id = 'Cable_Hip_Adduction';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Cable_Hip_Adduction', v.code, v.role, v.pos, 'curado'
from (values ('aductor_mayor', 'principal', 1::smallint), ('aductor_largo', 'principal', 2::smallint), ('aductor_corto', 'principal', 3::smallint), ('gracil', 'secundario', 1::smallint), ('pectineo', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Cable_Hip_Adduction');
update public.exercises set movement_pattern = 'aduccion_cadera', muscle_function = 'Aducción de cadera de pie con banda elástica anclada a un lado.',
  common_errors = array['Inclinar el tronco', 'Dejar que la banda tire la pierna de vuelta sin control']::text[], variants = array['Aducción en polea', 'Máquina de aductores']::text[], precautions = array['Ancla la banda a un punto firme y a la altura del tobillo']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['adductors']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Band_Hip_Adductions';
delete from public.exercise_muscles where exercise_id = 'Band_Hip_Adductions';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Band_Hip_Adductions', v.code, v.role, v.pos, 'curado'
from (values ('aductor_mayor', 'principal', 1::smallint), ('aductor_largo', 'principal', 2::smallint), ('aductor_corto', 'principal', 3::smallint), ('gracil', 'secundario', 1::smallint), ('pectineo', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Band_Hip_Adductions');
update public.exercises set movement_pattern = 'aduccion_cadera', muscle_function = 'Aducción isométrica de cadera: la pierna de arriba sostiene el cuerpo en plancha lateral.',
  common_errors = array['Dejar caer la cadera', 'Apoyar solo el pie cuando aún no hay fuerza suficiente', 'Rotar el tronco hacia el suelo']::text[], variants = array['Plancha Copenhague con rodilla apoyada', 'Aducción lateral tumbado']::text[], precautions = array['Es exigente para la ingle: empieza apoyando la rodilla (palanca corta) y con pocos segundos', 'No se recomienda con dolor activo en aductores o pubis']::text[], safety_notes = array['Progresa primero el tiempo y después la palanca (rodilla → tobillo)', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 1, rep_range_max = 1, required_gear = array['banco']::text[],
  primary_muscles = array['adductors']::text[], secondary_muscles = array['abdominals']::text[], review_status = 'verificado'
where id = 'DV_Copenhagen_Plank';
delete from public.exercise_muscles where exercise_id = 'DV_Copenhagen_Plank';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Copenhagen_Plank', v.code, v.role, v.pos, 'curado'
from (values ('aductor_largo', 'principal', 1::smallint), ('aductor_mayor', 'principal', 2::smallint), ('aductor_corto', 'principal', 3::smallint), ('gracil', 'secundario', 1::smallint), ('oblicuo_externo', 'secundario', 2::smallint), ('oblicuo_interno', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Copenhagen_Plank');
update public.exercises set movement_pattern = 'aduccion_cadera', muscle_function = 'Aducción de cadera contra la gravedad, tumbado de lado, elevando la pierna de abajo.',
  common_errors = array['Rotar la cadera hacia atrás', 'Subir con impulso', 'Recorrido demasiado corto']::text[], variants = array['Con tobillera lastrada', 'Aducción con banda', 'Máquina de aductores']::text[], precautions = array['Apto para empezar: sin carga externa']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['adductors']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'DV_Side_Lying_Hip_Adduction';
delete from public.exercise_muscles where exercise_id = 'DV_Side_Lying_Hip_Adduction';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Side_Lying_Hip_Adduction', v.code, v.role, v.pos, 'curado'
from (values ('aductor_largo', 'principal', 1::smallint), ('aductor_mayor', 'principal', 2::smallint), ('aductor_corto', 'principal', 3::smallint), ('gracil', 'secundario', 1::smallint), ('pectineo', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Side_Lying_Hip_Adduction');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Sentadilla con apoyo ancho y pies hacia fuera: extensión de rodilla y cadera con mayor demanda de aductores.',
  common_errors = array['Rodillas que caen hacia dentro', 'Inclinar demasiado el tronco', 'Quedarse corto de profundidad']::text[], variants = array['Sentadilla sumo con barra', 'Sentadilla goblet']::text[], precautions = array['Las rodillas siguen la dirección de las puntas de los pies', 'Con molestia en la ingle, reduce la apertura']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings', 'lower back']::text[], review_status = 'verificado'
where id = 'Plie_Dumbbell_Squat';
delete from public.exercise_muscles where exercise_id = 'Plie_Dumbbell_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Plie_Dumbbell_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('aductor_largo', 'secundario', 2::smallint), ('isquiotibiales', 'secundario', 3::smallint), ('erectores_espinales', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Plie_Dumbbell_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Sentadilla con barra y apoyo ancho: extensión de rodilla y cadera con más trabajo de aductor mayor.',
  common_errors = array['Rodillas hacia dentro', 'Perder la tensión de la espalda', 'Levantar los talones']::text[], variants = array['Sentadilla con barra', 'Sentadilla plié con mancuerna']::text[], precautions = array['Usa rack con seguros', 'Requiere buena movilidad de cadera']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Usa los seguros del rack a la altura correcta']::text[],
  rep_range_min = 5, rep_range_max = 10, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings', 'lower back']::text[], review_status = 'verificado'
where id = 'Wide_Stance_Barbell_Squat';
delete from public.exercise_muscles where exercise_id = 'Wide_Stance_Barbell_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Wide_Stance_Barbell_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint), ('erectores_espinales', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Wide_Stance_Barbell_Squat');
update public.exercises set movement_pattern = 'dominante_cadera', muscle_function = 'Peso muerto con apoyo ancho: extensión de cadera y rodilla; el aductor mayor ayuda a extender la cadera.',
  common_errors = array['Redondear la zona lumbar', 'Rodillas hacia dentro al despegar', 'Subir la cadera antes que la barra']::text[], variants = array['Peso muerto convencional', 'Peso muerto rumano']::text[], precautions = array['Técnica exigente: aprende con poco peso', 'No recomendado con dolor lumbar activo']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'La barra viaja pegada al cuerpo']::text[],
  rep_range_min = 3, rep_range_max = 8, required_gear = null,
  primary_muscles = array['glutes', 'hamstrings', 'quadriceps']::text[], secondary_muscles = array['adductors', 'lower back', 'traps', 'forearms']::text[], review_status = 'verificado'
where id = 'Sumo_Deadlift';
delete from public.exercise_muscles where exercise_id = 'Sumo_Deadlift';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Sumo_Deadlift', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'principal', 2::smallint), ('cuadriceps', 'principal', 3::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('erectores_espinales', 'secundario', 2::smallint), ('trapecio', 'secundario', 3::smallint), ('flexores_antebrazo', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Sumo_Deadlift');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Zancada en el plano frontal: la pierna que queda estirada alarga los aductores bajo carga.',
  common_errors = array['Rodilla que se va hacia dentro', 'Levantar el talón de la pierna que flexiona', 'Redondear la espalda']::text[], variants = array['Zancada lateral sin peso', 'Sentadilla cosaca']::text[], precautions = array['Empieza sin peso y con paso corto', 'Con molestia en la ingle, reduce la amplitud del paso']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 12, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'abductors', 'hamstrings']::text[], review_status = 'verificado'
where id = 'DV_Dumbbell_Lateral_Lunge';
delete from public.exercise_muscles where exercise_id = 'DV_Dumbbell_Lateral_Lunge';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Dumbbell_Lateral_Lunge', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('aductor_largo', 'secundario', 2::smallint), ('gluteo_medio', 'secundario', 3::smallint), ('isquiotibiales', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Dumbbell_Lateral_Lunge');
update public.exercises set movement_pattern = 'abduccion_cadera', muscle_function = 'Abducción de cadera sentado: separar los muslos contra resistencia.',
  common_errors = array['Usar impulso', 'Recorrido muy corto', 'Dejar que el peso cierre las piernas de golpe']::text[], variants = array['Abducción en polea', 'Abducción tumbado de lado', 'Caminata lateral con banda']::text[], precautions = array['Con dolor lateral de cadera, baja la carga']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abductors']::text[], secondary_muscles = array['glutes']::text[], review_status = 'verificado'
where id = 'Thigh_Abductor';
delete from public.exercise_muscles where exercise_id = 'Thigh_Abductor';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Thigh_Abductor', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_medio', 'principal', 1::smallint), ('gluteo_menor', 'principal', 2::smallint), ('tensor_fascia_lata', 'secundario', 1::smallint), ('gluteo_mayor', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Thigh_Abductor');
update public.exercises set movement_pattern = 'abduccion_cadera', muscle_function = 'Abducción de cadera en apoyo: pasos con banda manteniendo la tensión.',
  common_errors = array['Juntar los pies entre pasos', 'Rodillas hacia dentro', 'Balancear el tronco']::text[], variants = array['Caminata lateral con banda', 'Máquina de abductores']::text[], precautions = array['Elige una banda que permita mantener la postura']::text[], safety_notes = array['Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abductors']::text[], secondary_muscles = array['glutes']::text[], review_status = 'verificado'
where id = 'Monster_Walk';
delete from public.exercise_muscles where exercise_id = 'Monster_Walk';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Monster_Walk', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_medio', 'principal', 1::smallint), ('gluteo_menor', 'principal', 2::smallint), ('tensor_fascia_lata', 'secundario', 1::smallint), ('gluteo_mayor', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Monster_Walk');
update public.exercises set movement_pattern = 'abduccion_cadera', muscle_function = 'Abducción de cadera de pie con polea baja, una pierna a la vez.',
  common_errors = array['Inclinar el tronco hacia el lado contrario', 'Girar la punta del pie hacia fuera', 'Usar impulso']::text[], variants = array['Máquina de abductores', 'Abducción tumbado de lado']::text[], precautions = array['Sujétate de un apoyo firme']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abductors']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'DV_Cable_Hip_Abduction';
delete from public.exercise_muscles where exercise_id = 'DV_Cable_Hip_Abduction';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Cable_Hip_Abduction', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_medio', 'principal', 1::smallint), ('gluteo_menor', 'principal', 2::smallint), ('tensor_fascia_lata', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Cable_Hip_Abduction');
update public.exercises set movement_pattern = 'abduccion_cadera', muscle_function = 'Abducción de cadera contra la gravedad, tumbado de lado.',
  common_errors = array['Llevar la pierna hacia delante', 'Girar la cadera hacia atrás', 'Subir con impulso']::text[], variants = array['Con tobillera lastrada o banda', 'Máquina de abductores']::text[], precautions = array['Apto para empezar: sin carga externa']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abductors']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'DV_Side_Lying_Hip_Abduction';
delete from public.exercise_muscles where exercise_id = 'DV_Side_Lying_Hip_Abduction';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Side_Lying_Hip_Abduction', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_medio', 'principal', 1::smallint), ('gluteo_menor', 'principal', 2::smallint), ('tensor_fascia_lata', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Side_Lying_Hip_Abduction');
update public.exercises set movement_pattern = 'flexion_plantar', muscle_function = 'Flexión plantar con la rodilla extendida: prioriza el gastrocnemio.',
  common_errors = array['Rebotar abajo', 'Recorrido corto', 'Doblar las rodillas para ayudarse']::text[], variants = array['Elevación de talones en prensa', 'Elevación de talones con mancuerna']::text[], precautions = array['Con molestia en el tendón de Aquiles, reduce carga y rebote']::text[], safety_notes = array['Pausa de un segundo abajo y arriba', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['calves']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Standing_Calf_Raises';
delete from public.exercise_muscles where exercise_id = 'Standing_Calf_Raises';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Standing_Calf_Raises', v.code, v.role, v.pos, 'curado'
from (values ('gastrocnemio', 'principal', 1::smallint), ('soleo', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Standing_Calf_Raises');
update public.exercises set movement_pattern = 'flexion_plantar', muscle_function = 'Flexión plantar en la prensa con las rodillas extendidas.',
  common_errors = array['Bloquear las rodillas con brusquedad', 'Recorrido corto', 'Rebotar']::text[], variants = array['Elevación de talones de pie']::text[], precautions = array['Mantén los seguros de la prensa puestos: solo se mueven los tobillos']::text[], safety_notes = array['No quites los seguros de la prensa', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['calves']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Calf_Press_On_The_Leg_Press_Machine';
delete from public.exercise_muscles where exercise_id = 'Calf_Press_On_The_Leg_Press_Machine';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Calf_Press_On_The_Leg_Press_Machine', v.code, v.role, v.pos, 'curado'
from (values ('gastrocnemio', 'principal', 1::smallint), ('soleo', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Calf_Press_On_The_Leg_Press_Machine');
update public.exercises set movement_pattern = 'flexion_plantar', muscle_function = 'Flexión plantar con la rodilla flexionada: el gastrocnemio pierde ventaja y trabaja más el sóleo.',
  common_errors = array['Rebotar', 'Recorrido corto']::text[], variants = array['Elevación de talones sentado con mancuerna']::text[], precautions = array['Con molestia en el tendón de Aquiles, reduce la carga']::text[], safety_notes = array['Pausa abajo y arriba', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['calves']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Seated_Calf_Raise';
delete from public.exercise_muscles where exercise_id = 'Seated_Calf_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Seated_Calf_Raise', v.code, v.role, v.pos, 'curado'
from (values ('soleo', 'principal', 1::smallint), ('gastrocnemio', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Seated_Calf_Raise');
update public.exercises set movement_pattern = 'flexion_plantar', muscle_function = 'Flexión plantar de pie con mancuernas.',
  common_errors = array['Rebotar', 'Perder el equilibrio por ir rápido']::text[], variants = array['Elevación de talones en máquina']::text[], precautions = array['Apóyate si el equilibrio limita el recorrido']::text[], safety_notes = array['Pausa abajo y arriba', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['calves']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Standing_Dumbbell_Calf_Raise';
delete from public.exercise_muscles where exercise_id = 'Standing_Dumbbell_Calf_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Standing_Dumbbell_Calf_Raise', v.code, v.role, v.pos, 'curado'
from (values ('gastrocnemio', 'principal', 1::smallint), ('soleo', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Standing_Dumbbell_Calf_Raise');
update public.exercises set movement_pattern = 'flexion_dorsal', muscle_function = 'Flexión dorsal del tobillo: elevar las puntas de los pies con los talones apoyados.',
  common_errors = array['Doblar las rodillas', 'Recorrido corto', 'Ir demasiado rápido']::text[], variants = array['Con banda elástica sentado']::text[], precautions = array['Cuanto más lejos de la pared estén los pies, más difícil']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 25, required_gear = null,
  primary_muscles = array['tibialis']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'DV_Tibialis_Raise';
delete from public.exercise_muscles where exercise_id = 'DV_Tibialis_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Tibialis_Raise', v.code, v.role, v.pos, 'curado'
from (values ('tibial_anterior', 'principal', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Tibialis_Raise');
update public.exercises set movement_pattern = 'eversion_tobillo', muscle_function = 'Eversión del tobillo contra una banda: llevar la planta del pie hacia fuera.',
  common_errors = array['Mover toda la pierna en vez del tobillo', 'Ir rápido']::text[], variants = '{}'::text[], precautions = array['Tras un esguince de tobillo, hazlo solo con autorización profesional']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['peroneals']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'DV_Band_Ankle_Eversion';
delete from public.exercise_muscles where exercise_id = 'DV_Band_Ankle_Eversion';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Band_Ankle_Eversion', v.code, v.role, v.pos, 'curado'
from (values ('peroneos', 'principal', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Band_Ankle_Eversion');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera con carga axial.',
  common_errors = array['Rodillas hacia dentro', 'Levantar los talones', 'Redondear la espalda', 'Recorrido parcial']::text[], variants = array['Sentadilla en Smith', 'Sentadilla goblet', 'Prensa de piernas']::text[], precautions = array['Usa rack con seguros', 'No recomendado con dolor lumbar o de rodilla activo']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Usa los seguros del rack a la altura correcta']::text[],
  rep_range_min = 5, rep_range_max = 10, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings', 'lower back']::text[], review_status = 'verificado'
where id = 'Barbell_Squat';
delete from public.exercise_muscles where exercise_id = 'Barbell_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint), ('erectores_espinales', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera con recorrido completo.',
  common_errors = array['Rodillas hacia dentro', 'Perder la curvatura lumbar abajo', 'Levantar los talones']::text[], variants = array['Sentadilla con barra', 'Sentadilla hack']::text[], precautions = array['Requiere movilidad de tobillo y cadera', 'Usa rack con seguros']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Usa los seguros del rack a la altura correcta']::text[],
  rep_range_min = 5, rep_range_max = 10, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings', 'lower back']::text[], review_status = 'verificado'
where id = 'Barbell_Full_Squat';
delete from public.exercise_muscles where exercise_id = 'Barbell_Full_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Full_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint), ('erectores_espinales', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Full_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera con la barra guiada.',
  common_errors = array['Pies demasiado atrás', 'Rodillas hacia dentro', 'Recorrido parcial']::text[], variants = array['Sentadilla con barra', 'Sentadilla hack']::text[], precautions = array['Ajusta los topes de seguridad']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Gira la barra para trabarla al terminar']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Smith_Machine_Squat';
delete from public.exercise_muscles where exercise_id = 'Smith_Machine_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Smith_Machine_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Smith_Machine_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera con mancuernas a los lados.',
  common_errors = array['Inclinar el tronco', 'Rodillas hacia dentro']::text[], variants = array['Sentadilla goblet', 'Prensa de piernas']::text[], precautions = array['El agarre puede limitar antes que las piernas']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings', 'lower back']::text[], review_status = 'verificado'
where id = 'Dumbbell_Squat';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint), ('erectores_espinales', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera con la carga al frente: facilita mantener el tronco erguido.',
  common_errors = array['Separar la carga del pecho', 'Rodillas hacia dentro']::text[], variants = array['Sentadilla con mancuernas', 'Sentadilla con barra']::text[], precautions = array['Buena opción para aprender el patrón de sentadilla']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'lower back', 'abdominals']::text[], review_status = 'verificado'
where id = 'Goblet_Squat';
delete from public.exercise_muscles where exercise_id = 'Goblet_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Goblet_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('erectores_espinales', 'secundario', 2::smallint), ('recto_abdominal', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Goblet_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla guiada, con la espalda apoyada.',
  common_errors = array['Despegar la espalda del respaldo', 'Recorrido parcial', 'Rodillas hacia dentro']::text[], variants = array['Prensa de piernas', 'Sentadilla en Smith']::text[], precautions = array['Con dolor de rodilla, limita la profundidad']::text[], safety_notes = array['Coloca los seguros antes de salir', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['quadriceps']::text[], secondary_muscles = array['glutes', 'adductors']::text[], review_status = 'verificado'
where id = 'Hack_Squat';
delete from public.exercise_muscles where exercise_id = 'Hack_Squat';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Hack_Squat', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'secundario', 1::smallint), ('aductor_mayor', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Hack_Squat');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera empujando una plataforma, sin carga sobre la columna.',
  common_errors = array['Despegar la cadera del asiento al bajar', 'Bloquear las rodillas con brusquedad', 'Recorrido parcial']::text[], variants = array['Sentadilla hack', 'Sentadilla en Smith']::text[], precautions = array['No dejes que la zona lumbar se redondee al final del recorrido']::text[], safety_notes = array['Pon los seguros antes de salir', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Leg_Press';
delete from public.exercise_muscles where exercise_id = 'Leg_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Leg_Press', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Leg_Press');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera a una pierna; exige estabilidad de cadera.',
  common_errors = array['Paso demasiado corto', 'Rodilla delantera hacia dentro', 'Inclinar el tronco']::text[], variants = array['Zancada hacia atrás', 'Sentadilla búlgara', 'Subida al cajón']::text[], precautions = array['Con dolor de rodilla, prueba la zancada hacia atrás']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 12, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'abductors', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Dumbbell_Lunges';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Lunges';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Lunges', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('gluteo_medio', 'secundario', 2::smallint), ('isquiotibiales', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Lunges');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Sentadilla a una pierna con el pie trasero elevado.',
  common_errors = array['Apoyar demasiado peso en la pierna de atrás', 'Rodilla delantera hacia dentro', 'Perder el equilibrio por ir rápido']::text[], variants = array['Zancada con mancuernas', 'Sentadilla búlgara en Smith']::text[], precautions = array['Empieza sin peso para encontrar la distancia al banco']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 12, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['adductors', 'abductors', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Split_Squat_with_Dumbbells';
delete from public.exercise_muscles where exercise_id = 'Split_Squat_with_Dumbbells';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Split_Squat_with_Dumbbells', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('aductor_mayor', 'secundario', 1::smallint), ('gluteo_medio', 'secundario', 2::smallint), ('isquiotibiales', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Split_Squat_with_Dumbbells');
update public.exercises set movement_pattern = 'dominante_rodilla', muscle_function = 'Extensión de rodilla y cadera a una pierna subiendo a una plataforma.',
  common_errors = array['Impulsarse con la pierna de abajo', 'Rodilla hacia dentro', 'Bajar sin control']::text[], variants = array['Zancada con mancuernas']::text[], precautions = array['Usa una plataforma estable']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 12, required_gear = null,
  primary_muscles = array['quadriceps', 'glutes']::text[], secondary_muscles = array['abductors', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Dumbbell_Step_Ups';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Step_Ups';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Step_Ups', v.code, v.role, v.pos, 'curado'
from (values ('cuadriceps', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('gluteo_medio', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Step_Ups');
update public.exercises set movement_pattern = 'extension_rodilla', muscle_function = 'Extensión de rodilla aislada.',
  common_errors = array['Usar impulso', 'Despegar la cadera del asiento', 'Dejar caer el peso']::text[], variants = array['Extensión a una pierna']::text[], precautions = array['Con dolor en la parte anterior de la rodilla, reduce carga y recorrido']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['quadriceps']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Leg_Extensions';
delete from public.exercise_muscles where exercise_id = 'Leg_Extensions';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Leg_Extensions', v.code, v.role, v.pos, 'curado'
from (values ('recto_femoral', 'principal', 1::smallint), ('vasto_lateral', 'principal', 2::smallint), ('vasto_medial', 'principal', 3::smallint), ('vasto_intermedio', 'principal', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Leg_Extensions');
update public.exercises set movement_pattern = 'dominante_cadera', muscle_function = 'Bisagra de cadera con rodillas casi extendidas: isquiotibiales en posición alargada.',
  common_errors = array['Redondear la espalda', 'Doblar demasiado las rodillas (se vuelve sentadilla)', 'Alejar la barra del cuerpo']::text[], variants = array['Peso muerto rumano con mancuernas', 'Buenos días', 'Curl femoral']::text[], precautions = array['No recomendado con dolor lumbar activo', 'Baja solo hasta donde la espalda siga neutra']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'La barra viaja pegada a las piernas']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['hamstrings', 'glutes']::text[], secondary_muscles = array['lower back', 'adductors', 'forearms']::text[], review_status = 'verificado'
where id = 'Romanian_Deadlift';
delete from public.exercise_muscles where exercise_id = 'Romanian_Deadlift';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Romanian_Deadlift', v.code, v.role, v.pos, 'curado'
from (values ('isquiotibiales', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('erectores_espinales', 'secundario', 1::smallint), ('aductor_mayor', 'secundario', 2::smallint), ('flexores_antebrazo', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Romanian_Deadlift');
update public.exercises set movement_pattern = 'dominante_cadera', muscle_function = 'Bisagra de cadera con mancuernas.',
  common_errors = array['Redondear la espalda', 'Bajar más de lo que permite la movilidad']::text[], variants = array['Peso muerto rumano con barra']::text[], precautions = array['No recomendado con dolor lumbar activo']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 12, required_gear = null,
  primary_muscles = array['hamstrings', 'glutes']::text[], secondary_muscles = array['lower back', 'adductors']::text[], review_status = 'verificado'
where id = 'Stiff-Legged_Dumbbell_Deadlift';
delete from public.exercise_muscles where exercise_id = 'Stiff-Legged_Dumbbell_Deadlift';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Stiff-Legged_Dumbbell_Deadlift', v.code, v.role, v.pos, 'curado'
from (values ('isquiotibiales', 'principal', 1::smallint), ('gluteo_mayor', 'principal', 2::smallint), ('erectores_espinales', 'secundario', 1::smallint), ('aductor_mayor', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Stiff-Legged_Dumbbell_Deadlift');
update public.exercises set movement_pattern = 'dominante_cadera', muscle_function = 'Extensión de cadera y rodilla levantando la barra desde el suelo.',
  common_errors = array['Redondear la zona lumbar', 'Tirar con los brazos', 'Subir la cadera antes que la barra', 'Alejar la barra']::text[], variants = array['Peso muerto rumano', 'Peso muerto sumo']::text[], precautions = array['Técnica exigente: aprende con poco peso', 'No recomendado con dolor lumbar activo']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'La barra viaja pegada al cuerpo']::text[],
  rep_range_min = 3, rep_range_max = 8, required_gear = null,
  primary_muscles = array['glutes', 'hamstrings', 'lower back']::text[], secondary_muscles = array['quadriceps', 'adductors', 'traps', 'lats', 'forearms']::text[], review_status = 'verificado'
where id = 'Barbell_Deadlift';
delete from public.exercise_muscles where exercise_id = 'Barbell_Deadlift';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Deadlift', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'principal', 2::smallint), ('erectores_espinales', 'principal', 3::smallint), ('cuadriceps', 'secundario', 1::smallint), ('aductor_mayor', 'secundario', 2::smallint), ('trapecio', 'secundario', 3::smallint), ('dorsal_ancho', 'secundario', 4::smallint), ('flexores_antebrazo', 'secundario', 5::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Deadlift');
update public.exercises set movement_pattern = 'extension_columna', muscle_function = 'Extensión de columna y cadera en banco romano.',
  common_errors = array['Hiperextender al subir', 'Usar impulso']::text[], variants = array['Superman', 'Bird dog']::text[], precautions = array['Con dolor lumbar activo, consulta antes']::text[], safety_notes = array['Sube solo hasta alinear el cuerpo', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['lower back']::text[], secondary_muscles = array['glutes', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Hyperextensions_Back_Extensions';
delete from public.exercise_muscles where exercise_id = 'Hyperextensions_Back_Extensions';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Hyperextensions_Back_Extensions', v.code, v.role, v.pos, 'curado'
from (values ('erectores_espinales', 'principal', 1::smallint), ('gluteo_mayor', 'secundario', 1::smallint), ('isquiotibiales', 'secundario', 2::smallint), ('multifidos', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Hyperextensions_Back_Extensions');
update public.exercises set movement_pattern = 'extension_cadera', muscle_function = 'Extensión de cadera con máxima tensión arriba (cadera extendida).',
  common_errors = array['Arquear la zona lumbar arriba', 'Empujar con la punta de los pies', 'Recorrido parcial']::text[], variants = array['Hip thrust en máquina', 'Puente de glúteo con barra']::text[], precautions = array['Usa una almohadilla en la barra', 'Mentón recogido y costillas abajo']::text[], safety_notes = array['Banco firme y que no se deslice', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['glutes']::text[], secondary_muscles = array['hamstrings', 'adductors', 'abductors']::text[], review_status = 'verificado'
where id = 'Barbell_Hip_Thrust';
delete from public.exercise_muscles where exercise_id = 'Barbell_Hip_Thrust';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Hip_Thrust', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'secundario', 1::smallint), ('aductor_mayor', 'secundario', 2::smallint), ('gluteo_medio', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Hip_Thrust');
update public.exercises set movement_pattern = 'extension_cadera', muscle_function = 'Extensión de cadera desde el suelo.',
  common_errors = array['Arquear la zona lumbar', 'Empujar con la punta de los pies']::text[], variants = array['Hip thrust', 'Puente de glúteo a una pierna']::text[], precautions = array['Usa una almohadilla en la barra']::text[], safety_notes = array['Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['glutes']::text[], secondary_muscles = array['hamstrings', 'adductors']::text[], review_status = 'verificado'
where id = 'Barbell_Glute_Bridge';
delete from public.exercise_muscles where exercise_id = 'Barbell_Glute_Bridge';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Glute_Bridge', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'secundario', 1::smallint), ('aductor_mayor', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Glute_Bridge');
update public.exercises set movement_pattern = 'extension_cadera', muscle_function = 'Extensión de cadera sin carga.',
  common_errors = array['Arquear la zona lumbar', 'Subir con impulso']::text[], variants = array['Puente a una pierna', 'Hip thrust']::text[], precautions = array['Apto para empezar']::text[], safety_notes = array['Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['glutes']::text[], secondary_muscles = array['hamstrings']::text[], review_status = 'verificado'
where id = 'Butt_Lift_Bridge';
delete from public.exercise_muscles where exercise_id = 'Butt_Lift_Bridge';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Butt_Lift_Bridge', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Butt_Lift_Bridge');
update public.exercises set movement_pattern = 'extension_cadera', muscle_function = 'Bisagra de cadera con polea entre las piernas.',
  common_errors = array['Tirar con los brazos', 'Redondear la espalda', 'Convertirlo en sentadilla']::text[], variants = array['Peso muerto rumano', 'Hip thrust']::text[], precautions = array['Buena opción para aprender la bisagra']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['glutes', 'hamstrings']::text[], secondary_muscles = array['lower back']::text[], review_status = 'verificado'
where id = 'Pull_Through';
delete from public.exercise_muscles where exercise_id = 'Pull_Through';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Pull_Through', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'principal', 2::smallint), ('erectores_espinales', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Pull_Through');
update public.exercises set movement_pattern = 'extension_cadera', muscle_function = 'Extensión de cadera a una pierna con polea.',
  common_errors = array['Arquear la zona lumbar para subir más', 'Usar impulso']::text[], variants = array['Patada de glúteo en cuadrupedia']::text[], precautions = array['Sujétate de un apoyo firme']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['glutes']::text[], secondary_muscles = array['hamstrings']::text[], review_status = 'verificado'
where id = 'One-Legged_Cable_Kickback';
delete from public.exercise_muscles where exercise_id = 'One-Legged_Cable_Kickback';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'One-Legged_Cable_Kickback', v.code, v.role, v.pos, 'curado'
from (values ('gluteo_mayor', 'principal', 1::smallint), ('isquiotibiales', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'One-Legged_Cable_Kickback');
update public.exercises set movement_pattern = 'flexion_rodilla', muscle_function = 'Flexión de rodilla con la cadera flexionada: isquiotibiales en posición alargada.',
  common_errors = array['Usar impulso', 'Despegar la cadera', 'Soltar la vuelta']::text[], variants = array['Curl femoral tumbado', 'Curl femoral de pie']::text[], precautions = array['Ajusta el eje de la máquina a la rodilla']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['hamstrings']::text[], secondary_muscles = array['calves']::text[], review_status = 'verificado'
where id = 'Seated_Leg_Curl';
delete from public.exercise_muscles where exercise_id = 'Seated_Leg_Curl';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Seated_Leg_Curl', v.code, v.role, v.pos, 'curado'
from (values ('biceps_femoral', 'principal', 1::smallint), ('semitendinoso', 'principal', 2::smallint), ('semimembranoso', 'principal', 3::smallint), ('gastrocnemio', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Seated_Leg_Curl');
update public.exercises set movement_pattern = 'flexion_rodilla', muscle_function = 'Flexión de rodilla tumbado boca abajo.',
  common_errors = array['Levantar la cadera', 'Usar impulso', 'Soltar la vuelta']::text[], variants = array['Curl femoral sentado']::text[], precautions = array['Ajusta el eje de la máquina a la rodilla']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['hamstrings']::text[], secondary_muscles = array['calves']::text[], review_status = 'verificado'
where id = 'Lying_Leg_Curls';
delete from public.exercise_muscles where exercise_id = 'Lying_Leg_Curls';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Lying_Leg_Curls', v.code, v.role, v.pos, 'curado'
from (values ('biceps_femoral', 'principal', 1::smallint), ('semitendinoso', 'principal', 2::smallint), ('semimembranoso', 'principal', 3::smallint), ('gastrocnemio', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Lying_Leg_Curls');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Aducción horizontal de hombro y extensión de codo empujando la barra.',
  common_errors = array['Rebotar la barra en el pecho', 'Codos totalmente abiertos a 90°', 'Despegar los glúteos del banco', 'Perder la retracción escapular']::text[], variants = array['Press con mancuernas', 'Press en máquina', 'Flexiones']::text[], precautions = array['Con cargas altas usa seguros o un ayudante', 'Con dolor de hombro, prueba mancuernas o agarre más cerrado']::text[], safety_notes = array['No entrenes al fallo sin seguros ni ayudante', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 5, rep_range_max = 10, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps']::text[], review_status = 'verificado'
where id = 'Barbell_Bench_Press_-_Medium_Grip';
delete from public.exercise_muscles where exercise_id = 'Barbell_Bench_Press_-_Medium_Grip';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Bench_Press_-_Medium_Grip', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint), ('triceps', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Bench_Press_-_Medium_Grip');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Aducción horizontal de hombro y extensión de codo con mancuernas.',
  common_errors = array['Bajar sin control', 'Chocar las mancuernas arriba', 'Codos totalmente abiertos']::text[], variants = array['Press de banca con barra', 'Press en máquina']::text[], precautions = array['Sube las mancuernas con ayuda de las rodillas']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps']::text[], review_status = 'verificado'
where id = 'Dumbbell_Bench_Press';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Bench_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Bench_Press', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint), ('triceps', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Bench_Press');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje horizontal guiado en máquina.',
  common_errors = array['Despegar la espalda del respaldo', 'Recorrido parcial', 'Encoger los hombros']::text[], variants = array['Press con mancuernas', 'Press de banca']::text[], precautions = array['Ajusta el asiento: agarres a la altura del pecho']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps']::text[], review_status = 'verificado'
where id = 'Leverage_Chest_Press';
delete from public.exercise_muscles where exercise_id = 'Leverage_Chest_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Leverage_Chest_Press', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint), ('triceps', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Leverage_Chest_Press');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje horizontal con el peso corporal y el tronco en plancha.',
  common_errors = array['Cadera caída', 'Codos totalmente abiertos', 'Recorrido parcial']::text[], variants = array['Flexiones con manos elevadas', 'Flexiones con rodillas apoyadas']::text[], precautions = array['Con dolor de muñeca usa agarres o puños']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 20, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps', 'abdominals']::text[], review_status = 'verificado'
where id = 'Pushups';
delete from public.exercise_muscles where exercise_id = 'Pushups';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Pushups', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint), ('triceps', 'secundario', 2::smallint), ('recto_abdominal', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Pushups');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje en banco inclinado: más énfasis en la porción clavicular del pectoral.',
  common_errors = array['Inclinación excesiva (pasa al hombro)', 'Rebotar la barra', 'Despegar los glúteos']::text[], variants = array['Press inclinado con mancuernas']::text[], precautions = array['Con cargas altas usa seguros o un ayudante']::text[], safety_notes = array['No entrenes al fallo sin seguros ni ayudante', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps']::text[], review_status = 'verificado'
where id = 'Barbell_Incline_Bench_Press_-_Medium_Grip';
delete from public.exercise_muscles where exercise_id = 'Barbell_Incline_Bench_Press_-_Medium_Grip';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Incline_Bench_Press_-_Medium_Grip', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_clavicular', 'principal', 1::smallint), ('pectoral_esternal', 'secundario', 1::smallint), ('deltoides_anterior', 'secundario', 2::smallint), ('triceps', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Incline_Bench_Press_-_Medium_Grip');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje en banco inclinado con mancuernas.',
  common_errors = array['Inclinación excesiva', 'Bajar sin control']::text[], variants = array['Press inclinado con barra']::text[], precautions = array['Inclinación de 15° a 30° para priorizar el pectoral']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps']::text[], review_status = 'verificado'
where id = 'Incline_Dumbbell_Press';
delete from public.exercise_muscles where exercise_id = 'Incline_Dumbbell_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Incline_Dumbbell_Press', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_clavicular', 'principal', 1::smallint), ('pectoral_esternal', 'secundario', 1::smallint), ('deltoides_anterior', 'secundario', 2::smallint), ('triceps', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Incline_Dumbbell_Press');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje en banco declinado: más énfasis en las fibras inferiores del pectoral.',
  common_errors = array['Rebotar la barra', 'Recorrido parcial']::text[], variants = array['Fondos en paralelas', 'Cruce de poleas de arriba abajo']::text[], precautions = array['Usa ayudante: la posición dificulta salir de la barra', 'Evítalo con presión arterial alta no controlada']::text[], safety_notes = array['No entrenes al fallo sin ayudante', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders', 'triceps']::text[], review_status = 'verificado'
where id = 'Decline_Barbell_Bench_Press';
delete from public.exercise_muscles where exercise_id = 'Decline_Barbell_Bench_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Decline_Barbell_Bench_Press', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_abdominal', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint), ('triceps', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Decline_Barbell_Bench_Press');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje hacia abajo con el tronco inclinado: fibras inferiores del pectoral y tríceps.',
  common_errors = array['Bajar más de lo que el hombro tolera', 'Encoger los hombros', 'Balancearse']::text[], variants = array['Fondos asistidos', 'Press declinado']::text[], precautions = array['No recomendado con dolor de hombro']::text[], safety_notes = array['Baja hasta que el brazo quede paralelo al suelo, no más', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['triceps', 'shoulders']::text[], review_status = 'verificado'
where id = 'Dips_-_Chest_Version';
delete from public.exercise_muscles where exercise_id = 'Dips_-_Chest_Version';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dips_-_Chest_Version', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_abdominal', 'principal', 2::smallint), ('triceps', 'secundario', 1::smallint), ('deltoides_anterior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dips_-_Chest_Version');
update public.exercises set movement_pattern = 'aduccion_horizontal_hombro', muscle_function = 'Aducción horizontal de hombro aislada en máquina.',
  common_errors = array['Abrir más de lo que el hombro tolera', 'Encoger los hombros', 'Empujar con las manos en vez de cerrar con los codos']::text[], variants = array['Cruce de poleas', 'Aperturas con mancuernas']::text[], precautions = array['Con dolor de hombro, limita la apertura']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders']::text[], review_status = 'verificado'
where id = 'Butterfly';
delete from public.exercise_muscles where exercise_id = 'Butterfly';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Butterfly', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Butterfly');
update public.exercises set movement_pattern = 'aduccion_horizontal_hombro', muscle_function = 'Aducción horizontal de hombro con poleas.',
  common_errors = array['Convertirlo en press doblando mucho los codos', 'Usar impulso con el tronco']::text[], variants = array['Mariposa en máquina', 'Aperturas con mancuernas']::text[], precautions = array['Con dolor de hombro, limita la apertura']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders']::text[], review_status = 'verificado'
where id = 'Cable_Crossover';
delete from public.exercise_muscles where exercise_id = 'Cable_Crossover';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Cable_Crossover', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Cable_Crossover');
update public.exercises set movement_pattern = 'aduccion_horizontal_hombro', muscle_function = 'Aducción horizontal de hombro con mancuernas.',
  common_errors = array['Bajar demasiado', 'Codos totalmente rectos', 'Peso excesivo']::text[], variants = array['Mariposa en máquina', 'Cruce de poleas']::text[], precautions = array['El hombro queda expuesto abajo: usa cargas moderadas']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['chest']::text[], secondary_muscles = array['shoulders']::text[], review_status = 'verificado'
where id = 'Dumbbell_Flyes';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Flyes';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Flyes', v.code, v.role, v.pos, 'curado'
from (values ('pectoral_esternal', 'principal', 1::smallint), ('pectoral_clavicular', 'principal', 2::smallint), ('deltoides_anterior', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Flyes');
update public.exercises set movement_pattern = 'empuje_vertical', muscle_function = 'Flexión y abducción de hombro con extensión de codo sobre la cabeza.',
  common_errors = array['Arquear la zona lumbar', 'Empujar la barra hacia delante', 'Usar las piernas']::text[], variants = array['Press de hombro con mancuernas', 'Press de hombro en máquina']::text[], precautions = array['No recomendado con dolor de hombro al elevar el brazo']::text[], safety_notes = array['Aprieta glúteos y abdomen', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 5, rep_range_max = 10, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['triceps', 'traps', 'chest']::text[], review_status = 'verificado'
where id = 'Standing_Military_Press';
delete from public.exercise_muscles where exercise_id = 'Standing_Military_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Standing_Military_Press', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_anterior', 'principal', 1::smallint), ('deltoides_lateral', 'principal', 2::smallint), ('triceps', 'secundario', 1::smallint), ('trapecio_superior', 'secundario', 2::smallint), ('pectoral_clavicular', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Standing_Military_Press');
update public.exercises set movement_pattern = 'empuje_vertical', muscle_function = 'Empuje vertical sentado con mancuernas.',
  common_errors = array['Arquear la espalda', 'Recorrido parcial', 'Bajar sin control']::text[], variants = array['Press militar', 'Press de hombro en máquina']::text[], precautions = array['Usa respaldo']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['triceps', 'traps']::text[], review_status = 'verificado'
where id = 'Seated_Dumbbell_Press';
delete from public.exercise_muscles where exercise_id = 'Seated_Dumbbell_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Seated_Dumbbell_Press', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_anterior', 'principal', 1::smallint), ('deltoides_lateral', 'principal', 2::smallint), ('triceps', 'secundario', 1::smallint), ('trapecio_superior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Seated_Dumbbell_Press');
update public.exercises set movement_pattern = 'empuje_vertical', muscle_function = 'Empuje vertical con mancuernas.',
  common_errors = array['Arquear la espalda', 'Recorrido parcial']::text[], variants = array['Press militar', 'Press de hombro en máquina']::text[], precautions = array['No recomendado con dolor de hombro al elevar el brazo']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['triceps', 'traps']::text[], review_status = 'verificado'
where id = 'Dumbbell_Shoulder_Press';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Shoulder_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Shoulder_Press', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_anterior', 'principal', 1::smallint), ('deltoides_lateral', 'principal', 2::smallint), ('triceps', 'secundario', 1::smallint), ('trapecio_superior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Shoulder_Press');
update public.exercises set movement_pattern = 'empuje_vertical', muscle_function = 'Empuje vertical guiado en máquina.',
  common_errors = array['Despegar la espalda', 'Recorrido parcial']::text[], variants = array['Press con mancuernas']::text[], precautions = array['Ajusta el asiento: agarres a la altura de los hombros']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['triceps', 'traps']::text[], review_status = 'verificado'
where id = 'Leverage_Shoulder_Press';
delete from public.exercise_muscles where exercise_id = 'Leverage_Shoulder_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Leverage_Shoulder_Press', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_anterior', 'principal', 1::smallint), ('deltoides_lateral', 'principal', 2::smallint), ('triceps', 'secundario', 1::smallint), ('trapecio_superior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Leverage_Shoulder_Press');
update public.exercises set movement_pattern = 'empuje_vertical', muscle_function = 'Empuje vertical guiado en máquina.',
  common_errors = array['Despegar la espalda', 'Recorrido parcial']::text[], variants = array['Press con mancuernas']::text[], precautions = array['Ajusta el asiento: agarres a la altura de los hombros']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['triceps', 'traps']::text[], review_status = 'verificado'
where id = 'Machine_Shoulder_Military_Press';
delete from public.exercise_muscles where exercise_id = 'Machine_Shoulder_Military_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Machine_Shoulder_Military_Press', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_anterior', 'principal', 1::smallint), ('deltoides_lateral', 'principal', 2::smallint), ('triceps', 'secundario', 1::smallint), ('trapecio_superior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Machine_Shoulder_Military_Press');
update public.exercises set movement_pattern = 'abduccion_hombro', muscle_function = 'Abducción de hombro aislada.',
  common_errors = array['Usar impulso', 'Encoger los hombros', 'Subir por encima del hombro con peso excesivo']::text[], variants = array['Elevación lateral en polea', 'Elevación lateral en máquina']::text[], precautions = array['Cargas bajas: es un músculo pequeño']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['traps']::text[], review_status = 'verificado'
where id = 'Side_Lateral_Raise';
delete from public.exercise_muscles where exercise_id = 'Side_Lateral_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Side_Lateral_Raise', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_lateral', 'principal', 1::smallint), ('deltoides_anterior', 'secundario', 1::smallint), ('trapecio_superior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Side_Lateral_Raise');
update public.exercises set movement_pattern = 'flexion_hombro', muscle_function = 'Flexión de hombro aislada.',
  common_errors = array['Balancear el tronco', 'Subir demasiado alto']::text[], variants = array['Elevación frontal en polea']::text[], precautions = array['Suele ser redundante si ya haces press']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['chest']::text[], review_status = 'verificado'
where id = 'Front_Dumbbell_Raise';
delete from public.exercise_muscles where exercise_id = 'Front_Dumbbell_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Front_Dumbbell_Raise', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_anterior', 'principal', 1::smallint), ('pectoral_clavicular', 'secundario', 1::smallint), ('deltoides_lateral', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Front_Dumbbell_Raise');
update public.exercises set movement_pattern = 'abduccion_horizontal_hombro', muscle_function = 'Abducción horizontal de hombro: deltoides posterior.',
  common_errors = array['Usar impulso', 'Tirar con la espalda juntando mucho las escápulas', 'Peso excesivo']::text[], variants = array['Pájaro en máquina', 'Pájaro en polea', 'Face pull']::text[], precautions = array['Cargas bajas']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['middle back']::text[], review_status = 'verificado'
where id = 'Reverse_Flyes';
delete from public.exercise_muscles where exercise_id = 'Reverse_Flyes';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Reverse_Flyes', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_posterior', 'principal', 1::smallint), ('romboides', 'secundario', 1::smallint), ('trapecio_medio', 'secundario', 2::smallint), ('redondo_menor', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Reverse_Flyes');
update public.exercises set movement_pattern = 'abduccion_horizontal_hombro', muscle_function = 'Abducción horizontal de hombro en máquina.',
  common_errors = array['Encoger los hombros', 'Usar impulso']::text[], variants = array['Pájaro con mancuernas', 'Face pull']::text[], precautions = array['Cargas bajas']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['middle back']::text[], review_status = 'verificado'
where id = 'Reverse_Machine_Flyes';
delete from public.exercise_muscles where exercise_id = 'Reverse_Machine_Flyes';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Reverse_Machine_Flyes', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_posterior', 'principal', 1::smallint), ('romboides', 'secundario', 1::smallint), ('trapecio_medio', 'secundario', 2::smallint), ('redondo_menor', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Reverse_Machine_Flyes');
update public.exercises set movement_pattern = 'abduccion_horizontal_hombro', muscle_function = 'Abducción horizontal de hombro en polea.',
  common_errors = array['Doblar los codos y convertirlo en remo', 'Usar impulso']::text[], variants = array['Pájaro en máquina', 'Face pull']::text[], precautions = array['Cargas bajas']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['shoulders']::text[], secondary_muscles = array['middle back']::text[], review_status = 'verificado'
where id = 'Cable_Rear_Delt_Fly';
delete from public.exercise_muscles where exercise_id = 'Cable_Rear_Delt_Fly';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Cable_Rear_Delt_Fly', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_posterior', 'principal', 1::smallint), ('romboides', 'secundario', 1::smallint), ('trapecio_medio', 'secundario', 2::smallint), ('redondo_menor', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Cable_Rear_Delt_Fly');
update public.exercises set movement_pattern = 'abduccion_horizontal_hombro', muscle_function = 'Abducción horizontal con rotación externa de hombro y retracción escapular.',
  common_errors = array['Tirar hacia el pecho en vez de hacia la cara', 'Usar impulso con el tronco', 'Peso excesivo']::text[], variants = array['Pájaro en polea', 'Pájaro en máquina']::text[], precautions = array['Cargas bajas y recorrido completo']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['shoulders', 'middle back']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Face_Pull';
delete from public.exercise_muscles where exercise_id = 'Face_Pull';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Face_Pull', v.code, v.role, v.pos, 'curado'
from (values ('deltoides_posterior', 'principal', 1::smallint), ('trapecio_medio', 'principal', 2::smallint), ('romboides', 'secundario', 1::smallint), ('redondo_menor', 'secundario', 2::smallint), ('trapecio_inferior', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Face_Pull');
update public.exercises set movement_pattern = 'elevacion_escapular', muscle_function = 'Elevación escapular con carga.',
  common_errors = array['Girar los hombros en círculos', 'Doblar los codos', 'Recorrido corto']::text[], variants = array['Encogimiento con mancuernas']::text[], precautions = array['Evítalo con dolor cervical activo']::text[], safety_notes = array['Sube y baja en línea recta', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['traps']::text[], secondary_muscles = array['forearms']::text[], review_status = 'verificado'
where id = 'Barbell_Shrug';
delete from public.exercise_muscles where exercise_id = 'Barbell_Shrug';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Shrug', v.code, v.role, v.pos, 'curado'
from (values ('trapecio_superior', 'principal', 1::smallint), ('flexores_antebrazo', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Shrug');
update public.exercises set movement_pattern = 'elevacion_escapular', muscle_function = 'Elevación escapular con mancuernas.',
  common_errors = array['Girar los hombros en círculos', 'Recorrido corto']::text[], variants = array['Encogimiento con barra']::text[], precautions = array['Evítalo con dolor cervical activo']::text[], safety_notes = array['Sube y baja en línea recta', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['traps']::text[], secondary_muscles = array['forearms']::text[], review_status = 'verificado'
where id = 'Dumbbell_Shrug';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Shrug';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Shrug', v.code, v.role, v.pos, 'curado'
from (values ('trapecio_superior', 'principal', 1::smallint), ('flexores_antebrazo', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Shrug');
update public.exercises set movement_pattern = 'traccion_vertical', muscle_function = 'Aducción y extensión de hombro con flexión de codo, colgado de la barra.',
  common_errors = array['Balancearse', 'Recorrido parcial', 'Encoger los hombros arriba']::text[], variants = array['Dominada asistida', 'Jalón al pecho', 'Dominada supina']::text[], precautions = array['Sin fuerza suficiente, usa la máquina asistida o una banda']::text[], safety_notes = array['Baja con control hasta casi estirar', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 4, rep_range_max = 12, required_gear = null,
  primary_muscles = array['lats']::text[], secondary_muscles = array['biceps', 'middle back', 'forearms']::text[], review_status = 'verificado'
where id = 'Pullups';
delete from public.exercise_muscles where exercise_id = 'Pullups';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Pullups', v.code, v.role, v.pos, 'curado'
from (values ('dorsal_ancho', 'principal', 1::smallint), ('redondo_mayor', 'principal', 2::smallint), ('biceps_braquial', 'secundario', 1::smallint), ('braquial', 'secundario', 2::smallint), ('trapecio_inferior', 'secundario', 3::smallint), ('romboides', 'secundario', 4::smallint), ('flexores_antebrazo', 'secundario', 5::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Pullups');
update public.exercises set movement_pattern = 'traccion_vertical', muscle_function = 'Tracción vertical con agarre supino: más participación del bíceps.',
  common_errors = array['Balancearse', 'Recorrido parcial']::text[], variants = array['Dominada prona', 'Jalón supino']::text[], precautions = array['El agarre supino puede molestar en codo o muñeca']::text[], safety_notes = array['Baja con control', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 4, rep_range_max = 12, required_gear = null,
  primary_muscles = array['lats', 'biceps']::text[], secondary_muscles = array['middle back', 'forearms']::text[], review_status = 'verificado'
where id = 'Chin-Up';
delete from public.exercise_muscles where exercise_id = 'Chin-Up';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Chin-Up', v.code, v.role, v.pos, 'curado'
from (values ('dorsal_ancho', 'principal', 1::smallint), ('biceps_braquial', 'principal', 2::smallint), ('redondo_mayor', 'secundario', 1::smallint), ('braquial', 'secundario', 2::smallint), ('trapecio_inferior', 'secundario', 3::smallint), ('flexores_antebrazo', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Chin-Up');
update public.exercises set movement_pattern = 'traccion_vertical', muscle_function = 'Aducción de hombro con flexión de codo en polea alta.',
  common_errors = array['Tirar detrás de la nuca', 'Echarse muy atrás con impulso', 'Recorrido parcial']::text[], variants = array['Jalón con agarre cerrado', 'Dominadas']::text[], precautions = array['Lleva la barra al pecho, no a la nuca']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['lats']::text[], secondary_muscles = array['biceps', 'middle back']::text[], review_status = 'verificado'
where id = 'Wide-Grip_Lat_Pulldown';
delete from public.exercise_muscles where exercise_id = 'Wide-Grip_Lat_Pulldown';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Wide-Grip_Lat_Pulldown', v.code, v.role, v.pos, 'curado'
from (values ('dorsal_ancho', 'principal', 1::smallint), ('redondo_mayor', 'principal', 2::smallint), ('biceps_braquial', 'secundario', 1::smallint), ('braquial', 'secundario', 2::smallint), ('trapecio_inferior', 'secundario', 3::smallint), ('romboides', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Wide-Grip_Lat_Pulldown');
update public.exercises set movement_pattern = 'traccion_vertical', muscle_function = 'Extensión de hombro con flexión de codo en polea alta, agarre cerrado.',
  common_errors = array['Usar impulso', 'Recorrido parcial']::text[], variants = array['Jalón abierto', 'Dominada supina']::text[], precautions = array['Lleva la barra al pecho']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['lats']::text[], secondary_muscles = array['biceps', 'middle back']::text[], review_status = 'verificado'
where id = 'Close-Grip_Front_Lat_Pulldown';
delete from public.exercise_muscles where exercise_id = 'Close-Grip_Front_Lat_Pulldown';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Close-Grip_Front_Lat_Pulldown', v.code, v.role, v.pos, 'curado'
from (values ('dorsal_ancho', 'principal', 1::smallint), ('redondo_mayor', 'principal', 2::smallint), ('biceps_braquial', 'secundario', 1::smallint), ('braquial', 'secundario', 2::smallint), ('romboides', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Close-Grip_Front_Lat_Pulldown');
update public.exercises set movement_pattern = 'extension_hombro', muscle_function = 'Extensión de hombro con los codos casi extendidos: dorsal sin ayuda del bíceps.',
  common_errors = array['Doblar los codos', 'Usar el tronco para bajar la barra']::text[], variants = array['Pullover en polea con cuerda']::text[], precautions = array['Cargas moderadas']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['lats']::text[], secondary_muscles = array['triceps', 'shoulders']::text[], review_status = 'verificado'
where id = 'Straight-Arm_Pulldown';
delete from public.exercise_muscles where exercise_id = 'Straight-Arm_Pulldown';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Straight-Arm_Pulldown', v.code, v.role, v.pos, 'curado'
from (values ('dorsal_ancho', 'principal', 1::smallint), ('redondo_mayor', 'secundario', 1::smallint), ('triceps_cabeza_larga', 'secundario', 2::smallint), ('deltoides_posterior', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Straight-Arm_Pulldown');
update public.exercises set movement_pattern = 'traccion_horizontal', muscle_function = 'Extensión de hombro y retracción escapular tirando hacia el abdomen.',
  common_errors = array['Balancear el tronco', 'Encoger los hombros', 'Recorrido parcial']::text[], variants = array['Remo en máquina', 'Remo con mancuerna']::text[], precautions = array['Con dolor lumbar, mantén el tronco quieto y la carga moderada']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['middle back', 'lats']::text[], secondary_muscles = array['shoulders', 'biceps', 'lower back']::text[], review_status = 'verificado'
where id = 'Seated_Cable_Rows';
delete from public.exercise_muscles where exercise_id = 'Seated_Cable_Rows';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Seated_Cable_Rows', v.code, v.role, v.pos, 'curado'
from (values ('romboides', 'principal', 1::smallint), ('trapecio_medio', 'principal', 2::smallint), ('dorsal_ancho', 'principal', 3::smallint), ('deltoides_posterior', 'secundario', 1::smallint), ('biceps_braquial', 'secundario', 2::smallint), ('braquial', 'secundario', 3::smallint), ('erectores_espinales', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Seated_Cable_Rows');
update public.exercises set movement_pattern = 'traccion_horizontal', muscle_function = 'Tracción horizontal con el tronco inclinado: la zona lumbar trabaja de forma isométrica.',
  common_errors = array['Redondear la espalda', 'Usar impulso con el tronco', 'Tirar con los brazos']::text[], variants = array['Remo con apoyo en banco', 'Remo en polea']::text[], precautions = array['No recomendado con dolor lumbar activo']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['middle back', 'lats']::text[], secondary_muscles = array['shoulders', 'biceps', 'lower back', 'hamstrings']::text[], review_status = 'verificado'
where id = 'Bent_Over_Barbell_Row';
delete from public.exercise_muscles where exercise_id = 'Bent_Over_Barbell_Row';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Bent_Over_Barbell_Row', v.code, v.role, v.pos, 'curado'
from (values ('romboides', 'principal', 1::smallint), ('trapecio_medio', 'principal', 2::smallint), ('dorsal_ancho', 'principal', 3::smallint), ('deltoides_posterior', 'secundario', 1::smallint), ('biceps_braquial', 'secundario', 2::smallint), ('erectores_espinales', 'secundario', 3::smallint), ('isquiotibiales', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Bent_Over_Barbell_Row');
update public.exercises set movement_pattern = 'traccion_horizontal', muscle_function = 'Tracción horizontal a una mano con apoyo.',
  common_errors = array['Girar el tronco', 'Tirar con el brazo en vez de llevar el codo atrás']::text[], variants = array['Remo en polea', 'Remo en máquina']::text[], precautions = array['El apoyo descarga la zona lumbar']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 12, required_gear = null,
  primary_muscles = array['middle back', 'lats']::text[], secondary_muscles = array['shoulders', 'biceps']::text[], review_status = 'verificado'
where id = 'One-Arm_Dumbbell_Row';
delete from public.exercise_muscles where exercise_id = 'One-Arm_Dumbbell_Row';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'One-Arm_Dumbbell_Row', v.code, v.role, v.pos, 'curado'
from (values ('romboides', 'principal', 1::smallint), ('trapecio_medio', 'principal', 2::smallint), ('dorsal_ancho', 'principal', 3::smallint), ('deltoides_posterior', 'secundario', 1::smallint), ('biceps_braquial', 'secundario', 2::smallint), ('braquial', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'One-Arm_Dumbbell_Row');
update public.exercises set movement_pattern = 'traccion_horizontal', muscle_function = 'Tracción horizontal guiada con apoyo en el pecho.',
  common_errors = array['Despegar el pecho del apoyo', 'Encoger los hombros']::text[], variants = array['Remo en polea', 'Remo con mancuerna']::text[], precautions = array['Ajusta el asiento: agarres a la altura del pecho bajo']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['lats', 'middle back']::text[], secondary_muscles = array['shoulders', 'biceps']::text[], review_status = 'verificado'
where id = 'Leverage_Iso_Row';
delete from public.exercise_muscles where exercise_id = 'Leverage_Iso_Row';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Leverage_Iso_Row', v.code, v.role, v.pos, 'curado'
from (values ('dorsal_ancho', 'principal', 1::smallint), ('romboides', 'principal', 2::smallint), ('trapecio_medio', 'principal', 3::smallint), ('deltoides_posterior', 'secundario', 1::smallint), ('biceps_braquial', 'secundario', 2::smallint), ('braquial', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Leverage_Iso_Row');
update public.exercises set movement_pattern = 'traccion_horizontal', muscle_function = 'Tracción horizontal con el peso corporal y el cuerpo en plancha.',
  common_errors = array['Cadera caída', 'Recorrido parcial']::text[], variants = array['Remo en polea']::text[], precautions = array['Cuanto más horizontal el cuerpo, más difícil']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 15, required_gear = null,
  primary_muscles = array['middle back', 'lats']::text[], secondary_muscles = array['shoulders', 'biceps', 'abdominals']::text[], review_status = 'verificado'
where id = 'Inverted_Row';
delete from public.exercise_muscles where exercise_id = 'Inverted_Row';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Inverted_Row', v.code, v.role, v.pos, 'curado'
from (values ('romboides', 'principal', 1::smallint), ('trapecio_medio', 'principal', 2::smallint), ('dorsal_ancho', 'principal', 3::smallint), ('deltoides_posterior', 'secundario', 1::smallint), ('biceps_braquial', 'secundario', 2::smallint), ('recto_abdominal', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Inverted_Row');
update public.exercises set movement_pattern = 'flexion_codo', muscle_function = 'Flexión de codo con agarre supino.',
  common_errors = array['Balancear el tronco', 'Adelantar los codos', 'Recorrido parcial']::text[], variants = array['Curl con mancuernas', 'Curl en polea']::text[], precautions = array['Si molesta la muñeca, usa barra EZ o mancuernas']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['biceps']::text[], secondary_muscles = array['forearms']::text[], review_status = 'verificado'
where id = 'Barbell_Curl';
delete from public.exercise_muscles where exercise_id = 'Barbell_Curl';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Barbell_Curl', v.code, v.role, v.pos, 'curado'
from (values ('biceps_braquial', 'principal', 1::smallint), ('braquial', 'secundario', 1::smallint), ('braquiorradial', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Barbell_Curl');
update public.exercises set movement_pattern = 'flexion_codo', muscle_function = 'Flexión de codo con supinación.',
  common_errors = array['Balancear el tronco', 'Adelantar los codos']::text[], variants = array['Curl con barra', 'Curl inclinado']::text[], precautions = '{}'::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['biceps']::text[], secondary_muscles = array['forearms']::text[], review_status = 'verificado'
where id = 'Dumbbell_Bicep_Curl';
delete from public.exercise_muscles where exercise_id = 'Dumbbell_Bicep_Curl';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dumbbell_Bicep_Curl', v.code, v.role, v.pos, 'curado'
from (values ('biceps_braquial', 'principal', 1::smallint), ('braquial', 'secundario', 1::smallint), ('braquiorradial', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dumbbell_Bicep_Curl');
update public.exercises set movement_pattern = 'flexion_codo', muscle_function = 'Flexión de codo con el hombro extendido: bíceps en posición alargada.',
  common_errors = array['Adelantar los codos', 'Usar impulso']::text[], variants = array['Curl con mancuernas de pie']::text[], precautions = array['Con molestia en la parte anterior del hombro, reduce la inclinación']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['biceps']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Incline_Dumbbell_Curl';
delete from public.exercise_muscles where exercise_id = 'Incline_Dumbbell_Curl';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Incline_Dumbbell_Curl', v.code, v.role, v.pos, 'curado'
from (values ('biceps_braquial', 'principal', 1::smallint), ('braquial', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Incline_Dumbbell_Curl');
update public.exercises set movement_pattern = 'flexion_codo', muscle_function = 'Flexión de codo con agarre neutro: más braquial y braquiorradial.',
  common_errors = array['Balancear el tronco', 'Adelantar los codos']::text[], variants = array['Curl martillo en polea con cuerda']::text[], precautions = '{}'::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['biceps', 'forearms']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Hammer_Curls';
delete from public.exercise_muscles where exercise_id = 'Hammer_Curls';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Hammer_Curls', v.code, v.role, v.pos, 'curado'
from (values ('braquial', 'principal', 1::smallint), ('braquiorradial', 'principal', 2::smallint), ('biceps_braquial', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Hammer_Curls');
update public.exercises set movement_pattern = 'flexion_codo', muscle_function = 'Flexión de codo con el brazo apoyado: sin ayuda del hombro.',
  common_errors = array['Estirar de golpe abajo', 'Levantar los codos del apoyo']::text[], variants = array['Curl predicador en máquina']::text[], precautions = array['No estires con brusquedad: abajo el tendón del bíceps queda exigido']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['biceps']::text[], secondary_muscles = array['forearms']::text[], review_status = 'verificado'
where id = 'Preacher_Curl';
delete from public.exercise_muscles where exercise_id = 'Preacher_Curl';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Preacher_Curl', v.code, v.role, v.pos, 'curado'
from (values ('biceps_braquial', 'principal', 1::smallint), ('braquial', 'principal', 2::smallint), ('braquiorradial', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Preacher_Curl');
update public.exercises set movement_pattern = 'flexion_codo', muscle_function = 'Flexión de codo con agarre prono: braquiorradial y extensores de muñeca.',
  common_errors = array['Doblar las muñecas', 'Usar impulso']::text[], variants = array['Curl inverso en polea']::text[], precautions = array['Cargas menores que en el curl normal']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['forearms']::text[], secondary_muscles = array['biceps']::text[], review_status = 'verificado'
where id = 'Reverse_Barbell_Curl';
delete from public.exercise_muscles where exercise_id = 'Reverse_Barbell_Curl';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Reverse_Barbell_Curl', v.code, v.role, v.pos, 'curado'
from (values ('braquiorradial', 'principal', 1::smallint), ('braquial', 'secundario', 1::smallint), ('extensores_antebrazo', 'secundario', 2::smallint), ('biceps_braquial', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Reverse_Barbell_Curl');
update public.exercises set movement_pattern = 'extension_codo', muscle_function = 'Extensión de codo con el brazo junto al cuerpo.',
  common_errors = array['Separar los codos', 'Inclinarse sobre la barra', 'Recorrido parcial']::text[], variants = array['Extensión con cuerda', 'Extensión sobre la cabeza']::text[], precautions = '{}'::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['triceps']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Triceps_Pushdown';
delete from public.exercise_muscles where exercise_id = 'Triceps_Pushdown';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Triceps_Pushdown', v.code, v.role, v.pos, 'curado'
from (values ('triceps_cabeza_lateral', 'principal', 1::smallint), ('triceps_cabeza_medial', 'principal', 2::smallint), ('triceps_cabeza_larga', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Triceps_Pushdown');
update public.exercises set movement_pattern = 'extension_codo', muscle_function = 'Extensión de codo con cuerda.',
  common_errors = array['Separar los codos', 'Usar impulso']::text[], variants = array['Extensión con barra', 'Extensión sobre la cabeza']::text[], precautions = '{}'::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['triceps']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Triceps_Pushdown_-_Rope_Attachment';
delete from public.exercise_muscles where exercise_id = 'Triceps_Pushdown_-_Rope_Attachment';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Triceps_Pushdown_-_Rope_Attachment', v.code, v.role, v.pos, 'curado'
from (values ('triceps_cabeza_lateral', 'principal', 1::smallint), ('triceps_cabeza_medial', 'principal', 2::smallint), ('triceps_cabeza_larga', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Triceps_Pushdown_-_Rope_Attachment');
update public.exercises set movement_pattern = 'extension_codo', muscle_function = 'Extensión de codo con el hombro flexionado: cabeza larga en posición alargada.',
  common_errors = array['Abrir los codos', 'Arquear la espalda']::text[], variants = array['Extensión sobre la cabeza con mancuerna']::text[], precautions = array['Con dolor de hombro al elevar el brazo, usa la extensión con el brazo abajo']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 15, required_gear = null,
  primary_muscles = array['triceps']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Cable_Rope_Overhead_Triceps_Extension';
delete from public.exercise_muscles where exercise_id = 'Cable_Rope_Overhead_Triceps_Extension';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Cable_Rope_Overhead_Triceps_Extension', v.code, v.role, v.pos, 'curado'
from (values ('triceps_cabeza_larga', 'principal', 1::smallint), ('triceps_cabeza_lateral', 'secundario', 1::smallint), ('triceps_cabeza_medial', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Cable_Rope_Overhead_Triceps_Extension');
update public.exercises set movement_pattern = 'empuje_horizontal', muscle_function = 'Empuje horizontal con agarre cerrado: más extensión de codo.',
  common_errors = array['Agarre demasiado cerrado (carga la muñeca)', 'Abrir los codos']::text[], variants = array['Fondos', 'Press en máquina con agarre cerrado']::text[], precautions = array['Con cargas altas usa seguros o un ayudante']::text[], safety_notes = array['No entrenes al fallo sin seguros ni ayudante', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['triceps']::text[], secondary_muscles = array['chest', 'shoulders']::text[], review_status = 'verificado'
where id = 'Close-Grip_Barbell_Bench_Press';
delete from public.exercise_muscles where exercise_id = 'Close-Grip_Barbell_Bench_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Close-Grip_Barbell_Bench_Press', v.code, v.role, v.pos, 'curado'
from (values ('triceps', 'principal', 1::smallint), ('pectoral_esternal', 'secundario', 1::smallint), ('deltoides_anterior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Close-Grip_Barbell_Bench_Press');
update public.exercises set movement_pattern = 'extension_codo', muscle_function = 'Empuje hacia abajo con el tronco erguido: tríceps.',
  common_errors = array['Bajar más de lo que el hombro tolera', 'Encoger los hombros']::text[], variants = array['Fondos asistidos', 'Extensión en polea']::text[], precautions = array['No recomendado con dolor de hombro']::text[], safety_notes = array['Baja hasta que el brazo quede paralelo al suelo, no más', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['triceps']::text[], secondary_muscles = array['chest', 'shoulders']::text[], review_status = 'verificado'
where id = 'Dips_-_Triceps_Version';
delete from public.exercise_muscles where exercise_id = 'Dips_-_Triceps_Version';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dips_-_Triceps_Version', v.code, v.role, v.pos, 'curado'
from (values ('triceps', 'principal', 1::smallint), ('pectoral_esternal', 'secundario', 1::smallint), ('deltoides_anterior', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dips_-_Triceps_Version');
update public.exercises set movement_pattern = 'antebrazo_agarre', muscle_function = 'Flexión de muñeca.',
  common_errors = array['Mover los antebrazos', 'Peso excesivo']::text[], variants = array['Curl de muñeca con mancuerna']::text[], precautions = array['Con dolor de muñeca, reduce el recorrido']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['forearms']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench';
delete from public.exercise_muscles where exercise_id = 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench', v.code, v.role, v.pos, 'curado'
from (values ('flexores_antebrazo', 'principal', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench');
update public.exercises set movement_pattern = 'antebrazo_agarre', muscle_function = 'Extensión de muñeca.',
  common_errors = array['Mover los antebrazos', 'Peso excesivo']::text[], variants = array['Extensión de muñeca con mancuerna']::text[], precautions = array['Usa cargas bajas: los extensores son débiles']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['forearms']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Palms-Down_Wrist_Curl_Over_A_Bench';
delete from public.exercise_muscles where exercise_id = 'Palms-Down_Wrist_Curl_Over_A_Bench';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Palms-Down_Wrist_Curl_Over_A_Bench', v.code, v.role, v.pos, 'curado'
from (values ('extensores_antebrazo', 'principal', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Palms-Down_Wrist_Curl_Over_A_Bench');
update public.exercises set movement_pattern = 'antebrazo_agarre', muscle_function = 'Agarre isométrico y estabilidad del tronco caminando con carga.',
  common_errors = array['Inclinar el tronco', 'Encoger los hombros', 'Pasos muy largos']::text[], variants = array['Paseo con una sola carga (maleta)']::text[], precautions = array['Camino despejado']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Deja la carga en el suelo flexionando piernas']::text[],
  rep_range_min = 1, rep_range_max = 1, required_gear = array['mancuernas']::text[],
  primary_muscles = array['forearms']::text[], secondary_muscles = array['traps', 'abdominals', 'abductors']::text[], review_status = 'verificado'
where id = 'Farmers_Walk';
delete from public.exercise_muscles where exercise_id = 'Farmers_Walk';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Farmers_Walk', v.code, v.role, v.pos, 'curado'
from (values ('flexores_antebrazo', 'principal', 1::smallint), ('trapecio_superior', 'secundario', 1::smallint), ('recto_abdominal', 'secundario', 2::smallint), ('oblicuo_externo', 'secundario', 3::smallint), ('gluteo_medio', 'secundario', 4::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Farmers_Walk');
update public.exercises set movement_pattern = 'core_estabilidad', muscle_function = 'Anti-extensión de columna (isométrico).',
  common_errors = array['Cadera caída', 'Cadera muy alta', 'Aguantar la respiración']::text[], variants = array['Plancha con rodillas apoyadas', 'Dead bug']::text[], precautions = array['Con dolor de hombro, hazla con apoyo elevado']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 1, rep_range_max = 1, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Plank';
delete from public.exercise_muscles where exercise_id = 'Plank';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Plank', v.code, v.role, v.pos, 'curado'
from (values ('recto_abdominal', 'principal', 1::smallint), ('transverso_abdominal', 'principal', 2::smallint), ('oblicuo_externo', 'secundario', 1::smallint), ('oblicuo_interno', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Plank');
update public.exercises set movement_pattern = 'core_estabilidad', muscle_function = 'Anti-inclinación lateral de columna (isométrico).',
  common_errors = array['Cadera caída', 'Rotar el tronco']::text[], variants = array['Plancha lateral con rodillas apoyadas']::text[], precautions = array['Con dolor de hombro, apoya las rodillas']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 1, rep_range_max = 1, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = array['lower back', 'abductors']::text[], review_status = 'verificado'
where id = 'Side_Bridge';
delete from public.exercise_muscles where exercise_id = 'Side_Bridge';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Side_Bridge', v.code, v.role, v.pos, 'curado'
from (values ('oblicuo_externo', 'principal', 1::smallint), ('oblicuo_interno', 'principal', 2::smallint), ('cuadrado_lumbar', 'secundario', 1::smallint), ('gluteo_medio', 'secundario', 2::smallint), ('transverso_abdominal', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Side_Bridge');
update public.exercises set movement_pattern = 'core_estabilidad', muscle_function = 'Anti-extensión de columna moviendo brazos y piernas.',
  common_errors = array['Despegar la zona lumbar del suelo', 'Ir rápido']::text[], variants = array['Plancha']::text[], precautions = array['Apto para empezar']::text[], safety_notes = array['Zona lumbar pegada al suelo', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = array['hip flexors']::text[], review_status = 'verificado'
where id = 'Dead_Bug';
delete from public.exercise_muscles where exercise_id = 'Dead_Bug';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Dead_Bug', v.code, v.role, v.pos, 'curado'
from (values ('recto_abdominal', 'principal', 1::smallint), ('transverso_abdominal', 'principal', 2::smallint), ('oblicuo_externo', 'secundario', 1::smallint), ('oblicuo_interno', 'secundario', 2::smallint), ('iliopsoas', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Dead_Bug');
update public.exercises set movement_pattern = 'core_estabilidad', muscle_function = 'Anti-rotación de columna contra una polea.',
  common_errors = array['Dejar que el tronco gire', 'Encoger los hombros']::text[], variants = array['Pallof con banda']::text[], precautions = '{}'::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Pallof_Press';
delete from public.exercise_muscles where exercise_id = 'Pallof_Press';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Pallof_Press', v.code, v.role, v.pos, 'curado'
from (values ('oblicuo_externo', 'principal', 1::smallint), ('oblicuo_interno', 'principal', 2::smallint), ('transverso_abdominal', 'secundario', 1::smallint), ('recto_abdominal', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Pallof_Press');
update public.exercises set movement_pattern = 'core_estabilidad', muscle_function = 'Estabilidad lumbar en cuadrupedia extendiendo brazo y pierna contrarios.',
  common_errors = array['Arquear la zona lumbar', 'Girar la cadera', 'Ir rápido']::text[], variants = array['Superman']::text[], precautions = array['Apto para empezar']::text[], safety_notes = array['Mantén la columna neutra durante todo el recorrido', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 12, required_gear = null,
  primary_muscles = array['lower back']::text[], secondary_muscles = array['glutes', 'abdominals', 'shoulders']::text[], review_status = 'verificado'
where id = 'DV_Bird_Dog';
delete from public.exercise_muscles where exercise_id = 'DV_Bird_Dog';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'DV_Bird_Dog', v.code, v.role, v.pos, 'curado'
from (values ('erectores_espinales', 'principal', 1::smallint), ('multifidos', 'principal', 2::smallint), ('gluteo_mayor', 'secundario', 1::smallint), ('transverso_abdominal', 'secundario', 2::smallint), ('deltoides', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'DV_Bird_Dog');
update public.exercises set movement_pattern = 'flexion_columna', muscle_function = 'Flexión de columna.',
  common_errors = array['Tirar del cuello', 'Usar impulso', 'Subir demasiado (pasa a flexores de cadera)']::text[], variants = array['Crunch en polea', 'Crunch en máquina']::text[], precautions = array['Evítalo en embarazo y posparto reciente']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 12, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Crunches';
delete from public.exercise_muscles where exercise_id = 'Crunches';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Crunches', v.code, v.role, v.pos, 'curado'
from (values ('recto_abdominal', 'principal', 1::smallint), ('oblicuo_externo', 'secundario', 1::smallint), ('oblicuo_interno', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Crunches');
update public.exercises set movement_pattern = 'flexion_columna', muscle_function = 'Flexión de columna con carga en polea.',
  common_errors = array['Tirar con los brazos', 'Mover la cadera en vez de flexionar la columna']::text[], variants = array['Crunch en máquina']::text[], precautions = array['Evítalo en embarazo y posparto reciente']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Cable_Crunch';
delete from public.exercise_muscles where exercise_id = 'Cable_Crunch';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Cable_Crunch', v.code, v.role, v.pos, 'curado'
from (values ('recto_abdominal', 'principal', 1::smallint), ('oblicuo_externo', 'secundario', 1::smallint), ('oblicuo_interno', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Cable_Crunch');
update public.exercises set movement_pattern = 'flexion_columna', muscle_function = 'Flexión de columna en máquina.',
  common_errors = array['Tirar con los brazos', 'Usar impulso']::text[], variants = array['Crunch en polea']::text[], precautions = array['Evítalo en embarazo y posparto reciente']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = '{}'::text[], review_status = 'verificado'
where id = 'Ab_Crunch_Machine';
delete from public.exercise_muscles where exercise_id = 'Ab_Crunch_Machine';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Ab_Crunch_Machine', v.code, v.role, v.pos, 'curado'
from (values ('recto_abdominal', 'principal', 1::smallint), ('oblicuo_externo', 'secundario', 1::smallint), ('oblicuo_interno', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Ab_Crunch_Machine');
update public.exercises set movement_pattern = 'flexion_columna', muscle_function = 'Flexión de columna llevando la pelvis hacia el pecho.',
  common_errors = array['Balancear las piernas', 'Arquear la zona lumbar al bajar']::text[], variants = array['Elevación de rodillas colgado']::text[], precautions = array['Evítalo en embarazo y posparto reciente']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = array['hip flexors']::text[], review_status = 'verificado'
where id = 'Reverse_Crunch';
delete from public.exercise_muscles where exercise_id = 'Reverse_Crunch';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Reverse_Crunch', v.code, v.role, v.pos, 'curado'
from (values ('recto_abdominal', 'principal', 1::smallint), ('oblicuo_externo', 'secundario', 1::smallint), ('iliopsoas', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Reverse_Crunch');
update public.exercises set movement_pattern = 'core_estabilidad', muscle_function = 'Rotación de tronco.',
  common_errors = array['Redondear la espalda', 'Mover solo los brazos']::text[], variants = array['Pallof press']::text[], precautions = array['No recomendado con dolor lumbar activo']::text[], safety_notes = array['Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['abdominals']::text[], secondary_muscles = array['hip flexors']::text[], review_status = 'verificado'
where id = 'Russian_Twist';
delete from public.exercise_muscles where exercise_id = 'Russian_Twist';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Russian_Twist', v.code, v.role, v.pos, 'curado'
from (values ('oblicuo_externo', 'principal', 1::smallint), ('oblicuo_interno', 'principal', 2::smallint), ('recto_abdominal', 'secundario', 1::smallint), ('iliopsoas', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Russian_Twist');
update public.exercises set movement_pattern = 'flexion_cadera', muscle_function = 'Flexión de cadera colgado; el abdomen estabiliza y flexiona la pelvis al final.',
  common_errors = array['Balancearse', 'Arquear la zona lumbar al bajar']::text[], variants = array['Elevación de rodillas colgado', 'Elevación de rodillas en paralelas']::text[], precautions = array['Exigente para el agarre y la zona lumbar']::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 6, rep_range_max = 15, required_gear = null,
  primary_muscles = array['hip flexors', 'abdominals']::text[], secondary_muscles = array['quadriceps', 'forearms']::text[], review_status = 'verificado'
where id = 'Hanging_Leg_Raise';
delete from public.exercise_muscles where exercise_id = 'Hanging_Leg_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Hanging_Leg_Raise', v.code, v.role, v.pos, 'curado'
from (values ('iliopsoas', 'principal', 1::smallint), ('recto_abdominal', 'principal', 2::smallint), ('recto_femoral', 'secundario', 1::smallint), ('oblicuo_externo', 'secundario', 2::smallint), ('flexores_antebrazo', 'secundario', 3::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Hanging_Leg_Raise');
update public.exercises set movement_pattern = 'flexion_cadera', muscle_function = 'Flexión de cadera con los antebrazos apoyados.',
  common_errors = array['Balancearse', 'Encoger los hombros']::text[], variants = array['Elevación de piernas colgado', 'Crunch inverso']::text[], precautions = '{}'::text[], safety_notes = array['Controla la bajada: sin rebotes ni impulso', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 8, rep_range_max = 15, required_gear = array['paralelas']::text[],
  primary_muscles = array['hip flexors', 'abdominals']::text[], secondary_muscles = array['quadriceps']::text[], review_status = 'verificado'
where id = 'Knee_Hip_Raise_On_Parallel_Bars';
delete from public.exercise_muscles where exercise_id = 'Knee_Hip_Raise_On_Parallel_Bars';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Knee_Hip_Raise_On_Parallel_Bars', v.code, v.role, v.pos, 'curado'
from (values ('iliopsoas', 'principal', 1::smallint), ('recto_abdominal', 'principal', 2::smallint), ('recto_femoral', 'secundario', 1::smallint), ('oblicuo_externo', 'secundario', 2::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Knee_Hip_Raise_On_Parallel_Bars');
update public.exercises set movement_pattern = 'flexion_cadera', muscle_function = 'Flexión de cadera tumbado; el abdomen evita que la zona lumbar se arquee.',
  common_errors = array['Arquear la zona lumbar', 'Dejar caer las piernas']::text[], variants = array['Crunch inverso']::text[], precautions = array['Con dolor lumbar, dobla las rodillas']::text[], safety_notes = array['Zona lumbar apoyada', 'Detén el ejercicio si aparece dolor articular (no confundir con fatiga muscular)']::text[],
  rep_range_min = 10, rep_range_max = 20, required_gear = null,
  primary_muscles = array['hip flexors', 'abdominals']::text[], secondary_muscles = array['quadriceps']::text[], review_status = 'verificado'
where id = 'Flat_Bench_Lying_Leg_Raise';
delete from public.exercise_muscles where exercise_id = 'Flat_Bench_Lying_Leg_Raise';
insert into public.exercise_muscles (exercise_id, muscle_code, role, position, source)
select 'Flat_Bench_Lying_Leg_Raise', v.code, v.role, v.pos, 'curado'
from (values ('iliopsoas', 'principal', 1::smallint), ('recto_abdominal', 'principal', 2::smallint), ('recto_femoral', 'secundario', 1::smallint)) as v(code, role, pos)
where exists (select 1 from public.exercises where id = 'Flat_Bench_Lying_Leg_Raise');

notify pgrst, 'reload schema';
