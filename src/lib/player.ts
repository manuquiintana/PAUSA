import type { ActivityStep } from './types'

export interface PlayerPosition {
  index: number
  stepElapsedMs: number
  stepRemainingMs: number
  totalMs: number
  totalRemainingMs: number
  done: boolean
}

/** Dado el tiempo transcurrido de la actividad, en qué paso estamos. */
export function locate(steps: ActivityStep[], elapsedMs: number): PlayerPosition {
  const totalMs = steps.reduce((t, s) => t + s.seconds * 1000, 0)
  const e = Math.max(0, elapsedMs)
  if (e >= totalMs || steps.length === 0) {
    return { index: Math.max(0, steps.length - 1), stepElapsedMs: 0, stepRemainingMs: 0, totalMs, totalRemainingMs: 0, done: true }
  }
  let acc = 0
  for (let i = 0; i < steps.length; i++) {
    const len = steps[i].seconds * 1000
    if (e < acc + len) {
      return { index: i, stepElapsedMs: e - acc, stepRemainingMs: acc + len - e, totalMs, totalRemainingMs: totalMs - e, done: false }
    }
    acc += len
  }
  /* c8 ignore next */
  return { index: steps.length - 1, stepElapsedMs: 0, stepRemainingMs: 0, totalMs, totalRemainingMs: 0, done: true }
}

/**
 * ¿Se ha completado el anillo de un paso entre dos instantes del reloj?
 * Solo cuenta el avance natural del tiempo (como mucho 1 s entre ticks), no los saltos manuales.
 */
export function ringCompleted(steps: ActivityStep[], prevMs: number, nextMs: number): boolean {
  if (nextMs <= prevMs || nextMs - prevMs > 1000) return false
  const a = locate(steps, prevMs)
  const b = locate(steps, nextMs)
  if (a.done) return false
  return b.done || b.index > a.index
}

/** Tiempo transcurrido al inicio del paso `index` (para saltar de paso). */
export function stepStartMs(steps: ActivityStep[], index: number): number {
  return steps.slice(0, Math.max(0, index)).reduce((t, s) => t + s.seconds * 1000, 0)
}

export interface BreathPhase {
  label: string
  seconds: number
  from: number // escala del círculo al empezar
  to: number // escala al terminar
}

const SMALL = 0.55
const BIG = 1

export type Animation =
  | { kind: 'breath'; phases: BreathPhase[] }
  | { kind: 'still' | 'move' | 'pulse' | 'eyes' }

/** "breath:4-6" → inspirar 4 s, soltar 6 s. "breath:4-4-4-4" → con pausas. */
export function parseAnimation(code: string): Animation {
  const [kind, pattern] = code.split(':')
  if (kind === 'breath' && pattern) {
    const n = pattern.split('-').map(Number)
    if (n.length === 2 && n.every((x) => x > 0)) {
      return { kind: 'breath', phases: [
        { label: 'Inspira', seconds: n[0], from: SMALL, to: BIG },
        { label: 'Suelta el aire', seconds: n[1], from: BIG, to: SMALL },
      ] }
    }
    if (n.length === 4 && n.every((x) => x > 0)) {
      return { kind: 'breath', phases: [
        { label: 'Inspira', seconds: n[0], from: SMALL, to: BIG },
        { label: 'Mantén', seconds: n[1], from: BIG, to: BIG },
        { label: 'Suelta el aire', seconds: n[2], from: BIG, to: SMALL },
        { label: 'Mantén', seconds: n[3], from: SMALL, to: SMALL },
      ] }
    }
  }
  if (kind === 'move' || kind === 'pulse' || kind === 'eyes') return { kind }
  return { kind: 'still' }
}

/** Fase de respiración y escala del círculo en el instante `ms` (en bucle). */
export function breathAt(phases: BreathPhase[], ms: number): { label: string; scale: number; secondsLeft: number } {
  const cycle = phases.reduce((t, p) => t + p.seconds * 1000, 0)
  let t = ((ms % cycle) + cycle) % cycle
  for (const p of phases) {
    const len = p.seconds * 1000
    if (t < len) {
      const k = t / len
      const eased = 0.5 - Math.cos(Math.PI * k) / 2 // suave al empezar y al terminar
      return { label: p.label, scale: p.from + (p.to - p.from) * eased, secondsLeft: Math.ceil((len - t) / 1000) }
    }
    t -= len
  }
  /* c8 ignore next */
  return { label: phases[0].label, scale: phases[0].from, secondsLeft: phases[0].seconds }
}

export function fmtClock(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
