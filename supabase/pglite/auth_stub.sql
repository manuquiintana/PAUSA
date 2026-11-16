-- Réplica mínima del entorno de Supabase para el modo demo y para `npm run test:rls`.
-- auth.uid() funciona igual que en Supabase: lee el "sub" del JWT de la sesión.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text unique not null
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  ), '')::uuid
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
