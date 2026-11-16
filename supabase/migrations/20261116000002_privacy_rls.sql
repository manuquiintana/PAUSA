-- Pausa · Fase 1 · Privacidad
-- Reglas: managers y admins NUNCA leen check-ins, notas, preferencias ni pausas individuales.
-- Solo obtienen agregados a través de funciones security definer con umbral de 5 personas.

-- ───────────────── Helpers (esquema privado, no expuesto por la API) ─────────────────

create or replace function private.my_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function private.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function private.is_company_admin(p_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and company_id = p_company)
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
revoke all on schema private from anon;

-- ───────────────── Permisos base ─────────────────
-- anon no puede leer nada. authenticated, solo lo que permita RLS.

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.companies to authenticated;
grant update (name, pause_window_start, pause_window_end, timezone) on public.companies to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.preferences to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
grant select on public.activities, public.activity_steps to authenticated;
grant select, insert, update, delete on public.pause_sessions to authenticated;

-- ───────────────── RLS en todas las tablas ─────────────────

alter table public.companies      enable row level security;
alter table public.profiles       enable row level security;
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.preferences    enable row level security;
alter table public.checkins       enable row level security;
alter table public.activities     enable row level security;
alter table public.activity_steps enable row level security;
alter table public.pause_sessions enable row level security;

-- Empresa: cada usuario ve la suya; solo su admin la edita (ventana horaria).
create policy companies_select on public.companies for select to authenticated
  using (id = private.my_company_id());
create policy companies_update on public.companies for update to authenticated
  using (private.is_company_admin(id)) with check (private.is_company_admin(id));

-- Perfiles: nombre y rol visibles dentro de la misma empresa. Cada uno edita solo su nombre.
-- El rol se cambia con la función admin_set_role (no por UPDATE directo).
create policy profiles_select on public.profiles for select to authenticated
  using (company_id = private.my_company_id());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Equipos: visibles en la empresa; solo el admin los gestiona.
create policy teams_select on public.teams for select to authenticated
  using (company_id = private.my_company_id());
create policy teams_admin_insert on public.teams for insert to authenticated
  with check (private.is_company_admin(company_id));
create policy teams_admin_update on public.teams for update to authenticated
  using (private.is_company_admin(company_id)) with check (private.is_company_admin(company_id));
create policy teams_admin_delete on public.teams for delete to authenticated
  using (private.is_company_admin(company_id));

-- Miembros de equipo: visibles en la empresa; solo el admin los gestiona.
create policy team_members_select on public.team_members for select to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and t.company_id = private.my_company_id()));
create policy team_members_admin_insert on public.team_members for insert to authenticated
  with check (exists (select 1 from public.teams t where t.id = team_id and private.is_company_admin(t.company_id)));
create policy team_members_admin_delete on public.team_members for delete to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and private.is_company_admin(t.company_id)));

-- Datos personales: SOLO su propietario. No hay ninguna política para managers ni admins.
create policy preferences_own on public.preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy checkins_own on public.checkins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pause_sessions_own on public.pause_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Contenido: lectura para cualquier usuario autenticado.
create policy activities_read on public.activities for select to authenticated using (true);
create policy activity_steps_read on public.activity_steps for select to authenticated using (true);

-- ───────────────── Agregados de bienestar ─────────────────
-- Periodos fijos (semana o mes naturales) para que no se puedan restar ventanas solapadas
-- y deducir datos de una persona. Si < 5 personas distintas aportaron datos → sin datos.

create or replace function private.period_bounds(p_period text, p_offset int)
returns table (period_start date, period_end date)
language plpgsql immutable as $$
declare s date;
begin
  if p_period not in ('week', 'month') then raise exception 'Periodo no válido'; end if;
  if p_offset < 0 or p_offset > 52 then raise exception 'Desplazamiento no válido'; end if;
  s := (date_trunc(p_period, current_date::timestamp) - make_interval(
         weeks => case when p_period = 'week' then p_offset else 0 end,
         months => case when p_period = 'month' then p_offset else 0 end))::date;
  period_start := s;
  period_end := (s + case when p_period = 'week' then interval '1 week' else interval '1 month' end - interval '1 day')::date;
  return next;
end $$;

-- Núcleo común: agrega sobre un conjunto de personas. No se expone directamente.
create or replace function private.aggregate_wellbeing(p_users uuid[], p_from date, p_to date)
returns table (
  contributors int, sufficient boolean,
  avg_start numeric, avg_end numeric, checkins_count int, pauses_completed int
)
language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  select count(distinct c.user_id) into n
  from checkins c where c.user_id = any(p_users) and c.day between p_from and p_to;

  if n < 5 then
    -- Ni siquiera devolvemos el número exacto de participantes por debajo del umbral.
    return query select null::int, false, null::numeric, null::numeric, null::int, null::int;
    return;
  end if;

  return query
  select n, true,
    round(avg(c.score) filter (where c.moment = 'start'), 1),
    round(avg(c.score) filter (where c.moment = 'end'), 1),
    count(*)::int,
    (select count(*)::int from pause_sessions s
       where s.user_id = any(p_users) and s.completed_at is not null
         and s.started_at::date between p_from and p_to)
  from checkins c
  where c.user_id = any(p_users) and c.day between p_from and p_to;
end $$;

-- Indicadores de un equipo: solo su manager o el admin de la empresa.
create or replace function public.team_wellbeing(p_team_id uuid, p_period text default 'week', p_offset int default 0)
returns table (
  period_start date, period_end date, contributors int, sufficient boolean,
  avg_start numeric, avg_end numeric, checkins_count int, pauses_completed int
)
language plpgsql stable security definer set search_path = public as $$
declare t teams; b record; members uuid[];
begin
  select * into t from teams where id = p_team_id;
  if t.id is null or not (t.manager_id = auth.uid() or private.is_company_admin(t.company_id)) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into b from private.period_bounds(p_period, p_offset);
  select coalesce(array_agg(user_id), '{}') into members from team_members where team_id = p_team_id;
  return query select b.period_start, b.period_end, a.* from private.aggregate_wellbeing(members, b.period_start, b.period_end) a;
end $$;

-- Indicadores de toda la empresa: solo admin.
create or replace function public.company_wellbeing(p_period text default 'week', p_offset int default 0)
returns table (
  period_start date, period_end date, contributors int, sufficient boolean,
  avg_start numeric, avg_end numeric, checkins_count int, pauses_completed int
)
language plpgsql stable security definer set search_path = public as $$
declare cid uuid := private.my_company_id(); b record; members uuid[];
begin
  if cid is null or not private.is_company_admin(cid) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into b from private.period_bounds(p_period, p_offset);
  select coalesce(array_agg(id), '{}') into members from profiles where company_id = cid;
  return query select b.period_start, b.period_end, a.* from private.aggregate_wellbeing(members, b.period_start, b.period_end) a;
end $$;

-- Cambio de rol por el admin (no se puede cambiar el propio rol para no quedarse sin admin).
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare target profiles;
begin
  select * into target from profiles where id = p_user;
  if target.id is null or not private.is_company_admin(target.company_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_user = auth.uid() then raise exception 'No puedes cambiar tu propio rol'; end if;
  if p_role not in ('employee', 'manager', 'admin') then raise exception 'Rol no válido'; end if;
  update profiles set role = p_role where id = p_user;
end $$;

revoke all on function private.aggregate_wellbeing(uuid[], date, date) from public, authenticated, anon;
revoke all on function public.team_wellbeing(uuid, text, int) from public, anon;
revoke all on function public.company_wellbeing(text, int) from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.team_wellbeing(uuid, text, int) to authenticated;
grant execute on function public.company_wellbeing(text, int) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
