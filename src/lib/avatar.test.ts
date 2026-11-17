import { describe, expect, it } from 'vitest'
import { AVATAR_POSES, isPose, isStanding, poseAt, REST, solveArm } from './avatar'

const still = (pose: string, ms: number, breath?: number) => poseAt(pose, ms, breath, false)

describe('avatar · movimientos', () => {
  it('hay movimientos para sentado y de pie', () => {
    expect(AVATAR_POSES.length).toBeGreaterThanOrEqual(30)
    expect(AVATAR_POSES.filter(isStanding).length).toBeGreaterThanOrEqual(10)
  })

  it('ningún movimiento se queda quieto: todos cambian a lo largo del paso', () => {
    for (const p of AVATAR_POSES) {
      const frames = Array.from({ length: 40 }, (_, i) => JSON.stringify(still(p, i * 450)))
      expect(new Set(frames).size, p).toBeGreaterThan(3)
    }
  })

  it('con "vida" activada se mueve incluso en reposo', () => {
    expect(poseAt('respirar', 1000)).not.toEqual(poseAt('respirar', 2500))
  })

  it('los bucles son continuos (sin saltos al repetirse)', () => {
    for (const p of AVATAR_POSES) {
      const a = still(p, 60000)
      const b = still(p, 60016)
      expect(Math.abs(a.lx - b.lx) + Math.abs(a.ly - b.ly) + Math.abs(a.head - b.head), p).toBeLessThan(6)
    }
  })

  it('inclinar el cuello hacia cada lado', () => {
    expect(still('cuello-derecha', 4000).head).toBeLessThan(-20)
    expect(still('cuello-izquierda', 4000).head).toBeGreaterThan(20)
  })

  it('brazos arriba: las manos quedan por encima de la cabeza', () => {
    const j = still('brazos-arriba', 4000)
    expect(j.ly).toBeLessThan(75)
    expect(j.ry).toBeLessThan(75)
  })

  it('caminar en el sitio alterna las rodillas', () => {
    const a = still('de-pie-caminar', 600 + 600)
    const b = still('de-pie-caminar', 600 + 1800)
    expect(a.lKnee).toBeGreaterThan(0.9)
    expect(b.rKnee).toBeGreaterThan(0.9)
  })

  it('mirar a lo lejos abre los ojos; respirar los mantiene cerrados', () => {
    expect(still('mirar-lejos', 3000).eyes).toBe(1)
    expect(still('respirar', 3000).eyes).toBe(0)
  })

  it('respirar sigue el círculo de respiración', () => {
    expect(still('respirar', 0, 1).chest).toBeGreaterThan(still('respirar', 0, 0).chest)
  })

  it('reconoce movimientos válidos', () => {
    expect(isPose('respirar')).toBe(true)
    expect(isPose('volar')).toBe(false)
    expect(isPose(null)).toBe(false)
  })
})

describe('avatar · brazos (cinemática inversa)', () => {
  it('la mano llega al objetivo si está a su alcance', () => {
    const { wrist } = solveArm([70, 130], [88, 178])
    expect(wrist[0]).toBeCloseTo(88, 0)
    expect(wrist[1]).toBeCloseTo(178, 0)
  })
  it('si el objetivo está lejos, el brazo se estira hacia él', () => {
    const { wrist } = solveArm([70, 130], [0, 130])
    expect(wrist[0]).toBeCloseTo(8, 0)
  })
  it('el codo se dobla hacia fuera del cuerpo', () => {
    const { elbow } = solveArm([70, 130], [REST.lx, REST.ly])
    expect(elbow[0]).toBeLessThan(70)
  })
})
