import { describe, expect, it } from 'vitest'
import { resolveBackendKind } from './index'

describe('resolveBackendKind', () => {
  it('modo demo explícito', () =>
    expect(resolveBackendKind({ VITE_DATA_BACKEND: 'demo', VITE_SUPABASE_URL: 'x', VITE_SUPABASE_ANON_KEY: 'y' })).toBe('demo'))
  it('Supabase si está configurado', () =>
    expect(resolveBackendKind({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })).toBe('supabase'))
  it('demo si falta configuración', () => expect(resolveBackendKind({ VITE_SUPABASE_URL: 'x' })).toBe('demo'))
})
