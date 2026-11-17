import type { Preferences } from './types'

export type PrefsDraft = Omit<Preferences, 'onboardedAt'>

export const DEFAULT_PREFS: PrefsDraft = { needs: [], pausesPerDay: 2, canStand: true, workStart: '09:00', workEnd: '18:00', guide: 'mujer' }
