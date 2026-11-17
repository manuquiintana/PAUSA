import { describe, expect, it } from 'vitest'
import { armPoints, AVATAR_POSES, isPose, poseAt, REST } from './avatar'

describe('avatar', () => {
  it('cada movimiento empieza y acaba en reposo (bucle sin saltos)', () => {
    for (const p of AVATAR_POSES) {
      const start = poseAt(p, 0)
      expect(start.head).toBeCloseTo(REST.head)
      expect(start.leftUpper).toBeCloseTo(REST.leftUpper)
    }
  })
  it('inclinar el cuello hacia la derecha de la persona', () => expect(poseAt('cuello-derecha', 4000).head).toBeLessThan(-20))
  it('inclinar el cuello hacia la izquierda', () => expect(poseAt('cuello-izquierda', 4000).head).toBeGreaterThan(20))
  it('subir los hombros y soltarlos', () => {
    expect(poseAt('hombros-subir', 2000).shoulders).toBeCloseTo(-10)
    expect(poseAt('hombros-subir', 3500).shoulders).toBeCloseTo(0)
  })
  it('brazos arriba: las manos quedan por encima de los hombros', () => {
    const j = poseAt('brazos-arriba', 5000)
    const { wrist } = armPoints([70, 130], j.leftUpper, j.leftFore, -1)
    expect(wrist[1]).toBeLessThan(80)
  })
  it('en reposo las manos descansan en el regazo', () => {
    const { wrist } = armPoints([70, 130], REST.leftUpper, REST.leftFore, -1)
    expect(wrist[1]).toBeGreaterThan(165)
  })
  it('respirar sigue el círculo de respiración', () => {
    expect(poseAt('respirar', 0, 1).chest).toBeGreaterThan(poseAt('respirar', 0, 0).chest)
  })
  it('es cíclico', () => expect(poseAt('cuello-derecha', 14000)).toEqual(poseAt('cuello-derecha', 4000)))
  it('reconoce movimientos válidos', () => {
    expect(isPose('respirar')).toBe(true)
    expect(isPose('volar')).toBe(false)
    expect(isPose(null)).toBe(false)
  })
})
