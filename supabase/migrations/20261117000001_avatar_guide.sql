-- Pausa · Avatar guía (muestra)
-- 1) Preferencia de guía (mujer / hombre), privada como el resto de preferencias.
-- 2) Movimiento del avatar en cada paso (null = se muestra la animación abstracta de siempre).
--    Movimientos pendientes de revisión profesional, igual que el resto del contenido.

alter table public.preferences
  add column guide text not null default 'mujer' check (guide in ('mujer', 'hombre'));

alter table public.activity_steps add column pose text;

-- Pasos tranquilos (respirar, quietud) de actividades sentadas → avatar sentado respirando
update public.activity_steps s set pose = 'respirar'
  from public.activities a
 where a.id = s.activity_id and not a.requires_standing and a.module <> 'reset'
   and (s.animation like 'breath:%' or s.animation = 'still');

-- Movimientos de la muestra
update public.activity_steps set pose = 'cuello-derecha'   where activity_id = 'stretch-cuello-hombros' and position = 3;
update public.activity_steps set pose = 'cuello-izquierda' where activity_id = 'stretch-cuello-hombros' and position = 4;
update public.activity_steps set pose = 'hombros-subir'    where activity_id = 'stretch-cuello-hombros' and position = 7;
update public.activity_steps set pose = 'brazos-arriba'    where activity_id = 'stretch-espalda-manos'  and position = 7;
