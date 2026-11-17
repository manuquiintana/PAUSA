/**
 * npm run test:rls — Verifica las reglas de privacidad con usuarios de cada rol.
 * Usa las MISMAS migraciones que Supabase sobre un Postgres embebido (PGlite).
 */
import { createDemoDb, asUser } from '../src/lib/demo/setup'
import { loadSqlFromDisk } from './load-sql'
import { AVATAR_POSES } from '../src/lib/avatar'

const U = {
  admin: '10000000-0000-4000-8000-000000000001', // Lucía (empresa A)
  manager: '10000000-0000-4000-8000-000000000002', // Carlos (Operaciones, 7 personas)
  managerSmall: '10000000-0000-4000-8000-000000000009', // Irene (Marketing, 3 personas)
  employee: '10000000-0000-4000-8000-000000000003', // Ana (Operaciones)
  employee2: '10000000-0000-4000-8000-000000000004', // Javier (Operaciones)
  otherAdmin: '20000000-0000-4000-8000-000000000001', // Tomás (empresa B)
}
const T = {
  ops: 'c0000000-0000-4000-8000-000000000001',
  mkt: 'c0000000-0000-4000-8000-000000000002',
  otherCo: 'c0000000-0000-4000-8000-000000000003',
}
const COMPANY_A = 'a0000000-0000-4000-8000-000000000001'

let passed = 0
let failed = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) passed++
  else failed++
  console.log(`${ok ? '  ✔' : '  ✘'} ${name}${!ok && detail ? ` → ${detail}` : ''}`)
}

const pg = await createDemoDb(loadSqlFromDisk())
type Row = Record<string, unknown>
const q = (uid: string | null, sql: string, params: unknown[] = []) =>
  asUser(pg, uid, async (tx) => (await tx.query<Row>(sql, params)).rows)
const fails = async (uid: string | null, sql: string, params: unknown[] = []) => {
  try {
    await q(uid, sql, params)
    return false
  } catch {
    return true
  }
}
const count = async (uid: string | null, sql: string, params: unknown[] = []) =>
  Number((await q(uid, sql, params))[0].n)

console.log('\nCheck-ins y notas (datos individuales)')
check('El empleado ve sus propios check-ins', (await count(U.employee, 'select count(*) n from checkins')) > 0)
check('El empleado solo ve los suyos',
  (await count(U.employee, 'select count(*) n from checkins where user_id <> $1', [U.employee])) === 0)
check('El manager obtiene 0 filas de check-ins de su equipo',
  (await count(U.manager, 'select count(*) n from checkins where user_id = $1', [U.employee])) === 0)
check('El admin obtiene 0 filas de check-ins de otros',
  (await count(U.admin, 'select count(*) n from checkins where user_id <> $1', [U.admin])) === 0)
check('Un usuario no autenticado no ve nada', await fails(null, 'select count(*) n from checkins'))
check('No se puede crear un check-in a nombre de otro',
  await fails(U.manager, `insert into checkins (user_id, moment, score) values ($1, 'start', 2)`, [U.employee]))
const before = await count(U.employee, 'select count(*) n from checkins')
await q(U.manager, 'update checkins set score = 1 where user_id = $1', [U.employee])
await q(U.manager, 'delete from checkins where user_id = $1', [U.employee])
check('El manager no puede modificar ni borrar check-ins ajenos',
  (await count(U.employee, 'select count(*) n from checkins')) === before)

console.log('\nPreferencias y pausas')
check('El manager no ve preferencias ajenas',
  (await count(U.manager, 'select count(*) n from preferences where user_id <> $1', [U.manager])) === 0)
check('El admin no ve preferencias ajenas',
  (await count(U.admin, 'select count(*) n from preferences where user_id <> $1', [U.admin])) === 0)
check('El admin no ve pausas ajenas',
  (await count(U.admin, 'select count(*) n from pause_sessions where user_id <> $1', [U.admin])) === 0)

console.log('\nAgregados con umbral de 5 personas')
const ops = (await q(U.manager, `select * from team_wellbeing($1, 'week', 1)`, [T.ops]))[0]
check('Equipo de 7: indicadores disponibles', ops.sufficient === true && Number(ops.contributors) >= 5)
const mkt = (await q(U.managerSmall, `select * from team_wellbeing($1, 'week', 1)`, [T.mkt]))[0]
check('Equipo de 3: "datos insuficientes" y sin cifras',
  mkt.sufficient === false && mkt.avg_start === null && mkt.avg_end === null && mkt.contributors === null)
check('Un manager no puede consultar otro equipo',
  await fails(U.manager, `select * from team_wellbeing($1, 'week', 1)`, [T.mkt]))
check('Un empleado no puede consultar agregados de equipo',
  await fails(U.employee, `select * from team_wellbeing($1, 'week', 1)`, [T.ops]))
check('El admin puede ver los agregados de cualquier equipo de su empresa',
  !(await fails(U.admin, `select * from team_wellbeing($1, 'week', 1)`, [T.ops])))
check('El admin de otra empresa no puede consultar equipos ajenos',
  await fails(U.otherAdmin, `select * from team_wellbeing($1, 'week', 1)`, [T.ops]))
check('Solo periodos fijos (semana/mes): no se aceptan rangos libres',
  await fails(U.manager, `select * from team_wellbeing($1, 'day', 0)`, [T.ops]))
check('La función interna de agregación no es invocable directamente',
  await fails(U.manager, `select * from private.aggregate_wellbeing(array[$1]::uuid[], current_date - 30, current_date)`, [U.employee]))
check('Un empleado no puede ver agregados de empresa', await fails(U.employee, `select * from company_wellbeing('week', 1)`))
const co = (await q(U.admin, `select * from company_wellbeing('week', 1)`))[0]
check('El admin ve agregados de su empresa', co.sufficient === true)

console.log('\nMultiempresa')
check('El admin B no ve la empresa A',
  (await count(U.otherAdmin, 'select count(*) n from companies where id = $1', [COMPANY_A])) === 0)
check('El admin B no ve perfiles de la empresa A',
  (await count(U.otherAdmin, 'select count(*) n from profiles where company_id = $1', [COMPANY_A])) === 0)
check('El admin B no ve equipos de la empresa A',
  (await count(U.otherAdmin, 'select count(*) n from teams where company_id = $1', [COMPANY_A])) === 0)
check('El admin B no puede crear equipos en la empresa A',
  await fails(U.otherAdmin, `insert into teams (company_id, name) values ($1, 'Intruso')`, [COMPANY_A]))
check('No se puede añadir a un equipo a alguien de otra empresa',
  await fails(U.admin, 'insert into team_members (team_id, user_id) values ($1, $2)', [T.ops, '20000000-0000-4000-8000-000000000002']))

console.log('\nGestión (admin)')
check('Un empleado no puede crear equipos',
  await fails(U.employee, `insert into teams (company_id, name) values ($1, 'X')`, [COMPANY_A]))
check('Un empleado no puede cambiarse el rol',
  await fails(U.employee, `update profiles set role = 'admin' where id = $1`, [U.employee]))
check('Un empleado no puede usar admin_set_role',
  await fails(U.employee, `select admin_set_role($1, 'admin')`, [U.employee2]))
check('Un manager no puede cambiar la ventana horaria',
  (await q(U.manager, `update companies set pause_window_start = '07:00' returning id`)).length === 0)
check('El admin sí puede cambiar la ventana horaria',
  (await q(U.admin, `update companies set pause_window_start = '09:00' returning id`)).length === 1)

console.log('\nFase 2 · Contenido de pausas')
check('Cualquier usuario autenticado lee el catálogo',
  (await count(U.employee, 'select count(*) n from activities')) === 15 &&
  (await count(U.otherAdmin, 'select count(*) n from activity_steps')) > 0)
check('Un usuario no autenticado no lee el catálogo', await fails(null, 'select count(*) n from activities'))
check('Nadie puede modificar el catálogo desde la app',
  await fails(U.admin, `insert into activities (id, module, title, duration_min) values ('x', 'breathe', 'X', 5)`))
check('Los pasos de cada actividad suman exactamente su duración',
  (await count(U.employee, `select count(*) n from activities a
     where a.duration_min * 60 <> (select sum(seconds) from activity_steps s where s.activity_id = a.id)`)) === 0)
check('Todo el contenido está marcado "pendiente de revisión profesional"',
  (await count(U.employee, `select count(*) n from activities where review_status <> 'pendiente de revisión profesional'`)) === 0)

console.log('\nFase 2 · Pausas y preferencias')
check('El empleado ve sus pausas',
  (await count(U.employee, 'select count(*) n from pause_sessions')) > 0)
check('El manager obtiene 0 filas de pausas de su equipo',
  (await count(U.manager, 'select count(*) n from pause_sessions where user_id = $1', [U.employee])) === 0)
check('No se puede registrar una pausa a nombre de otro',
  await fails(U.manager, `insert into pause_sessions (user_id, activity_id) values ($1, 'breathe-consciente')`, [U.employee]))
check('No se puede completar la pausa de otro',
  (await q(U.manager, `update pause_sessions set completed_at = now() where user_id = $1 returning id`, [U.employee])).length === 0)
const sid = (await q(U.employee, `insert into pause_sessions (user_id, activity_id) values ($1, 'breathe-consciente') returning id, company_id`, [U.employee]))[0]
check('Registrar y completar la propia pausa (empresa asignada automáticamente)',
  sid.company_id === COMPANY_A &&
  (await q(U.employee, `update pause_sessions set completed_at = now() where id = $1 returning id`, [sid.id])).length === 1)
check('El empleado guarda sus preferencias',
  (await q(U.employee, `insert into preferences (user_id, needs, onboarded_at) values ($1, array['calma'], now())
     on conflict (user_id) do update set needs = excluded.needs returning user_id`, [U.employee])).length === 1)
check('Nadie puede escribir preferencias de otro',
  await fails(U.admin, `insert into preferences (user_id, needs) values ($1, array['calma'])
     on conflict (user_id) do update set needs = excluded.needs`, [U.employee2]))
const opsLast = (await q(U.manager, `select * from team_wellbeing($1, 'week', 1)`, [T.ops]))[0]
check('"Pausas completadas" llega solo como total del equipo', Number(opsLast.pauses_completed) > 0)

console.log('\nAvatar guía')
const poses = (await q(U.employee, 'select distinct pose from activity_steps where pose is not null')).map((r) => String(r.pose))
check('Todos los movimientos asignados existen en el avatar', poses.length > 0 && poses.every((p) => AVATAR_POSES.includes(p)))
check('Los pasos de actividades de pie no muestran el avatar sentado',
  (await count(U.employee, `select count(*) n from activity_steps s join activities a on a.id = s.activity_id
     where a.requires_standing and s.pose = 'respirar'`)) === 0)
check('La guía elegida es privada (otro usuario no la ve)',
  (await count(U.manager, 'select count(*) n from preferences where user_id = $1', [U.employee])) === 0)
check('La guía solo admite mujer u hombre',
  await fails(U.employee, `update preferences set guide = 'otro' where user_id = $1`, [U.employee]))

console.log(`\n${passed} correctas, ${failed} fallidas\n`)
await pg.close()
process.exit(failed ? 1 : 0)
