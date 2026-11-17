/**
 * Avatar guía: motor de movimiento.
 *
 * Cada movimiento tiene una entrada (`intro`, desde la postura de reposo hasta la postura del
 * ejercicio) y un bucle (`loop`) que se repite mientras dura el paso. Las manos se definen por la
 * posición a la que tienen que llegar y los codos se calculan solos (cinemática inversa), así los
 * movimientos son naturales. Encima de todo hay una "vida" continua: respiración, un leve balanceo
 * y parpadeo cuando tiene los ojos abiertos. Todo depende del tiempo del paso: se detiene al pausar.
 *
 * Coordenadas: lienzo de 200 de ancho; hombros a y=130, regazo a y≈178, pies (de pie) a y≈300.
 * "l" es el brazo/pierna que se ve a la izquierda de la pantalla (el lado derecho de la persona).
 */

export type Guide = 'mujer' | 'hombre'

export interface Joints {
  head: number // inclinación lateral (grados; negativo = hacia su hombro derecho)
  nod: number // 1 = mira abajo, -1 = mira arriba
  turn: number // -1..1 gira la cabeza hacia su derecha / izquierda
  eyes: number // 0 cerrados, 1 abiertos
  lookX: number
  lookY: number
  shoulders: number // negativo = suben
  chest: number // escala del pecho (respiración)
  shiftX: number // desplazamiento lateral del tronco
  tilt: number // inclinación del tronco (grados)
  lx: number; ly: number; rx: number; ry: number // posición de las manos
  open: number // manos abiertas (dedos)
  cup: number // taza en la mano
  // De pie
  bodyY: number // negativo = sube (puntillas), positivo = baja
  hipX: number
  lKnee: number; rKnee: number // levantar rodilla (0..1)
  lBack: number; rBack: number // pie hacia atrás (cuádriceps)
  bend: number // flexionar rodillas
  stance: number // abrir piernas (zancada)
  toes: number // de puntillas
}

export const REST: Joints = {
  head: 0, nod: 0, turn: 0, eyes: 0, lookX: 0, lookY: 0, shoulders: 0, chest: 1, shiftX: 0, tilt: 0,
  lx: 88, ly: 178, rx: 112, ry: 178, open: 0, cup: 0,
  bodyY: 0, hipX: 0, lKnee: 0, rKnee: 0, lBack: 0, rBack: 0, bend: 0, stance: 0, toes: 0,
}

type P = Partial<Joints>
type K = [number, P]
interface Move { intro?: K[]; loop: K[]; extra?: (t: number, j: Joints) => void }

// Posturas de manos frecuentes
const ST: P = { lx: 64, ly: 192, rx: 136, ry: 192 } // de pie, brazos caídos
const UP: P = { lx: 62, ly: 68, rx: 138, ry: 68 } // brazos hacia el techo
const UP_HI: P = { lx: 64, ly: 60, rx: 136, ry: 60, chest: 1.05 }
const FRONT: P = { lx: 84, ly: 146, rx: 116, ry: 146 } // manos delante del pecho
const CROSS: P = { lx: 14, ly: 130, rx: 186, ry: 130 } // brazos en cruz
const HIPS: P = { lx: 74, ly: 178, rx: 126, ry: 178 } // manos en la cintura
const NAPE: P = { lx: 86, ly: 70, rx: 114, ry: 70 } // manos detrás de la cabeza
const HEART: P = { lx: 95, ly: 150, rx: 107, ry: 154 }
const EYES: P = { lx: 91, ly: 80, rx: 109, ry: 80 }
const m = (...ps: P[]): P => Object.assign({}, ...ps)

const MOVES: Record<string, Move> = {
  // ───── Sentado: respiración y calma ─────
  respirar: { loop: [[0, {}], [4000, { chest: 1.06, shoulders: -3 }], [10000, {}]] },
  'mano-corazon': { intro: [[0, {}], [2000, HEART]], loop: [[0, HEART], [4000, m(HEART, { chest: 1.06 })], [9000, HEART]] },
  'manos-nuca': { intro: [[0, {}], [2200, NAPE]], loop: [[0, NAPE], [3000, m(NAPE, { chest: 1.08, nod: -0.3 })], [6000, NAPE]] },

  // ───── Cuello ─────
  'cuello-derecha': { loop: [[0, {}], [2500, { head: -24 }], [6500, { head: -24 }], [9000, {}], [10000, {}]] },
  'cuello-izquierda': { loop: [[0, {}], [2500, { head: 24 }], [6500, { head: 24 }], [9000, {}], [10000, {}]] },
  'cuello-abajo': { loop: [[0, {}], [2500, { nod: 1 }], [6500, { nod: 1 }], [9000, {}], [10000, {}]] },
  'cuello-girar': {
    loop: [[0, {}], [2000, { turn: -1 }], [5000, { turn: -1 }], [7000, {}], [9000, { turn: 1 }], [12000, { turn: 1 }], [14000, {}]],
  },

  // ───── Hombros y brazos ─────
  'hombros-subir': { loop: [[0, {}], [1300, { shoulders: -13 }], [2500, { shoulders: -13 }], [2800, {}], [4200, {}]] },
  'hombros-circulos': {
    loop: [[0, {}], [900, { shoulders: -11 }], [1800, { shoulders: -5, chest: 1.06 }], [2700, { shoulders: 4 }], [3600, {}]],
  },
  'brazos-arriba': { intro: [[0, {}], [2500, UP]], loop: [[0, UP], [2500, UP_HI], [5000, UP]] },
  'brazo-cruzado': {
    intro: [[0, {}], [2000, { lx: 134, ly: 136, rx: 104, ry: 142 }]],
    loop: [
      [0, { lx: 134, ly: 136, rx: 104, ry: 142 }], [12000, { lx: 134, ly: 136, rx: 104, ry: 142 }], [14000, {}],
      [16000, { rx: 66, ry: 136, lx: 96, ly: 142 }], [28000, { rx: 66, ry: 136, lx: 96, ly: 142 }], [30000, {}],
      [32000, { lx: 134, ly: 136, rx: 104, ry: 142 }],
    ],
  },

  // ───── Espalda ─────
  'espalda-arquear': {
    loop: [[0, {}], [2500, { chest: 1.08, shoulders: -5, nod: -0.5 }], [3500, { chest: 1.08, shoulders: -5, nod: -0.5 }],
      [6000, { chest: 0.94, shoulders: 6, nod: 1 }], [7000, { chest: 0.94, shoulders: 6, nod: 1 }], [9000, {}]],
  },
  'tronco-giro-derecha': {
    intro: [[0, {}], [2500, { shiftX: -7, tilt: -4, turn: -1, lx: 56, ly: 162, rx: 82, ry: 160 }]],
    loop: [[0, { shiftX: -7, tilt: -4, turn: -1, lx: 56, ly: 162, rx: 82, ry: 160 }],
      [4000, { shiftX: -9, tilt: -6, turn: -1, lx: 54, ly: 162, rx: 80, ry: 160, chest: 1.05 }],
      [8000, { shiftX: -7, tilt: -4, turn: -1, lx: 56, ly: 162, rx: 82, ry: 160 }]],
  },
  'tronco-giro-izquierda': {
    intro: [[0, {}], [2500, { shiftX: 7, tilt: 4, turn: 1, rx: 144, ry: 162, lx: 118, ly: 160 }]],
    loop: [[0, { shiftX: 7, tilt: 4, turn: 1, rx: 144, ry: 162, lx: 118, ly: 160 }],
      [4000, { shiftX: 9, tilt: 6, turn: 1, rx: 146, ry: 162, lx: 120, ly: 160, chest: 1.05 }],
      [8000, { shiftX: 7, tilt: 4, turn: 1, rx: 144, ry: 162, lx: 118, ly: 160 }]],
  },
  'inclinar-delante': {
    loop: [[0, {}], [3000, { shoulders: 16, nod: 1, chest: 0.94, lx: 80, ly: 202, rx: 120, ry: 202 }],
      [6500, { shoulders: 16, nod: 1, chest: 0.94, lx: 80, ly: 202, rx: 120, ry: 202 }], [9500, {}], [10500, {}]],
  },

  // ───── Manos y muñecas ─────
  'manos-abrir': { intro: [[0, {}], [1500, FRONT]], loop: [[0, FRONT], [600, m(FRONT, { open: 1 })], [1200, FRONT]] },
  munecas: {
    intro: [[0, {}], [1500, FRONT]], loop: [[0, FRONT], [1500, FRONT]],
    extra: (t, j) => {
      const a = (t / 1500) * Math.PI * 2
      j.lx += 5 * Math.cos(a); j.ly += 5 * Math.sin(a); j.rx -= 5 * Math.cos(a); j.ry += 5 * Math.sin(a)
    },
  },
  'muneca-estirar': {
    intro: [[0, {}], [2000, { lx: 14, ly: 128, open: 1 }]],
    loop: [[0, { lx: 14, ly: 128, open: 1 }], [13000, { lx: 14, ly: 128, open: 1 }], [15000, {}],
      [17000, { rx: 186, ry: 128, open: 1 }], [28000, { rx: 186, ry: 128, open: 1 }], [30000, {}], [32000, { lx: 14, ly: 128, open: 1 }]],
  },
  'manos-sacudir': {
    intro: [[0, {}], [1200, { lx: 78, ly: 166, rx: 122, ry: 166, open: 1 }]],
    loop: [[0, { lx: 78, ly: 166, rx: 122, ry: 166, open: 1 }], [1000, { lx: 78, ly: 166, rx: 122, ry: 166, open: 1 }]],
    extra: (t, j) => {
      const s = Math.sin(t / 45) * 3.5
      j.lx += s; j.ly += Math.cos(t / 38) * 2.5; j.rx -= s; j.ry += Math.sin(t / 41) * 2.5
    },
  },

  // ───── Sentidos y mirada (ojos abiertos) ─────
  'mirar-alrededor': {
    intro: [[0, {}], [800, { eyes: 1 }]],
    loop: [[0, { eyes: 1 }], [2500, { eyes: 1, turn: -1, lookX: -1 }], [5000, { eyes: 1, turn: -1, lookX: -1 }],
      [7500, { eyes: 1, turn: 1, lookX: 1 }], [10000, { eyes: 1, turn: 1, lookX: 1 }], [12500, { eyes: 1 }]],
  },
  'manos-tocar': {
    loop: [[0, {}], [1300, { lx: 76, ly: 181, rx: 124, ry: 181 }], [2600, {}]],
  },
  escuchar: {
    intro: [[0, {}], [2000, { lx: 72, ly: 86, head: -8, open: 1 }]],
    loop: [[0, { lx: 72, ly: 86, head: -8, open: 1 }], [4000, { lx: 72, ly: 86, head: -10, open: 1 }], [8000, { lx: 72, ly: 86, head: -8, open: 1 }]],
  },
  'mirar-lejos': {
    intro: [[0, {}], [1200, { eyes: 1, nod: -0.4, lookY: -1, lookX: 0.6, turn: 0.4 }]],
    loop: [[0, { eyes: 1, nod: -0.4, lookY: -1, lookX: 0.6, turn: 0.4 }], [5000, { eyes: 1, nod: -0.5, lookY: -1, lookX: 0.8, turn: 0.5 }],
      [10000, { eyes: 1, nod: -0.4, lookY: -1, lookX: 0.6, turn: 0.4 }]],
  },
  parpadear: { loop: [[0, { eyes: 1 }], [250, {}], [500, { eyes: 1 }], [1400, { eyes: 1 }]] },
  'palmas-ojos': { intro: [[0, {}], [2000, EYES]], loop: [[0, EYES], [4000, m(EYES, { chest: 1.05 })], [10000, EYES]] },
  'ojos-mover': {
    intro: [[0, {}], [600, { eyes: 1 }]],
    loop: [[0, { eyes: 1, lookY: -1 }], [1500, { eyes: 1, lookY: 1 }], [3000, { eyes: 1, lookX: -1 }],
      [4500, { eyes: 1, lookX: 1 }], [6000, { eyes: 1, lookY: -1 }]],
  },
  'mano-cerca': {
    intro: [[0, {}], [1500, { eyes: 1, lx: 84, ly: 112, lookX: -0.5, lookY: 1, open: 1 }]],
    loop: [[0, { eyes: 1, lx: 84, ly: 112, lookX: -0.5, lookY: 1, open: 1 }], [2500, { eyes: 1, lx: 84, ly: 112, lookX: -0.5, lookY: 1, open: 1 }],
      [3200, { eyes: 1, lx: 84, ly: 112, lookY: -1, lookX: 0.6, nod: -0.3, open: 1 }],
      [5800, { eyes: 1, lx: 84, ly: 112, lookY: -1, lookX: 0.6, nod: -0.3, open: 1 }],
      [6500, { eyes: 1, lx: 84, ly: 112, lookX: -0.5, lookY: 1, open: 1 }]],
  },
  beber: {
    intro: [[0, {}], [1200, { rx: 120, ry: 152, cup: 1 }]],
    loop: [[0, { rx: 120, ry: 152, cup: 1 }], [2000, { rx: 108, ry: 104, cup: 1, nod: -0.2 }], [4000, { rx: 108, ry: 104, cup: 1, nod: -0.2 }],
      [6000, { rx: 120, ry: 152, cup: 1 }], [9000, { rx: 120, ry: 152, cup: 1 }]],
  },

  // ───── De pie ─────
  'de-pie': { intro: [[0, ST], [1000, ST]], loop: [[0, ST], [4000, m(ST, { chest: 1.06, shoulders: -3 })], [10000, ST]] },
  'de-pie-brazos-arriba': { intro: [[0, ST], [2500, UP]], loop: [[0, UP], [2500, m(UP_HI, { bodyY: -3 })], [5000, UP]] },
  'de-pie-lateral': {
    intro: [[0, ST], [2000, UP]],
    loop: [[0, UP], [3000, m(UP, { tilt: -16, hipX: 4 })], [6000, m(UP, { tilt: -16, hipX: 4 })], [8500, UP],
      [11500, m(UP, { tilt: 16, hipX: -4 })], [14500, m(UP, { tilt: 16, hipX: -4 })], [17000, UP]],
  },
  'de-pie-cadera': {
    intro: [[0, ST], [1500, HIPS]],
    loop: [[0, HIPS], [1000, m(HIPS, { hipX: -9, tilt: 3 })], [2000, m(HIPS, { bodyY: 2 })], [3000, m(HIPS, { hipX: 9, tilt: -3 })], [4000, HIPS]],
  },
  'de-pie-cuadriceps': {
    intro: [[0, ST], [2000, { lBack: 1, lx: 70, ly: 190, rx: 160, ry: 140 }]],
    loop: [[0, { lBack: 1, lx: 70, ly: 190, rx: 160, ry: 140 }], [12000, { lBack: 1, lx: 70, ly: 190, rx: 160, ry: 140 }], [14500, ST],
      [17000, { rBack: 1, rx: 130, ry: 190, lx: 40, ly: 140 }], [28000, { rBack: 1, rx: 130, ry: 190, lx: 40, ly: 140 }], [30500, ST],
      [33000, { lBack: 1, lx: 70, ly: 190, rx: 160, ry: 140 }]],
  },
  'de-pie-gemelo': {
    intro: [[0, ST], [2000, m(HIPS, { stance: 1, lKnee: 0.25, bodyY: 8 })]],
    loop: [[0, m(HIPS, { stance: 1, lKnee: 0.25, bodyY: 8 })], [12000, m(HIPS, { stance: 1, lKnee: 0.25, bodyY: 8 })], [14500, HIPS],
      [17000, m(HIPS, { stance: -1, rKnee: 0.25, bodyY: 8 })], [28000, m(HIPS, { stance: -1, rKnee: 0.25, bodyY: 8 })], [30500, HIPS],
      [33000, m(HIPS, { stance: 1, lKnee: 0.25, bodyY: 8 })]],
  },
  'de-pie-puntillas': {
    intro: [[0, ST], [800, ST]],
    loop: [[0, ST], [1200, m(ST, { bodyY: -10, toes: 1 })], [2300, m(ST, { bodyY: -10, toes: 1 })], [3500, ST], [4200, ST]],
  },
  'de-pie-abrir-pecho': {
    intro: [[0, ST], [2000, CROSS]],
    loop: [[0, CROSS], [3000, m(CROSS, { chest: 1.08, ly: 122, ry: 122, nod: -0.4 })], [6000, CROSS]],
  },
  'de-pie-inclinar': {
    intro: [[0, ST], [600, ST]],
    loop: [[0, ST], [3000, { bodyY: 24, bend: 1, nod: 1, shoulders: 6, lx: 88, ly: 200, rx: 112, ry: 200 }],
      [6000, { bodyY: 24, bend: 1, nod: 1, shoulders: 6, lx: 88, ly: 200, rx: 112, ry: 200 }], [9500, ST], [10500, ST]],
  },
  'de-pie-caminar': {
    intro: [[0, ST], [600, ST]],
    loop: [[0, ST], [600, m(ST, { lKnee: 1, lx: 78, ly: 176, rx: 146, ry: 186, bodyY: -2 })], [1200, ST],
      [1800, m(ST, { rKnee: 1, rx: 122, ry: 176, lx: 54, ly: 186, bodyY: -2 })], [2400, ST]],
  },
  'de-pie-balanceo': {
    intro: [[0, ST], [600, ST]],
    loop: [[0, ST], [900, { lx: 80, ly: 160, rx: 146, ry: 190 }], [1800, ST], [2700, { rx: 120, ry: 160, lx: 54, ly: 190 }], [3600, ST]],
  },
  'de-pie-giro': {
    intro: [[0, ST], [600, ST]],
    loop: [[0, ST], [1500, { shiftX: -7, turn: -1, lx: 58, ly: 182, rx: 96, ry: 168 }], [3000, ST],
      [4500, { shiftX: 7, turn: 1, rx: 142, ry: 182, lx: 104, ly: 168 }], [6000, ST]],
  },
}

export const AVATAR_POSES = Object.keys(MOVES)

export function isPose(p: string | null | undefined): p is string {
  return !!p && p in MOVES
}

/** Los movimientos "de-pie…" dibujan la figura completa, de pie. */
export function isStanding(pose: string): boolean {
  return pose.startsWith('de-pie')
}

const ease = (k: number) => 0.5 - Math.cos(Math.PI * k) / 2
const KEYS = Object.keys(REST) as (keyof Joints)[]

function sample(keys: K[], t: number): Joints {
  const end = keys[keys.length - 1][0]
  const tt = Math.max(0, Math.min(t, end))
  let i = 0
  while (i < keys.length - 2 && tt >= keys[i + 1][0]) i++
  const a = { ...REST, ...keys[i][1] }
  const b = { ...REST, ...keys[i + 1][1] }
  const span = keys[i + 1][0] - keys[i][0]
  const k = span > 0 ? ease(Math.min(1, (tt - keys[i][0]) / span)) : 1
  const out = {} as Joints
  for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * k
  return out
}

/**
 * Postura del avatar para el movimiento `pose` en el instante `ms` del paso.
 * `breath` (0 = círculo pequeño, 1 = grande) sincroniza el pecho con la respiración guiada.
 * `alive` añade la vida continua (respiración, balanceo, parpadeo).
 */
export function poseAt(pose: string, ms: number, breath?: number, alive = true): Joints {
  const mv = MOVES[pose] ?? MOVES.respirar
  const introEnd = mv.intro ? mv.intro[mv.intro.length - 1][0] : 0
  let j: Joints
  if (mv.intro && ms < introEnd) j = sample(mv.intro, ms)
  else {
    const cycle = mv.loop[mv.loop.length - 1][0]
    const t = (((ms - introEnd) % cycle) + cycle) % cycle
    j = sample(mv.loop, t)
  }
  mv.extra?.(ms, j)

  if (breath !== undefined) {
    const b = Math.max(0, Math.min(1, breath))
    j.chest += 0.07 * b
    j.shoulders -= 3 * b
  } else if (alive) {
    j.chest += 0.015 * Math.sin((ms / 4500) * Math.PI * 2)
  }
  if (alive) {
    j.head += 1.3 * Math.sin((ms / 6200) * Math.PI * 2)
    j.shiftX += 0.8 * Math.sin((ms / 7300) * Math.PI * 2)
    // Parpadeo natural cuando tiene los ojos abiertos
    if (j.eyes > 0.5 && ms % 3700 < 140) j.eyes = 0
  }
  return j
}

/**
 * Codo y muñeca de un brazo de dos segmentos que quiere llegar a `target`.
 * El codo se dobla siempre hacia fuera del cuerpo.
 */
export function solveArm(shoulder: [number, number], target: [number, number], l1 = 31, l2 = 31) {
  const dx = target[0] - shoulder[0]
  const dy = target[1] - shoulder[1]
  const dist = Math.hypot(dx, dy)
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, dist))
  const base = Math.atan2(dy, dx)
  const off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  const e1: [number, number] = [shoulder[0] + l1 * Math.cos(base + off), shoulder[1] + l1 * Math.sin(base + off)]
  const e2: [number, number] = [shoulder[0] + l1 * Math.cos(base - off), shoulder[1] + l1 * Math.sin(base - off)]
  const outward = (e: [number, number]) => Math.abs(e[0] - 100) + (e[1] > shoulder[1] ? 0.5 : 0)
  const elbow = outward(e1) >= outward(e2) ? e1 : e2
  const wrist: [number, number] = [shoulder[0] + d * Math.cos(base), shoulder[1] + d * Math.sin(base)]
  return { elbow, wrist }
}
