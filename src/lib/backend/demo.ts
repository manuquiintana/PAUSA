/**
 * Modo demo: Postgres real (PGlite) dentro del navegador, con las MISMAS migraciones,
 * políticas RLS y funciones de agregados que Supabase. Cada consulta se ejecuta como el
 * usuario con sesión (rol `authenticated` + auth.uid()), así que la privacidad se comporta igual.
 * Los cambios viven en memoria: al recargar la página se vuelve a los datos de ejemplo.
 */
import type { PGlite } from '@electric-sql/pglite'
import { asUser, createDemoDb } from '../demo/setup'
import { toWellbeing } from '../format'
import { byModule, fromPreferences, toActivity, toPreferences, toSession } from '../mappers'
import type { DataBackend, DemoPersona, Me, Period, TeamSummary } from '../types'
import authStub from '../../../supabase/pglite/auth_stub.sql?raw'
import demoUsers from '../../../supabase/pglite/demo_users.sql?raw'

const migrationFiles = import.meta.glob('../../../supabase/migrations/*.sql', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>
// Todos los datos de ejemplo salvo 01_auth_users.sql (que es solo para Supabase)
const seedFiles = import.meta.glob(['../../../supabase/seed/*.sql', '!../../../supabase/seed/01_auth_users.sql'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>
const sorted = (files: Record<string, string>) => Object.keys(files).sort().map((k) => files[k])

export const DEMO_PASSWORD = 'PausaDemo2026!'

export const DEMO_PERSONAS: DemoPersona[] = [
  { userId: '10000000-0000-4000-8000-000000000003', email: 'ana@demo-logistica.es', name: 'Ana López', role: 'employee',
    description: 'Empleada del equipo de Operaciones' },
  { userId: '10000000-0000-4000-8000-000000000002', email: 'carlos@demo-logistica.es', name: 'Carlos Ruiz', role: 'manager',
    description: 'Manager de Operaciones (7 personas)' },
  { userId: '10000000-0000-4000-8000-000000000009', email: 'irene@demo-logistica.es', name: 'Irene Gómez', role: 'manager',
    description: 'Manager de Marketing (3 personas: no alcanza el mínimo)' },
  { userId: '10000000-0000-4000-8000-000000000001', email: 'lucia@demo-logistica.es', name: 'Lucía Martín', role: 'admin',
    description: 'Admin de empresa · RR. HH.' },
]

const SESSION_KEY = 'pausa-demo-user'
const storage = {
  get: () => { try { return sessionStorage.getItem(SESSION_KEY) } catch { return null } },
  set: (v: string | null) => {
    try { if (v) sessionStorage.setItem(SESSION_KEY, v); else sessionStorage.removeItem(SESSION_KEY) } catch { /* sin almacenamiento */ }
  },
}

/** En el build de demo cargamos el sistema de archivos de PGlite empaquetado en JS (ver vite.config.ts). */
async function loadFsBundle(): Promise<Blob | undefined> {
  if (!import.meta.env.PROD) return undefined
  const file = './pglite-fs.js'
  try {
    const mod = (await import(/* @vite-ignore */ new URL(file, import.meta.url).href)) as { default: string }
    const bin = atob(mod.default)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    return await new Response(stream).blob()
  } catch {
    return undefined
  }
}

export function createDemoBackend(): DataBackend {
  let dbPromise: Promise<PGlite> | null = null
  const db = () =>
    (dbPromise ??= (async () =>
      createDemoDb(
        {
          authStub,
          migrations: sorted(migrationFiles),
          demoUsers,
          demoData: sorted(seedFiles),
        },
        await loadFsBundle(),
      ))())

  let userId: string | null = storage.get()

  async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const pg = await db()
    return asUser(pg, userId, async (tx) => (await tx.query<T>(sql, params)).rows)
  }

  const backend: DataBackend = {
    kind: 'demo',
    demoPersonas: DEMO_PERSONAS,

    async currentUserId() {
      await db()
      return userId
    },

    async signInAsDemo(id) {
      userId = id
      storage.set(id)
    },

    async signInWithPassword(email, password) {
      const pg = await db()
      const res = await pg.query<{ id: string }>('select id from auth.users where lower(email) = lower($1)', [email.trim()])
      if (!res.rows[0] || password !== DEMO_PASSWORD) throw new Error('Email o contraseña incorrectos')
      userId = res.rows[0].id
      storage.set(userId)
    },

    async signOut() {
      userId = null
      storage.set(null)
    },

    async getMe(): Promise<Me> {
      const [r] = await q<Record<string, string>>(
        `select p.id, p.full_name, p.role, c.id as company_id, c.name as company_name,
                to_char(c.pause_window_start, 'HH24:MI') as ws, to_char(c.pause_window_end, 'HH24:MI') as we
           from profiles p join companies c on c.id = p.company_id where p.id = auth.uid()`,
      )
      if (!r) throw new Error('Perfil no encontrado')
      return {
        id: r.id, fullName: r.full_name, role: r.role as Me['role'],
        company: { id: r.company_id, name: r.company_name, pauseWindowStart: r.ws, pauseWindowEnd: r.we },
      }
    },

    async listTeams(): Promise<TeamSummary[]> {
      const rows = await q<Record<string, unknown>>(
        `select t.id, t.name, t.manager_id, m.full_name as manager_name,
                (select count(*) from team_members tm where tm.team_id = t.id)::int as member_count
           from teams t left join profiles m on m.id = t.manager_id order by t.name`,
      )
      return rows.map((r) => ({
        id: String(r.id), name: String(r.name),
        managerId: (r.manager_id as string) ?? null, managerName: (r.manager_name as string) ?? null,
        memberCount: Number(r.member_count),
      }))
    },

    async teamWellbeing(teamId: string, period: Period, offset: number) {
      const [r] = await q('select * from team_wellbeing($1, $2, $3)', [teamId, period, offset])
      return toWellbeing(r)
    },

    async companyWellbeing(period: Period, offset: number) {
      const [r] = await q('select * from company_wellbeing($1, $2)', [period, offset])
      return toWellbeing(r)
    },

    async getPreferences() {
      const [r] = await q('select * from preferences where user_id = auth.uid()')
      return r ? toPreferences(r) : null
    },

    async savePreferences(p) {
      const v = fromPreferences(userId!, p)
      await q(
        `insert into preferences (user_id, needs, pauses_per_day, can_stand, work_start, work_end, guide, onboarded_at, updated_at)
         values (auth.uid(), $1, $2, $3, $4::time, $5::time, $6, now(), now())
         on conflict (user_id) do update set needs = excluded.needs, pauses_per_day = excluded.pauses_per_day,
           can_stand = excluded.can_stand, work_start = excluded.work_start, work_end = excluded.work_end, guide = excluded.guide,
           onboarded_at = coalesce(preferences.onboarded_at, now()), updated_at = now()`,
        [v.needs, v.pauses_per_day, v.can_stand, v.work_start, v.work_end, v.guide],
      )
    },

    async listActivities() {
      const acts = await q('select * from activities')
      const steps = await q('select * from activity_steps')
      return acts.map((a) => toActivity(a, steps.filter((s) => s.activity_id === a.id))).sort(byModule)
    },

    async listMySessions(sinceDays) {
      const rows = await q(
        `select id, activity_id, started_at, completed_at from pause_sessions
          where user_id = auth.uid() and started_at >= now() - make_interval(days => $1) order by started_at`,
        [sinceDays],
      )
      return rows.map(toSession)
    },

    async startSession(activityId) {
      const [r] = await q<{ id: string }>(
        'insert into pause_sessions (user_id, activity_id) values (auth.uid(), $1) returning id',
        [activityId],
      )
      return r.id
    },

    async completeSession(sessionId) {
      await q('update pause_sessions set completed_at = now() where id = $1', [sessionId])
    },

    async updatePauseWindow(start, end) {
      const rows = await q(
        `update companies set pause_window_start = $1::time, pause_window_end = $2::time
          where id = (select company_id from profiles where id = auth.uid()) returning id`,
        [start, end],
      )
      if (rows.length === 0) throw new Error('No tienes permiso para cambiar la ventana horaria')
    },
  }
  return backend
}
