-- Pausa · Datos de ejemplo (2 empresas). Requiere que existan los usuarios en auth.users
-- (en Supabase: 01_auth_users.sql; en el modo demo los crea el propio navegador).

insert into public.companies (id, name, pause_window_start, pause_window_end) values
  ('a0000000-0000-4000-8000-000000000001', 'Demo Logística S.L.', '09:30', '18:00'),
  ('b0000000-0000-4000-8000-000000000001', 'Otra Empresa S.A.',   '09:00', '17:00');

insert into public.profiles (id, company_id, full_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Lucía Martín',  'admin'),
  ('10000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Carlos Ruiz',   'manager'),
  ('10000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Ana López',     'employee'),
  ('10000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Javier Sanz',   'employee'),
  ('10000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Marta Díaz',    'employee'),
  ('10000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Pablo Moreno',  'employee'),
  ('10000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Elena Navarro', 'employee'),
  ('10000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'Sergio Gil',    'employee'),
  ('10000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'Irene Gómez',   'manager'),
  ('10000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'Diego Romero',  'employee'),
  ('10000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'Nuria Vidal',   'employee'),
  ('20000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Tomás Herrera', 'admin'),
  ('20000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Rosa Castro',   'employee');

insert into public.teams (id, company_id, name, manager_id) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Operaciones', '10000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Marketing',   '10000000-0000-4000-8000-000000000009'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'General',     null);

-- Operaciones: 7 personas (supera el umbral). Marketing: 3 personas (no lo supera).
insert into public.team_members (team_id, user_id) values
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005'),
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006'),
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007'),
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000008'),
  ('c0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000009'),
  ('c0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000010'),
  ('c0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000011'),
  ('c0000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002');

insert into public.preferences (user_id, needs, pauses_per_day, can_stand, work_start, work_end, onboarded_at)
select id, array['cuello_espalda', 'concentracion'], 2, true, '09:00', '18:00', now()
from public.profiles;

-- Check-ins de las últimas 3 semanas (días laborables), con puntuaciones variadas y deterministas.
-- Algunos días la persona no responde (el check-in es voluntario).
insert into public.checkins (user_id, company_id, day, moment, score, note)
select p.id, p.company_id, d::date, m.moment,
       least(10, greatest(1, 5 + (abs(hashtext(p.id::text || d::text || m.moment)) % 5) - (case when m.moment = 'end' then 1 else 0 end))),
       case when abs(hashtext(p.id::text || d::text)) % 9 = 0 then 'Nota privada de ejemplo' end
from public.profiles p
cross join generate_series(current_date - 20, current_date, interval '1 day') d
cross join (values ('start'), ('end')) m(moment)
where extract(isodow from d) < 6
  and abs(hashtext(p.id::text || d::text || 'skip')) % 6 <> 0
  and not (d::date = current_date and m.moment = 'end');
