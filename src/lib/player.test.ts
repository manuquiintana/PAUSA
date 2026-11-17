import { describe, expect, it } from 'vitest'
import { breathAt, fmtClock, locate, parseAnimation, ringCompleted, stepStartMs } from './player'

const steps = [
  { text: 'a', seconds: 10, animation: 'still' },
  { text: 'b', seconds: 20, animation: 'breath:4-6' },
  { text: 'c', seconds: 30, animation: 'move' },
]

describe('locate', () => {
  it('primer paso al empezar', () => expect(locate(steps, 0)).toMatchObject({ index: 0, totalMs: 60000, done: false }))
  it('cambia de paso al cumplirse el tiempo', () => expect(locate(steps, 10000)).toMatchObject({ index: 1, stepElapsedMs: 0 }))
  it('tiempo restante del paso y total', () =>
    expect(locate(steps, 35000)).toMatchObject({ index: 2, stepRemainingMs: 25000, totalRemainingMs: 25000 }))
  it('terminado al final', () => expect(locate(steps, 60000).done).toBe(true))
  it('anillo completado al pasar de paso con el tiempo', () => {
    expect(ringCompleted(steps, 9990, 10010)).toBe(true)
    expect(ringCompleted(steps, 5000, 5016)).toBe(false)
  })
  it('anillo completado también en el último paso', () => expect(ringCompleted(steps, 59990, 60005)).toBe(true))
  it('no cuenta los saltos manuales ni ir hacia atrás', () => {
    expect(ringCompleted(steps, 2000, 10000)).toBe(false)
    expect(ringCompleted(steps, 12000, 0)).toBe(false)
  })
  it('una vez terminada no vuelve a sonar', () => expect(ringCompleted(steps, 60000, 60016)).toBe(false))
  it('inicio de cada paso', () => expect([0, 1, 2].map((i) => stepStartMs(steps, i))).toEqual([0, 10000, 30000]))
})

describe('animaciones', () => {
  it('respiración de dos tiempos', () => {
    const a = parseAnimation('breath:4-6')
    expect(a.kind).toBe('breath')
    if (a.kind === 'breath') expect(a.phases.map((p) => p.label)).toEqual(['Inspira', 'Suelta el aire'])
  })
  it('respiración cuadrada', () => {
    const a = parseAnimation('breath:4-4-4-4')
    if (a.kind !== 'breath') throw new Error()
    expect(a.phases).toHaveLength(4)
    expect(breathAt(a.phases, 5000).label).toBe('Mantén')
    expect(breathAt(a.phases, 9000).label).toBe('Suelta el aire')
  })
  it('el círculo crece al inspirar y es cíclico', () => {
    const a = parseAnimation('breath:4-6')
    if (a.kind !== 'breath') throw new Error()
    expect(breathAt(a.phases, 0).scale).toBeCloseTo(0.55)
    expect(breathAt(a.phases, 4000).scale).toBeCloseTo(1)
    expect(breathAt(a.phases, 10000).scale).toBeCloseTo(0.55)
    expect(breathAt(a.phases, 2000).secondsLeft).toBe(2)
  })
  it('valores desconocidos → quieto', () => {
    expect(parseAnimation('xyz').kind).toBe('still')
    expect(parseAnimation('breath:0-3').kind).toBe('still')
    expect(parseAnimation('eyes').kind).toBe('eyes')
  })
  it('reloj', () => expect(fmtClock(65000)).toBe('1:05'))
})
