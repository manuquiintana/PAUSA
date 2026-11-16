import type { Activity, PauseSession, Preferences } from './types'

type Row = Record<string, unknown>
const iso = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : String(v))

export function toPreferences(r: Row): Preferences {
  return {
    needs: (r.needs as Preferences['needs']) ?? [],
    pausesPerDay: Number(r.pauses_per_day) as Preferences['pausesPerDay'],
    canStand: Boolean(r.can_stand),
    workStart: String(r.work_start).slice(0, 5),
    workEnd: String(r.work_end).slice(0, 5),
    onboardedAt: iso(r.onboarded_at),
  }
}

export function fromPreferences(userId: string, p: Omit<Preferences, 'onboardedAt'>) {
  return {
    user_id: userId,
    needs: p.needs,
    pauses_per_day: p.pausesPerDay,
    can_stand: p.canStand,
    work_start: p.workStart,
    work_end: p.workEnd,
  }
}

export function toActivity(r: Row, steps: Row[]): Activity {
  return {
    id: String(r.id),
    module: r.module as Activity['module'],
    title: String(r.title),
    summary: String(r.summary ?? ''),
    durationMin: Number(r.duration_min),
    requiresStanding: Boolean(r.requires_standing),
    needs: (r.needs as Activity['needs']) ?? [],
    reviewStatus: String(r.review_status),
    steps: [...steps]
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((s) => ({ text: String(s.text), seconds: Number(s.seconds), animation: String(s.animation) })),
  }
}

export function toSession(r: Row): PauseSession {
  return { id: String(r.id), activityId: String(r.activity_id), startedAt: iso(r.started_at)!, completedAt: iso(r.completed_at) }
}

const MODULE_ORDER = ['stretch', 'breathe', 'mindfulness', 'positive', 'reset']
export const byModule = (a: Activity, b: Activity) =>
  MODULE_ORDER.indexOf(a.module) - MODULE_ORDER.indexOf(b.module) || a.title.localeCompare(b.title, 'es')
