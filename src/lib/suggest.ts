import type { Activity, PauseSession, Preferences } from './types'

/** Fecha local YYYY-MM-DD. */
export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Hash pequeño y estable para desempatar de forma variada pero reproducible. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Actividades hechas el "día anterior": el último día antes de hoy en que la persona hizo pausas
 * (así un lunes no repite la del viernes).
 */
export function previousDayActivityIds(sessions: PauseSession[], now: Date): Set<string> {
  const today = localDay(now)
  const days = sessions.map((s) => localDay(new Date(s.startedAt))).filter((d) => d < today).sort()
  const last = days[days.length - 1]
  if (!last) return new Set()
  return new Set(sessions.filter((s) => localDay(new Date(s.startedAt)) === last).map((s) => s.activityId))
}

/**
 * Sugiere una pausa según las preferencias:
 *  - nunca propone ejercicios de pie si la persona no puede ponerse de pie;
 *  - no repite la actividad del día anterior;
 *  - prioriza las necesidades elegidas en el onboarding y evita repetir la de hoy;
 *  - `skip` permite pedir "otra sugerencia".
 */
export function suggestActivity(
  activities: Activity[],
  prefs: Pick<Preferences, 'needs' | 'canStand'>,
  sessions: PauseSession[],
  now: Date = new Date(),
  skip: string[] = [],
): Activity | null {
  const allowed = activities.filter((a) => prefs.canStand || !a.requiresStanding)
  if (allowed.length === 0) return null

  const yesterday = previousDayActivityIds(sessions, now)
  const today = localDay(now)
  const doneToday = new Set(sessions.filter((s) => localDay(new Date(s.startedAt)) === today).map((s) => s.activityId))
  const skipSet = new Set(skip)

  let pool = allowed.filter((a) => !yesterday.has(a.id) && !skipSet.has(a.id))
  if (pool.length === 0) pool = allowed.filter((a) => !yesterday.has(a.id))
  if (pool.length === 0) pool = allowed

  const score = (a: Activity) =>
    a.needs.filter((n) => prefs.needs.includes(n)).length * 10 - (doneToday.has(a.id) ? 5 : 0)

  return [...pool].sort((a, b) => score(b) - score(a) || hash(today + a.id) - hash(today + b.id))[0]
}

const toMin = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * Horas de pausa del día: repartidas de forma uniforme dentro del horario de la persona,
 * limitado a la ventana que define la empresa. Redondeadas a 5 minutos.
 */
export function pauseSlots(
  prefs: Pick<Preferences, 'pausesPerDay' | 'workStart' | 'workEnd'>,
  companyWindow: { start: string; end: string },
): string[] {
  let start = Math.max(toMin(prefs.workStart), toMin(companyWindow.start))
  let end = Math.min(toMin(prefs.workEnd), toMin(companyWindow.end))
  if (end <= start) {
    start = toMin(companyWindow.start)
    end = toMin(companyWindow.end)
  }
  const n = prefs.pausesPerDay
  const step = (end - start) / (n + 1)
  return Array.from({ length: n }, (_, i) => toHHMM(Math.round((start + step * (i + 1)) / 5) * 5))
}

/** Próxima hora de pausa a partir de `now`, o null si ya no quedan hoy. */
export function nextSlot(slots: string[], now: Date): string | null {
  const current = now.getHours() * 60 + now.getMinutes()
  return slots.find((s) => toMin(s) > current) ?? null
}
