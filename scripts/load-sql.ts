import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { DemoSql } from '../src/lib/demo/setup'

const root = join(import.meta.dirname, '..', 'supabase')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

export function loadSqlFromDisk(): DemoSql {
  const migrations = readdirSync(join(root, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => read(join('migrations', f)))
  return {
    authStub: read('pglite/auth_stub.sql'),
    migrations,
    demoUsers: read('pglite/demo_users.sql'),
    demoData: readdirSync(join(root, 'seed'))
      .filter((f) => f.endsWith('.sql') && !f.startsWith('01_auth_users'))
      .sort()
      .map((f) => read(join('seed', f))),
  }
}
