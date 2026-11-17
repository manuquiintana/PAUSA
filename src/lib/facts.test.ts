import { describe, expect, it } from 'vitest'
import { factFor, FACTS } from './facts'

describe('datos curiosos', () => {
  it('todos citan una fuente', () => {
    for (const f of Object.values(FACTS)) {
      expect(f.text.length).toBeGreaterThan(40)
      expect(f.source.length).toBeGreaterThan(5)
      if (f.url) expect(f.url).toMatch(/^https:\/\/doi\.org\//)
    }
  })
  it('cada actividad tiene su dato y se alternan', () => {
    expect(factFor('pos-gratitud', 0).id).toBe('gratitud')
    expect(factFor('pos-gratitud', 1).id).toBe('ayudar')
    expect(factFor('reset-20-20-20').id).toBe('vista')
  })
  it('una actividad desconocida recibe un dato general', () => expect(factFor('nueva').id).toBe('micropausas'))
})
