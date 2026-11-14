-- Dos personas, dos perfiles independientes. Vínculo de pareja OPCIONAL para:
--   1. compartir una rutina (se copia la estructura; las cargas de cada quien salen de SU historial);
--   2. comparar un resumen semanal (solo si la otra persona activó compartirlo).
-- Nunca se exponen pesos, repeticiones ni series de la otra persona: RLS sigue siendo "cada quien lo
-- suyo" y estas funciones solo devuelven conteos agregados.
-- Es seguro ejecutarla más de una vez. Reversa: migrations/down/017_partner.down.sql

create table if not exists public.partner_links (
  id                     uuid primary key default gen_random_uuid(),
  requester_id           uuid not null references auth.users(id) on delete cascade,
  partner_id             uuid not null references auth.users(id) on delete cascade,
  status                 text not null default 'pendiente' check (status in ('pendiente', 'aceptada')),
  requester_shares_stats boolean not null default false,
  partner_shares_stats   boolean not null default false,
  created_at             timestamptz not null default now(),
  accepted_at            timestamptz,
  constraint partner_links_distinct check (requester_id <> partner_id)
);
-- Un solo vínculo por par, sin importar quién invitó.
create unique index if not exists partner_links_pair_idx
  on public.partner_links (least(requester_id, partner_id), greatest(requester_id, partner_id));
create index if not exists partner_links_partner_idx on public.partner_links (partner_id);

alter table public.partner_links enable row level security;
-- Solo lectura y borrado directos; crear y aceptar pasa por las funciones de abajo.
drop policy if exists "vinculo_lectura" on public.partner_links;
create policy "vinculo_lectura" on public.partner_links
  for select to authenticated
  using ((select auth.uid()) in (requester_id, partner_id));
drop policy if exists "vinculo_borrar" on public.partner_links;
create policy "vinculo_borrar" on public.partner_links
  for delete to authenticated
  using ((select auth.uid()) in (requester_id, partner_id));

-- ---------- Invitar por correo ----------
create or replace function public.invite_partner(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  select id into v_other from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_other is null then
    raise exception 'No hay una cuenta con ese correo' using errcode = 'P0002';
  end if;
  if v_other = v_me then
    raise exception 'No puedes vincularte contigo' using errcode = '22023';
  end if;
  if exists (select 1 from public.partner_links where v_me in (requester_id, partner_id))
     or exists (select 1 from public.partner_links where v_other in (requester_id, partner_id)) then
    raise exception 'Ya existe un vínculo de pareja para alguna de las dos cuentas' using errcode = '23505';
  end if;
  insert into public.partner_links (requester_id, partner_id) values (v_me, v_other) returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Aceptar o rechazar ----------
create or replace function public.respond_partner(p_link_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.partner_links where id = p_link_id and partner_id = auth.uid() and status = 'pendiente'
  ) then
    raise exception 'Invitación no encontrada' using errcode = 'P0002';
  end if;
  if p_accept then
    update public.partner_links set status = 'aceptada', accepted_at = now() where id = p_link_id;
  else
    delete from public.partner_links where id = p_link_id;
  end if;
end;
$$;

-- ---------- Activar o desactivar que la pareja vea MI resumen ----------
create or replace function public.set_partner_sharing(p_share boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  update public.partner_links set requester_shares_stats = p_share where requester_id = auth.uid();
  update public.partner_links set partner_shares_stats = p_share where partner_id = auth.uid();
end;
$$;

-- ---------- Mi vínculo (con el nombre de la otra persona) ----------
create or replace function public.my_partner()
returns table (
  link_id uuid,
  partner_user_id uuid,
  partner_name text,
  status text,
  i_invited boolean,
  i_share boolean,
  partner_shares boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    case when l.requester_id = auth.uid() then l.partner_id else l.requester_id end,
    coalesce(nullif(p.full_name, ''), 'Tu pareja'),
    l.status,
    l.requester_id = auth.uid(),
    case when l.requester_id = auth.uid() then l.requester_shares_stats else l.partner_shares_stats end,
    case when l.requester_id = auth.uid() then l.partner_shares_stats else l.requester_shares_stats end
  from public.partner_links l
  left join public.profiles p
    on p.id = case when l.requester_id = auth.uid() then l.partner_id else l.requester_id end
  where auth.uid() in (l.requester_id, l.partner_id);
$$;

-- ---------- Compartir una rutina: la otra persona recibe una COPIA inactiva ----------
-- Se copian ejercicios, series, repeticiones y descansos. No se copia ninguna carga: cada persona
-- parte de su propio historial y ajusta su copia libremente.
create or replace function public.share_routine_with_partner(p_routine_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_name text;
  v_new uuid;
  v_day record;
  v_new_day uuid;
begin
  if v_me is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if not exists (select 1 from public.routines where id = p_routine_id and user_id = v_me) then
    raise exception 'Rutina no encontrada' using errcode = 'P0002';
  end if;
  select case when requester_id = v_me then partner_id else requester_id end into v_other
  from public.partner_links
  where v_me in (requester_id, partner_id) and status = 'aceptada';
  if v_other is null then
    raise exception 'No tienes un vínculo de pareja aceptado' using errcode = 'P0002';
  end if;
  if (select count(*) from public.routines where user_id = v_other) >= 50 then
    raise exception 'La otra persona ya tiene demasiadas rutinas guardadas' using errcode = '22023';
  end if;
  select coalesce(nullif(full_name, ''), 'tu pareja') into v_name from public.profiles where id = v_me;

  insert into public.routines (user_id, name, goal, days_per_week, is_active, place, notes, shared_from, shared_by_name)
  select v_other, left(r.name || ' (compartida)', 120), r.goal, r.days_per_week, false, r.place,
         'Rutina compartida. Las cargas son tuyas: salen de tu propio historial.', v_me, v_name
  from public.routines r where r.id = p_routine_id
  returning id into v_new;

  for v_day in select * from public.routine_days where routine_id = p_routine_id order by day_index loop
    insert into public.routine_days (routine_id, day_index, name, estimated_minutes, objective)
    values (v_new, v_day.day_index, v_day.name, v_day.estimated_minutes, v_day.objective)
    returning id into v_new_day;

    insert into public.routine_exercises
      (day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds, notes, rir_min, rir_max, tempo, rationale)
    select v_new_day, e.exercise_id, e.position, e.sets, e.reps_min, e.reps_max, e.rest_seconds, e.notes,
           e.rir_min, e.rir_max, e.tempo, e.rationale
    from public.routine_exercises e where e.day_id = v_day.id;
  end loop;

  return v_new;
end;
$$;

-- ---------- Resumen semanal de la pareja (solo agregados, solo si lo comparte) ----------
create or replace function public.partner_weekly_summary(p_weeks integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_shares boolean;
  v_from timestamptz;
  v_result jsonb;
begin
  if v_me is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  select
    case when requester_id = v_me then partner_id else requester_id end,
    case when requester_id = v_me then partner_shares_stats else requester_shares_stats end
  into v_other, v_shares
  from public.partner_links
  where v_me in (requester_id, partner_id) and status = 'aceptada';

  if v_other is null then
    return jsonb_build_object('available', false, 'reason', 'sin_vinculo');
  end if;
  if not coalesce(v_shares, false) then
    return jsonb_build_object('available', false, 'reason', 'no_comparte');
  end if;

  v_from := date_trunc('week', now()) - make_interval(weeks => least(26, greatest(1, p_weeks)) - 1);

  select jsonb_build_object(
    'available', true,
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week_start', wk::date,
        'sessions', sessions,
        'minutes', minutes,
        'effective_sets', effective_sets
      ) order by wk)
      from (
        select date_trunc('week', w.started_at) as wk,
               count(*) as sessions,
               round(sum(extract(epoch from (w.finished_at - w.started_at)) - coalesce(w.paused_s, 0)) / 60) as minutes,
               coalesce(sum(w.effective_sets), 0) as effective_sets
        from public.workout_logs w
        where w.user_id = v_other and w.finished_at is not null and w.started_at >= v_from
        group by 1
      ) t
    ), '[]'::jsonb),
    'muscle_sets', coalesce((
      select jsonb_object_agg(muscle, sets)
      from (
        select e.primary_muscles[1] as muscle, count(*) as sets
        from public.set_logs s
        join public.workout_logs w on w.id = s.workout_id
        join public.exercises e on e.id = s.exercise_id
        where w.user_id = v_other and w.started_at >= date_trunc('week', now())
          and s.reps is not null and e.category not in ('stretching', 'cardio')
          and e.primary_muscles[1] is not null
        group by 1
      ) m
    ), '{}'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.invite_partner(text) from public, anon;
revoke all on function public.respond_partner(uuid, boolean) from public, anon;
revoke all on function public.set_partner_sharing(boolean) from public, anon;
revoke all on function public.my_partner() from public, anon;
revoke all on function public.share_routine_with_partner(uuid) from public, anon;
revoke all on function public.partner_weekly_summary(integer) from public, anon;
grant execute on function public.invite_partner(text) to authenticated;
grant execute on function public.respond_partner(uuid, boolean) to authenticated;
grant execute on function public.set_partner_sharing(boolean) to authenticated;
grant execute on function public.my_partner() to authenticated;
grant execute on function public.share_routine_with_partner(uuid) to authenticated;
grant execute on function public.partner_weekly_summary(integer) to authenticated;

notify pgrst, 'reload schema';
