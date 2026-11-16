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
  /** Solo en modo demo: entrar directamente como un usuario de ejemplo. */
  demoPersonas?: DemoPersona[]
  signInAsDemo?(userId: string): Promise<void>
}
