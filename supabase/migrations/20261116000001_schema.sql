-- Pausa · Fase 1 · Esquema base
-- Multiempresa: todas las tablas con datos de empresa llevan company_id.
-- gen_random_uuid() es nativo de Postgres 13+ (no requiere extensiones).


create schema if not exists private;

-- ───────────────────────── Tablas ─────────────────────────

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Ventana horaria en la que se pueden enviar recordatorios de pausa (la define RR. HH.)
  pause_window_start time not null default '09:00',
  pause_window_end   time not null default '18:00',
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now(),
  constraint pause_window_valid check (pause_window_start < pause_window_end)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('employee', 'manager', 'admin')),
  created_at timestamptz not null default now()
);
create index on public.profiles (company_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
create index on public.teams (company_id);
create index on public.teams (manager_id);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (team_id, user_id)
);
create index on public.team_members (user_id);

-- Preferencias del onboarding (privadas del empleado)
create table public.preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  needs text[] not null default '{}'
    check (needs <@ array['cuello_espalda', 'desconectar', 'concentracion', 'energia', 'calma']),
  pauses_per_day int not null default 2 check (pauses_per_day between 1 and 3),
  can_stand boolean not null default true,
  work_start time not null default '09:00',
  work_end   time not null default '18:00',
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Check-in de inicio / fin de jornada (privado: solo lo ve su autor)
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null default current_date,
  moment text not null check (moment in ('start', 'end')),
  score int not null check (score between 1 and 10),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, day, moment)
);
create index on public.checkins (company_id, day);

-- Catálogo de actividades (contenido común a todas las empresas)
create table public.activities (
  id text primary key,
  module text not null check (module in ('stretch', 'breathe', 'mindfulness', 'positive', 'reset')),
  title text not null,
  summary text not null default '',
  duration_min int not null check (duration_min between 1 and 15),
  requires_standing boolean not null default false,
  needs text[] not null default '{}',
  review_status text not null default 'pendiente de revisión profesional',
  created_at timestamptz not null default now()
);

create table public.activity_steps (
  activity_id text not null references public.activities(id) on delete cascade,
  position int not null,
  text text not null,
  seconds int not null check (seconds > 0),
  animation text not null default 'pulse',
  primary key (activity_id, position)
);

-- Pausas realizadas (privadas del empleado)
create table public.pause_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  activity_id text not null references public.activities(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index on public.pause_sessions (user_id, started_at);
create index on public.pause_sessions (company_id, started_at);

-- ───────────────── Integridad entre empresas ─────────────────
-- Un equipo solo puede tener manager y miembros de su misma empresa.

create or replace function private.check_team_manager() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.manager_id is not null and not exists (
    select 1 from profiles p where p.id = new.manager_id
      and p.company_id = new.company_id and p.role in ('manager', 'admin')) then
    raise exception 'El manager debe pertenecer a la empresa y tener rol manager';
  end if;
  return new;
end $$;

create or replace function private.check_team_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from teams t join profiles p on p.company_id = t.company_id
                 where t.id = new.team_id and p.id = new.user_id) then
    raise exception 'El miembro debe pertenecer a la misma empresa que el equipo';
  end if;
  return new;
end $$;

create trigger teams_company_check before insert or update on public.teams
  for each row execute function private.check_team_manager();
create trigger team_members_company_check before insert or update on public.team_members
  for each row execute function private.check_team_member();

-- company_id de check-ins y pausas siempre = empresa del autor (no se puede falsear)
create or replace function private.set_company_from_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select company_id into new.company_id from profiles where id = new.user_id;
  return new;
end $$;

create trigger checkins_set_company before insert or update on public.checkins
  for each row execute function private.set_company_from_user();
create trigger pause_sessions_set_company before insert or update on public.pause_sessions
  for each row execute function private.set_company_from_user();
