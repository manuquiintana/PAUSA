import { PGlite, type Transaction } from '@electric-sql/pglite'

/** SQL que monta la base demo, en orden. Las migraciones son exactamente las de Supabase. */
export interface DemoSql {
  authStub: string
  migrations: string[]
  demoUsers: string
  demoData: string
}

export async function createDemoDb(sql: DemoSql, fsBundle?: Blob): Promise<PGlite> {
  const pg = await PGlite.create(fsBundle ? { fsBundle } : {})
  await pg.exec(sql.authStub)
  for (const m of sql.migrations) await pg.exec(m)
  await pg.exec(sql.demoUsers)
  await pg.exec(sql.demoData)
  return pg
}

/**
 * Ejecuta `fn` como un usuario autenticado, igual que hace Supabase con cada petición:
 * rol `authenticated` (sujeto a RLS) y `auth.uid()` = userId.
 */
export async function asUser<T>(pg: PGlite, userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return pg.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`)
    return fn(tx)
  })
}
