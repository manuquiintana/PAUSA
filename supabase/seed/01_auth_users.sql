-- SOLO PARA SUPABASE (proyecto de pruebas, nunca en producción con clientes reales).
-- Crea los usuarios demo con contraseña "PausaDemo2026!" para poder entrar con email + contraseña.
-- Ejecuta este archivo y luego 02_demo_data.sql en el SQL Editor de Supabase.

with u(id, email) as (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'lucia@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'carlos@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'ana@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'javier@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'marta@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'pablo@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'elena@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'sergio@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'irene@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'diego@demo-logistica.es'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'nuria@demo-logistica.es'),
  ('20000000-0000-4000-8000-000000000001'::uuid, 'tomas@otra-empresa.es'),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'rosa@otra-empresa.es')
), ins as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    crypt('PausaDemo2026!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  from u
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from ins;
