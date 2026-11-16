import type { DataBackend } from '../types'

/**
 * Elige el backend:
 *  - VITE_DATA_BACKEND=demo → Postgres en el navegador con datos de ejemplo.
 *  - Si hay VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY → Supabase.
 *  - Si no hay configuración de Supabase → demo (y se indica en pantalla).
 */
export function resolveBackendKind(env: Record<string, string | undefined>): 'supabase' | 'demo' {
  if (env.VITE_DATA_BACKEND === 'demo') return 'demo'
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) return 'supabase'
  return 'demo'
}

export async function createBackend(): Promise<DataBackend> {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  if (resolveBackendKind(env) === 'supabase') {
    const { createSupabaseBackend } = await import('./supabase')
    return createSupabaseBackend(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!)
  }
  // Carga diferida: PGlite solo se descarga en modo demo.
  const { createDemoBackend } = await import('./demo')
  return createDemoBackend()
}
