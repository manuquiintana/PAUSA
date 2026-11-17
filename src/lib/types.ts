export type Role = 'employee' | 'manager' | 'admin'
export type Period = 'week' | 'month'

export interface Company {
  id: string
  name: string
  pauseWindowStart: string // "HH:MM"
  pauseWindowEnd: string
}

export interface Me {
  id: string
  fullName: string
  role: Role
  company: Company
}

export interface TeamSummary {
  id: string
  name: string
  managerId: string | null
  managerName: string | null
  memberCount: number
}

/** Indicadores agregados. Si `sufficient` es false, todas las cifras vienen a null. */
export interface Wellbeing {
  periodStart: string // YYYY-MM-DD
  periodEnd: string
  sufficient: boolean
  contributors: number | null
  avgStart: number | null
  avgEnd: number | null
  checkinsCount: number | null
  pausesCompleted: number | null
}

import type { Guide } from './avatar'

export type Need = 'cuello_espalda' | 'desconectar' | 'concentracion' | 'energia' | 'calma'
export type ModuleId = 'stretch' | 'breathe' | 'mindfulness' | 'positive' | 'reset'

/** Preferencias del onboarding. Privadas: solo las lee su propietario (RLS). */
export interface Preferences {
  needs: Need[]
  pausesPerDay: 1 | 2 | 3
  canStand: boolean
  workStart: string // "HH:MM"
  workEnd: string
  /** Avatar guía en el reproductor */
  guide: Guide
  onboardedAt: string | null
}

export interface ActivityStep {
  text: string
  seconds: number
  /** still · move · pulse · eyes · breath:4-6 · breath:4-4-4-4 */
  animation: string
  /** Movimiento del avatar guía (null = animación abstracta) */
  pose?: string | null
}

export interface Activity {
  id: string
  module: ModuleId
  title: string
  summary: string
  durationMin: number
  requiresStanding: boolean
  needs: Need[]
  reviewStatus: string
  steps: ActivityStep[]
}

export interface PauseSession {
  id: string
  activityId: string
  startedAt: string // ISO
  completedAt: string | null
}

export interface DemoPersona {
  userId: string
  email: string
  name: string
  description: string
  role: Role
}

export interface DataBackend {
  kind: 'supabase' | 'demo'
  /** Devuelve el id del usuario con sesión iniciada, o null. */
  currentUserId(): Promise<string | null>
  signInWithPassword(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  getMe(): Promise<Me>
  listTeams(): Promise<TeamSummary[]>
  teamWellbeing(teamId: string, period: Period, offset: number): Promise<Wellbeing>
  companyWellbeing(period: Period, offset: number): Promise<Wellbeing>
  updatePauseWindow(start: string, end: string): Promise<void>
  getPreferences(): Promise<Preferences | null>
  savePreferences(p: Omit<Preferences, 'onboardedAt'>): Promise<void>
  listActivities(): Promise<Activity[]>
  /** Pausas propias desde `sinceDays` días atrás. */
  listMySessions(sinceDays: number): Promise<PauseSession[]>
  startSession(activityId: string): Promise<string>
  completeSession(sessionId: string): Promise<void>
  /** Solo en modo demo: entrar directamente como un usuario de ejemplo. */
  demoPersonas?: DemoPersona[]
  signInAsDemo?(userId: string): Promise<void>
}
