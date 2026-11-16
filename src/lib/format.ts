import type { Period, Role, Wellbeing } from './types'

export const ROLE_LABEL: Record<Role, string> = {
  employee: 'Empleado/a',
  manager: 'Manager',
  admin: 'Admin · RR. HH.',
}

/** Convierte una fila de las funciones SQL de agregados al tipo de la app. */
export function toWellbeing(row: Record<string, unknown>): Wellbeing {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  const date = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))
  const sufficient = row.sufficient === true
  return {
    periodStart: date(row.period_start),
    periodEnd: date(row.period_end),
    sufficient,
    // Defensa extra en el cliente: sin umbral, no mostramos ninguna cifra aunque llegara.
    contributors: sufficient ? num(row.contributors) : null,
    avgStart: sufficient ? num(row.avg_start) : null,
    avgEnd: sufficient ? num(row.avg_end) : null,
    checkinsCount: sufficient ? num(row.checkins_count) : null,
    pausesCompleted: sufficient ? num(row.pauses_completed) : null,
  }
}

const fmtDay = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function periodLabel(w: Pick<Wellbeing, 'periodStart' | 'periodEnd'>, period: Period): string {
  const s = new Date(w.periodStart + 'T00:00:00Z')
  const e = new Date(w.periodEnd + 'T00:00:00Z')
  if (period === 'month') {
    const m = fmtMonth.format(s)
    return m.charAt(0).toUpperCase() + m.slice(1)
  }
  return `${fmtDay.format(s)} – ${fmtDay.format(e)}`
}

/** Número con coma decimal (es-ES). */
export function fmtScore(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 14) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** "09:30:00" → "09:30" */
export function hhmm(t: string): string {
  return t.slice(0, 5)
}

export function isValidWindow(start: string, end: string): boolean {
  return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end
}

export const PERIOD_OPTIONS: { label: string; period: Period; offset: number }[] = [
  { label: 'Semana pasada', period: 'week', offset: 1 },
  { label: 'Esta semana', period: 'week', offset: 0 },
  { label: 'Mes pasado', period: 'month', offset: 1 },
  { label: 'Este mes', period: 'month', offset: 0 },
]
