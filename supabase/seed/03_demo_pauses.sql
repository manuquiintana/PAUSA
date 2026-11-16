-- Pausa · Datos de ejemplo de la fase 2. Requiere la migración de contenido (actividades).

-- Ana todavía no ha hecho el onboarding: así se puede probar el flujo completo en la demo.
update public.preferences
   set onboarded_at = null, needs = '{}'
 where user_id = '10000000-0000-4000-8000-000000000003';

-- Variedad de preferencias entre las personas demo
update public.preferences set needs = array['calma', 'desconectar'], can_stand = false, pauses_per_day = 3
 where user_id = '10000000-0000-4000-8000-000000000002'; -- Carlos
update public.preferences set needs = array['energia'], pauses_per_day = 1
 where user_id = '10000000-0000-4000-8000-000000000001'; -- Lucía

-- Pausas realizadas en las últimas 3 semanas (días laborables), deterministas.
insert into public.pause_sessions (user_id, company_id, activity_id, started_at, completed_at)
select p.id, p.company_id, a.id,
       d + time '11:00' + make_interval(mins => abs(hashtext(p.id::text || d::text)) % 240),
       case when abs(hashtext(p.id::text || d::text || 'ok')) % 5 <> 0
            then d + time '11:00' + make_interval(mins => abs(hashtext(p.id::text || d::text)) % 240 + a.duration_min) end
from public.profiles p
cross join generate_series(current_date - 21, current_date - 1, interval '1 day') d
join lateral (
  select id, duration_min from public.activities
  order by abs(hashtext(id || p.id::text || d::text)) limit 1
) a on true
where extract(isodow from d) < 6
  and abs(hashtext(p.id::text || d::text || 'pausa')) % 3 <> 0;
