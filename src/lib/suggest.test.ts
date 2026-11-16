import { describe, expect, it } from 'vitest'
import { nextSlot, pauseSlots, previousDayActivityIds, suggestActivity } from './suggest'
import type { Activity, Need, PauseSession } from './types'

const act = (id: string, needs: Need[], requiresStanding = false): Activity => ({
  id, module: 'breathe', title: id, summary: '', durationMin: 5, requiresStanding, needs,
  reviewStatus: 'pendiente de revisión profesional', steps: [],
})
const ses = (activityId: string, iso: string): PauseSession => ({ id: iso + activityId, activityId, startedAt: iso, completedAt: iso })

const catalog = [
  act('cuello', ['cuello_espalda']),
  act('de-pie', ['cuello_espalda', 'energia'], true),
  act('respira', ['calma']),
  act('foco', ['concentracion']),
]
const now = new Date(2026, 10, 16, 10, 0) // lunes 16/11/2026 10:00

describe('suggestActivity', () => {
  it('prioriza las necesidades elegidas', () => {
    expect(suggestActivity(catalog, { needs: ['concentracion'], canStand: true }, [], now)?.id).toBe('foco')
  })

  it('nunca sugiere ejercicios de pie si no puede ponerse de pie', () => {
    for (let d = 1; d <= 28; d++) {
      const s = suggestActivity(catalog, { needs: ['energia'], canStand: false }, [], new Date(2026, 1, d, 10))
      expect(s?.requiresStanding).toBe(false)
    }
  })

  it('no repite la actividad del día anterior', () => {
    const sessions = [ses('foco', new Date(2026, 10, 15, 11).toISOString())]
    expect(suggestActivity(catalog, { needs: ['concentracion'], canStand: true }, sessions, now)?.id).not.toBe('foco')
  })

  it('un lunes, "día anterior" es el último día con pausas (el viernes)', () => {
    const viernes = [ses('foco', new Date(2026, 10, 13, 11).toISOString())]
    expect([...previousDayActivityIds(viernes, now)]).toEqual(['foco'])
    expect(suggestActivity(catalog, { needs: ['concentracion'], canStand: true }, viernes, now)?.id).not.toBe('foco')
  })

  it('"otra sugerencia" devuelve una actividad distinta', () => {
    const first = suggestActivity(catalog, { needs: ['calma'], canStand: true }, [], now)!
    const second = suggestActivity(catalog, { needs: ['calma'], canStand: true }, [], now, [first.id])!
    expect(second.id).not.toBe(first.id)
  })

  it('si todo está descartado, sigue sugiriendo algo permitido', () => {
    const s = suggestActivity(catalog, { needs: [], canStand: false }, [], now, ['cuello', 'respira', 'foco'])
    expect(s).not.toBeNull()
    expect(s!.requiresStanding).toBe(false)
  })

  it('sin actividades devuelve null', () => {
    expect(suggestActivity([], { needs: [], canStand: true }, [], now)).toBeNull()
  })
})

describe('pauseSlots / nextSlot', () => {
  it('reparte las pausas dentro del horario', () => {
    expect(pauseSlots({ pausesPerDay: 2, workStart: '09:00', workEnd: '18:00' }, { start: '09:00', end: '18:00' }))
      .toEqual(['12:00', '15:00'])
  })
  it('respeta la ventana de la empresa', () => {
    expect(pauseSlots({ pausesPerDay: 1, workStart: '08:00', workEnd: '20:00' }, { start: '10:00', end: '16:00' }))
      .toEqual(['13:00'])
  })
  it('redondea a 5 minutos', () => {
    const slots = pauseSlots({ pausesPerDay: 3, workStart: '09:30', workEnd: '18:00' }, { start: '09:00', end: '18:00' })
    expect(slots.every((s) => Number(s.slice(3)) % 5 === 0)).toBe(true)
  })
  it('si no se solapan, usa la ventana de la empresa', () => {
    expect(pauseSlots({ pausesPerDay: 1, workStart: '20:00', workEnd: '22:00' }, { start: '09:00', end: '17:00' }))
      .toEqual(['13:00'])
  })
  it('próxima pausa o null', () => {
    expect(nextSlot(['12:00', '15:00'], now)).toBe('12:00')
    expect(nextSlot(['12:00', '15:00'], new Date(2026, 10, 16, 16))).toBeNull()
  })
})
