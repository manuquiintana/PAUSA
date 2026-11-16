import { createContext, useContext } from 'react'
import type { Activity, DataBackend, Me, Preferences } from './types'

export interface AppState {
  backend: DataBackend
  me: Me
  prefs: Preferences | null
  reloadMe: () => Promise<void>
  reloadPrefs: () => Promise<void>
  /** Catálogo de actividades (se carga una vez y se reutiliza). */
  getActivities: () => Promise<Activity[]>
  signOut: () => Promise<void>
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fuera de AppContext')
  return ctx
}
