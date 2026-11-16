import { createContext, useContext } from 'react'
import type { DataBackend, Me } from './types'

export interface AppState {
  backend: DataBackend
  me: Me
  reloadMe: () => Promise<void>
  signOut: () => Promise<void>
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fuera de AppContext')
  return ctx
}
