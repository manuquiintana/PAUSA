/**
 * Avatar guía: posturas y movimientos.
 * Cada movimiento es una secuencia de posiciones clave que se repite en bucle, interpolada con
 * suavidad. Todo depende del tiempo del paso, así que el avatar se detiene al pausar.
 */

export type Guide = 'mujer' | 'hombre'

export interface Joints {
  /** Inclinación de la cabeza en grados (negativo = hacia el hombro derecho de la persona). */
  head: number
  /** Desplazamiento vertical de los hombros (negativo = hacia arriba). */
  shoulders: number
  /** Escala del pecho (respiración). */
  chest: number
  /** Brazos: ángulo del brazo desde la vertical (positivo = hacia fuera) y del antebrazo respecto al brazo. */
  leftUpper: number
  leftFore: number
  rightUpper: number
  rightFore: number
}

export const REST: Joints = {
  head: 0, shoulders: 0, chest: 1,
  leftUpper: 14, leftFore: -74, rightUpper: 14, rightFore: -74, // manos descansando en el regazo
}

interface Key { t: number; j: Partial<Joints> }

/** Movimientos disponibles. El primer y último fotograma coinciden para que el bucle sea continuo. */
const MOVES: Record<string, Key[]> = {
  // Inclinar la oreja derecha hacia el hombro derecho (la derecha de la persona = izquierda en pantalla)
  'cuello-derecha': [
    { t: 0, j: {} }, { t: 2500, j: { head: -22 } }, { t: 6500, j: { head: -22 } }, { t: 9000, j: {} }, { t: 10000, j: {} },
  ],
  'cuello-izquierda': [
    { t: 0, j: {} }, { t: 2500, j: { head: 22 } }, { t: 6500, j: { head: 22 } }, { t: 9000, j: {} }, { t: 10000, j: {} },
  ],
  // Subir los hombros hacia las orejas, mantener y soltar de golpe
  'hombros-subir': [
    { t: 0, j: {} }, { t: 1300, j: { shoulders: -10 } }, { t: 2500, j: { shoulders: -10 } }, { t: 2800, j: {} }, { t: 4200, j: {} },
  ],
  // Estirar los brazos hacia el techo
  'brazos-arriba': [
    { t: 0, j: {} },
    { t: 1400, j: { leftUpper: 95, leftFore: 20, rightUpper: 95, rightFore: 20 } },
    { t: 2800, j: { leftUpper: 165, leftFore: 6, rightUpper: 165, rightFore: 6, chest: 1.03 } },
    { t: 6800, j: { leftUpper: 165, leftFore: 6, rightUpper: 165, rightFore: 6, chest: 1.03 } },
    { t: 8200, j: { leftUpper: 95, leftFore: 20, rightUpper: 95, rightFore: 20 } },
    { t: 9600, j: {} }, { t: 10600, j: {} },
  ],
  // Sentado, tranquilo, respirando (el pecho sigue el ritmo)
  respirar: [{ t: 0, j: {} }, { t: 4000, j: { chest: 1.035 } }, { t: 10000, j: {} }],
}

export const AVATAR_POSES = Object.keys(MOVES)

export function isPose(p: string | null | undefined): p is string {
  return !!p && p in MOVES
}

const ease = (k: number) => 0.5 - Math.cos(Math.PI * k) / 2
const full = (j: Partial<Joints>): Joints => ({ ...REST, ...j })

/**
 * Posición del avatar para el movimiento `pose` en el instante `ms` del paso.
 * Si se indica `breath` (0 = círculo pequeño, 1 = grande), el pecho sigue la respiración guiada.
 */
export function poseAt(pose: string, ms: number, breath?: number): Joints {
  const keys = MOVES[pose] ?? MOVES.respirar
  const cycle = keys[keys.length - 1].t
  const t = ((ms % cycle) + cycle) % cycle
  let i = 0
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++
  const a = full(keys[i].j)
  const b = full(keys[i + 1].j)
  const span = keys[i + 1].t - keys[i].t
  const k = span > 0 ? ease(Math.min(1, (t - keys[i].t) / span)) : 1
  const out = {} as Joints
  for (const key of Object.keys(REST) as (keyof Joints)[]) out[key] = a[key] + (b[key] - a[key]) * k
  if (breath !== undefined && pose === 'respirar') out.chest = 1 + 0.045 * Math.max(0, Math.min(1, breath))
  return out
}

/** Punto final de un brazo de dos segmentos. side = -1 (izquierda en pantalla) o 1 (derecha). */
export function armPoints(shoulder: [number, number], upperDeg: number, foreDeg: number, side: -1 | 1, l1 = 31, l2 = 29) {
  const r = Math.PI / 180
  const elbow: [number, number] = [shoulder[0] + side * l1 * Math.sin(upperDeg * r), shoulder[1] + l1 * Math.cos(upperDeg * r)]
  const a = (upperDeg + foreDeg) * r
  const wrist: [number, number] = [elbow[0] + side * l2 * Math.sin(a), elbow[1] + l2 * Math.cos(a)]
  return { elbow, wrist }
}
