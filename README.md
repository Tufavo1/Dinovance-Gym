# Dinovance Gym

PWA para armar rutinas de gimnasio personalizadas, pensada para personas cercanas.
Stack: **Ionic 9 + Angular 22** (componentes standalone y signals), **Supabase** (Auth, Postgres con RLS)
y **Cloudflare** (Workers Assets) para el despliegue.

## Probarlo en local

Requisitos: Node 22+, Docker.

```bash
npm install
npm run db:start      # Supabase local en Docker (proyecto "dinovance-gym", puertos 544xx)
npm start             # http://localhost:4200 contra la base local
```

- Studio (ver tablas): http://127.0.0.1:54423
- Correos de prueba (confirmaciones): http://127.0.0.1:54424
- `npm run start:cloud` usa el proyecto Supabase en la nube (`environment.ts`).
- `npm run db:stop` detiene la base sin borrar los datos.

### Base de datos desde cero

```bash
docker exec -i supabase_db_dinovance-gym psql -U postgres < supabase/schema.sql
SUPABASE_URL=http://127.0.0.1:54421 SUPABASE_SERVICE_ROLE_KEY=<service_role local> \
  node scripts/import-exercises.mjs
```

La clave `service_role` local la muestra `npx supabase status`. **Nunca** va en la app ni en git.

Para el proyecto en la nube, ejecutar en el SQL Editor las migraciones que falten (004 a 010) de
`supabase/migrations/` (son idempotentes), o `schema.sql` completo en una base nueva.

## Cómo se arma la rutina

El generador (`src/app/core/routine/`) es código puro, determinista y con tests. Decide en este orden:

1. **Perfil del atleta** (`athlete-profile.ts`): experiencia, cuánto tiempo lleva sin entrenar, edad,
   embarazo/posparto, condición médica, sueño y nivel de actividad. Fija el nivel máximo, el volumen
   y las precauciones. El historial manda: alguien intermedio con más de 6 meses sin entrenar parte como
   principiante.
2. **Lugar y equipamiento** (`equipment.ts`): Smart Fit viene con su equipamiento completo
   (incluye hip thrust, dominadas asistidas, Smith, poleas, prensas y cardio); casa y plaza se mapean.
3. **Salud**: lesiones activas, cirugías y embarazo excluyen ejercicios por músculo, categoría y nombre.
4. **Objetivo, modalidad, zonas y género**: elección y prescripción (series, repeticiones, descanso).
5. **Tiempo**: se llenan los ejercicios por prioridad hasta completar los minutos de la sesión.

Además: los días con la misma plantilla repiten ejercicios (para progresar), no se repite un patrón de
movimiento en el mismo día, si una lesión deja un día dividido sin ejercicios útiles se pasa a cuerpo
completo, y los nombres se muestran en español (`exercise-names.ts`).

## Entrenamiento guiado (`/entrenar/:dayId`)

Desde **Inicio → Empezar** la app guía el día ejercicio por ejercicio:

1. **Ficha del ejercicio**: imagen animada (posición inicial y final), series × repeticiones, descanso,
   RIR objetivo y 3 claves de técnica en español.
2. **Peso**: recomendado y editable (`core/training/load-advisor.ts`).
   - Primera vez: e1RM estimado desde peso corporal, sexo, experiencia y edad, con margen extra.
   - Luego: e1RM de la última sesión con *repeticiones + RIR* (Brzycki ≤ 10, Epley > 10) y la tabla de
     %1RM para el rango de hoy; progresión doble y un máximo de +5 % por sesión.
3. **Series**: peso y repeticiones hechas → RIR de la serie (0 al límite … 4+, con su RPE = 10 − RIR) →
   descanso con cronómetro. Si el RIR se aleja del objetivo, sugiere ajustar el peso en la siguiente serie.
4. **Fin del día**: esfuerzo de la sesión (sRPE 1-10) y opinión sobre la guía (1-5) + comentario.

**Tiempos**: al tocar *Empezar* hay una cuenta regresiva 3-2-1 (sonido y vibración); el descanso también
avisa sus últimos 3 segundos. Arriba se ve el cronómetro del ejercicio y de la serie. Por cada serie se
guarda el trabajo (`duration_s`) y el descanso real tomado (`rest_s`); la vista `exercise_times`
(con RLS) suma el tiempo por ejercicio para analizar y ajustar la duración de las rutinas.

**Pausa**: congela todos los cronómetros; el tiempo en pausa no cuenta en series, descansos ni duración
(se guarda aparte en `paused_s`).

**Calificación y cambio de ejercicio**: al terminar cada ejercicio se califica de 1 a 10
(`exercise_ratings`). Con *No me gusta, cambiar ejercicio* (o una nota ≤ 4) la app propone alternativas
seguras del mismo músculo (`findAlternatives`, mismos filtros de equipo, nivel y salud que el generador) y
`swap_exercise` lo reemplaza en la misma posición de todos los días de la rutina. El motivo queda en
`exercise_preferences` y el generador ya no vuelve a proponer ese ejercicio.

**Navegación y terminar antes**: en la barra inferior, ◀ y ▶ cambian de ejercicio (al volver se sigue desde
la serie que falta). Desde la ✕ o la pausa se puede *Terminar el día ahora*: el cierre pregunta el porqué
(cansancio, tiempo, dolor, equipo, dificultad, no entendí, otro + comentario). Se guardan en
`workout_logs` (`ended_early`, `end_reasons`, `end_note`, `exercises_planned`, `exercises_done`,
`skipped_exercises`). Para analizar a todos los usuarios, desde el SQL Editor:

```sql
select reason, sum(times) as veces, round(avg(avg_completion_pct)) as pct_completado
from public.end_reason_stats group by reason order by veces desc;
```

Se guarda todo junto con `log_workout` (o queda pendiente sin conexión): series con peso, repeticiones,
RIR y RPE, y por entrenamiento el **tonelaje**, las **series efectivas** (RIR ≤ 3) y el **INOL**.
El INOL se guarda para gráficos, pero no se muestra: en rangos de hipertrofia (10-15 repeticiones)
sobreestima la dureza. La velocidad de barra (VBT) no se mide porque requiere un sensor.

## Crear una rutina a mano (`/crear-rutina`)

Diseño (leyes de UX): tarjetas de días fijas arriba con nombre, ejercicios, minutos y aviso (Jakob,
Proximidad); dos modos, **➕ Agregar** (cuerpo + zonas por región en botones grandes) y **📋 Mi día**
(barra de tiempo, avisos de ese día, lista con arrastrar para ordenar y hoja de edición con controles
grandes) (Hick, Fitts); la revisión final va en una pantalla aparte con **Revisar y guardar** siempre abajo.
La app ordena cada día sola, le pone nombre, permite copiar un día a otro y guarda el borrador (Tesler).

Desde **Mis rutinas → Crear mi rutina a mano** (o al final de *Mi rutina*):

- Arriba siempre se ven las respuestas del registro (objetivo, nivel, días, minutos, lugar y lesiones).
- Un **cuerpo humano interactivo** (frente y espalda): al tocar una zona aparecen sus músculos y todos los
  ejercicios que le sirven a la persona (`exercisesForMuscle`: equipo, nivel, salud y preferencias), con
  los ⭐ recomendados primero y su prescripción y descanso sugeridos. Series, repeticiones y descanso se
  pueden cambiar: es 100 % manual.
- **Límites**: máximo 12 ejercicios por día y 4 del mismo músculo por día (al superarlos, la app explica por
  qué y ofrece otro día). Si un ejercicio no cabe en los minutos disponibles, pregunta antes de agregarlo.
  El servidor (`save_routine`, migración 010) rechaza días con más de 15 ejercicios.
- Cada zona se muestra **solo con sus ejercicios** y en este orden: ⭐ recomendados para esa parte,
  💡 consejos (`core/manual/part-guide.ts`), 🤝 partes que combinan bien el mismo día (empuje/tirón/piernas)
  y la lista completa agrupada por máquinas, poleas, peso libre y peso corporal (filtrable por músculo).
- La app **contradice con argumentos** (`core/manual/manual-plan.ts`) y propone cómo arreglarlo: mismo
  músculo en días seguidos (→ "Llevar al Día X"), más de 10 series por músculo en un día, días más largos que
  el tiempo disponible, orden (→ "Ordenar automáticamente"), mucha carga lumbar junta, desequilibrio
  empuje/tirón o cuádriceps/isquiotibiales, grupos que faltan y lesiones activas (zona en rojo y qué entrenar
  en su lugar).
- Al final, un **resumen** con la intensidad total, los minutos de cada día y las series semanales por
  músculo frente al rango recomendado. Se guarda con `save_routine` y queda como rutina actual.

## Seguridad

- **RLS** en todas las tablas: cada usuario solo ve y modifica lo suyo. Los catálogos son de solo lectura.
- Las rutinas se guardan con la función `save_routine` (**SECURITY INVOKER**, todo o nada) y se activan con
  `activate_routine`. Un índice único garantiza una sola rutina activa por usuario.
- Los registros de entrenamiento solo pueden apuntar a días de rutinas propias.
- Límites de largo en todos los textos libres y validaciones de rangos.
- Contraseñas de 8+ caracteres con letras y números (cliente y Supabase Auth).
- Al cerrar sesión se borra del teléfono todo lo guardado (borradores con datos de salud, rutina).
- Cabeceras en Cloudflare (`src/_headers`): CSP estricta, HSTS, `X-Frame-Options`, etc.

## PWA

- Service worker de Angular: aviso de "versión nueva" para actualizar.
- La rutina activa se guarda en el teléfono y se puede ver **sin conexión**.
- Las imágenes de los ejercicios se guardan en caché.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | App en modo desarrollo contra Supabase local |
| `npm run build` | Build de producción en `www/` |
| `npm run test:unit` | Tests unitarios (Vitest), incluye el generador |
| `npx playwright test` | Tests e2e con el Chrome del equipo |
| `npm run lint` | ESLint + Prettier |
