import { describe, expect, it } from 'vitest'
import { firstName, fmtScore, greeting, hhmm, isValidWindow, periodLabel, toWellbeing } from './format'

describe('toWellbeing', () => {
  it('convierte una fila suficiente', () => {
    const w = toWellbeing({
      period_start: new Date('2026-11-09T00:00:00Z'), period_end: '2026-11-15',
      sufficient: true, contributors: 7, avg_start: '6.9', avg_end: '5.9', checkins_count: 56, pauses_completed: 0,
    })
    expect(w).toMatchObject({ periodStart: '2026-11-09', periodEnd: '2026-11-15', contributors: 7, avgStart: 6.9, avgEnd: 5.9 })
  })

  it('nunca expone cifras si no se alcanza el umbral, aunque llegaran', () => {
    const w = toWellbeing({ period_start: '2026-11-09', period_end: '2026-11-15', sufficient: false, contributors: 3, avg_start: 4 })
    expect(w.sufficient).toBe(false)
    expect([w.contributors, w.avgStart, w.avgEnd, w.checkinsCount, w.pausesCompleted]).toEqual([null, null, null, null, null])
  })
})

describe('formato', () => {
  it('usa coma decimal', () => expect(fmtScore(6.9)).toBe('6,9'))
  it('guion si no hay dato', () => expect(fmtScore(null)).toBe('—'))
  it('etiqueta de mes en mayúscula', () =>
    expect(periodLabel({ periodStart: '2026-10-01', periodEnd: '2026-10-31' }, 'month')).toBe('Octubre de 2026'))
  it('etiqueta de semana', () =>
    expect(periodLabel({ periodStart: '2026-11-09', periodEnd: '2026-11-15' }, 'week')).toMatch(/9 nov.*15 nov/))
  it('saludo según la hora', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Buenos días')
    expect(greeting(new Date(2026, 0, 1, 16))).toBe('Buenas tardes')
  })
  it('nombre de pila', () => expect(firstName('Ana López')).toBe('Ana'))
  it('hora corta', () => expect(hhmm('09:30:00')).toBe('09:30'))
  it('ventana horaria válida', () => {
    expect(isValidWindow('09:00', '18:00')).toBe(true)
    expect(isValidWindow('18:00', '09:00')).toBe(false)
    expect(isValidWindow('9:00', '18:00')).toBe(false)
  })
})
