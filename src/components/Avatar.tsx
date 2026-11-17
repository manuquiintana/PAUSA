import { useId, type ReactElement } from 'react'
import { type Guide, type Joints, REST, solveArm } from '../lib/avatar'

/** Colores del avatar, en armonía con la paleta de Pausa. */
const SKIN = '#F2C6A4'
const SKIN_SHADE = '#E2A985'
const LINE = '#5B3B2E'
const SHOE = '#3E4A4E'
const LOOK: Record<Guide, { hair: string; shirt: string; shirtShade: string; pants: string; shoulderX: number }> = {
  mujer: { hair: '#B8643C', shirt: '#FFFFFF', shirtShade: '#EDE6DA', pants: '#8FC2B0', shoulderX: 30 },
  hombre: { hair: '#4A3A30', shirt: '#6F9A82', shirtShade: '#5E8770', pants: '#5E7C8A', shoulderX: 36 },
}

type Pt = [number, number]

/**
 * Avatar guía en ilustración plana (diseño propio de Pausa), sentado o de pie.
 * Se dibuja en un lienzo de 200×200 recortado en círculo.
 */
export function Avatar({ guide, joints = REST, standing = false, className, crop }: {
  guide: Guide; joints?: Joints; standing?: boolean; className?: string
  /** 'cara' recorta el dibujo a la cabeza (para iconos pequeños) */
  crop?: 'cara'
}) {
  const clip = useId()
  const look = LOOK[guide]
  const isW = guide === 'mujer'
  const j = joints
  const sy = j.shoulders
  const L: Pt = [100 - look.shoulderX, 130 + sy]
  const R: Pt = [100 + look.shoulderX, 130 + sy]
  const left = solveArm(L, [j.lx, j.ly])
  const right = solveArm(R, [j.rx, j.ry])

  const hand = (p: ReturnType<typeof solveArm>, withCup: boolean) => {
    const dx = p.wrist[0] - p.elbow[0]
    const dy = p.wrist[1] - p.elbow[1]
    const n = Math.hypot(dx, dy) || 1
    const ux = dx / n
    const uy = dy / n
    return (
      <g>
        {j.open > 0.5 && [-0.7, -0.25, 0.2, 0.65].map((a) => {
          const c = Math.cos(a)
          const s = Math.sin(a)
          const fx = ux * c - uy * s
          const fy = ux * s + uy * c
          return <line key={a} x1={p.wrist[0]} y1={p.wrist[1]} x2={p.wrist[0] + fx * 10} y2={p.wrist[1] + fy * 10}
            stroke={SKIN} strokeWidth="3.4" strokeLinecap="round" />
        })}
        <circle cx={p.wrist[0]} cy={p.wrist[1]} r={isW ? 6 : 7} fill={SKIN} />
        {withCup && (
          <g transform={`translate(${p.wrist[0] - 7} ${p.wrist[1] - 15})`}>
            <rect x="0" y="0" width="13" height="15" rx="3" fill="#E58F6E" />
            <path d="M13 4 h3 a3.5 3.5 0 0 1 0 7 h-3" fill="none" stroke="#E58F6E" strokeWidth="2.4" />
            <path d="M4 -3 q2 -3 0 -6 M8 -3 q2 -3 0 -6" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        )}
      </g>
    )
  }

  const arm = (s: Pt, p: ReturnType<typeof solveArm>, withCup: boolean) => {
    const sleeve: Pt = [s[0] + (p.elbow[0] - s[0]) * 0.45, s[1] + (p.elbow[1] - s[1]) * 0.45]
    return (
      <g strokeLinecap="round">
        <line x1={s[0]} y1={s[1]} x2={p.elbow[0]} y2={p.elbow[1]} stroke={SKIN} strokeWidth={isW ? 11 : 13} />
        <line x1={p.elbow[0]} y1={p.elbow[1]} x2={p.wrist[0]} y2={p.wrist[1]} stroke={SKIN} strokeWidth={isW ? 10 : 12} />
        <line x1={s[0]} y1={s[1]} x2={sleeve[0]} y2={sleeve[1]} stroke={look.shirt} strokeWidth={isW ? 15 : 17} />
        {hand(p, withCup)}
      </g>
    )
  }

  // ── Cabeza ──
  const fx = j.turn * 5
  const fy = j.nod * 3.2
  const eye = (cx: number) =>
    j.eyes > 0.5 ? (
      <g key={cx}>
        <ellipse cx={cx} cy="80" rx="3.6" ry="2.8" fill="#fff" />
        <circle cx={cx + j.lookX * 1.4} cy={80 + j.lookY * 0.9} r="1.9" fill={LINE} />
        <path d={`M${cx - 4} 78.6 q4 -2.6 8 0`} fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    ) : (
      <path key={cx} d={`M${cx - 4} 79 q4 3.2 8 0`} fill="none" stroke={LINE} strokeWidth="1.7" strokeLinecap="round" />
    )

  const head = (
    <g transform={`translate(${j.turn * 1.5} ${j.nod * 4}) rotate(${j.head} 100 100)`}>
      {isW && (
        <>
          <ellipse cx={100 - j.turn * 1.5} cy="76" rx="24" ry="26" fill={look.hair} />
          <path d="M84 66 C68 74 68 98 72 114 C74 124 68 132 63 137 C78 133 85 120 83 106 C81 93 83 80 92 70 Z" fill={look.hair} />
        </>
      )}
      <ellipse cx={81 + Math.max(0, j.turn) * 3} cy="81" rx={Math.max(1, 4 - Math.max(0, -j.turn) * 2)} ry="6" fill={SKIN} />
      <ellipse cx={119 + Math.min(0, j.turn) * 3} cy="81" rx={Math.max(1, 4 - Math.max(0, j.turn) * 2)} ry="6" fill={SKIN} />
      <ellipse cx="100" cy="79" rx={isW ? 19 : 20} ry="23" fill={SKIN} />
      <g transform={`translate(${fx} ${fy})`}>
        {!isW && (
          <path d="M81 84 C82 98 90 103 100 103 C110 103 118 98 119 84 C116 94 109 97 100 97 C91 97 84 94 81 84 Z" fill={look.hair} opacity="0.55" />
        )}
        <g fill="none" stroke={LINE} strokeLinecap="round">
          <path d="M88.5 70.5 q4 -2 8 0" strokeWidth={isW ? 1.3 : 2} opacity="0.7" />
          <path d="M103.5 70.5 q4 -2 8 0" strokeWidth={isW ? 1.3 : 2} opacity="0.7" />
          <path d="M100 82 q-1.6 4.5 1.4 5.2" strokeWidth="1.3" stroke={SKIN_SHADE} />
          <path d="M95.5 92 q4.5 3.2 9 0" strokeWidth="1.6" stroke="#B5524A" />
        </g>
        {eye(93)}
        {eye(107)}
        <circle cx="88" cy="87" r="3.4" fill="#E58F6E" opacity="0.3" />
        <circle cx="112" cy="87" r="3.4" fill="#E58F6E" opacity="0.3" />
      </g>
      <g transform={`translate(${j.turn * 2} ${Math.min(0, j.nod)})`}>
        {isW ? (
          <path d="M80 78 C77 57 92 50 103 51 C116 52 123 61 120 78 C116 67 108 61 97 62 C90 63 84 69 80 78 Z" fill={look.hair} />
        ) : (
          <path d="M80 77 C78 56 92 49 102 49 C116 49 124 59 120 77 C118 66 110 61 100 61 C91 61 84 66 80 77 Z" fill={look.hair} />
        )}
      </g>
    </g>
  )

  const torso = (
    <g transform={`translate(0 ${sy}) translate(100 190) scale(${1 + (j.chest - 1) * 0.6} ${j.chest}) translate(-100 -190)`}>
      {isW ? (
        <>
          <path d="M66 142 C66 128 78 121 93 119 L107 119 C122 121 134 128 134 142 L139 205 L61 205 Z" fill={look.shirt} />
          <path d="M93 119 L100 134 L107 119 Z" fill={SKIN} />
          <path d="M70 160 C80 166 120 166 130 160 L132 205 L68 205 Z" fill={look.shirtShade} opacity="0.6" />
        </>
      ) : (
        <>
          <path d="M60 144 C60 127 74 120 90 118 L110 118 C126 120 140 127 140 144 L146 205 L54 205 Z" fill={look.shirt} />
          <path d="M90 118 C93 126 107 126 110 118 Z" fill={SKIN} />
          <path d="M64 162 C78 168 122 168 136 162 L139 205 L61 205 Z" fill={look.shirtShade} opacity="0.6" />
        </>
      )}
    </g>
  )

  const upper = (
    <>
      <rect x={isW ? 93 : 91} y="92" width={isW ? 14 : 18} height="36" rx="6" fill={SKIN_SHADE} />
      {head}
      {torso}
    </>
  )

  // ── Piernas (solo de pie) ──
  const legs = () => {
    const out: ReactElement[] = []
    for (const s of [-1, 1] as const) {
      const k = s === -1 ? j.lKnee : j.rKnee
      const back = s === -1 ? j.lBack : j.rBack
      const hip: Pt = [100 + j.hipX + s * 12, 196 + j.bodyY]
      // Zancada: el lado "delantero" (signo de stance) se abre más
      const footX = 100 + s * (14 + Math.abs(j.stance) * 16)
      let knee: Pt
      let foot: Pt
      let behind = false
      if (k > 0.01) {
        knee = [hip[0] + s * 2, hip[1] + 52 * (1 - 0.55 * k)]
        foot = [footX - s * 4 * k, 300 - 44 * k]
      } else if (back > 0.01) {
        knee = [hip[0], hip[1] + 52]
        foot = [hip[0] + s * 2, knee[1] + 54 * (1 - 0.82 * back)]
        behind = back > 0.5
      } else {
        foot = [footX, 300]
        knee = [(hip[0] + foot[0]) / 2 + s * (j.bend * 11 + 1.5), (hip[1] + foot[1]) / 2]
      }
      out.push(
        <g key={s} strokeLinecap="round">
          <line x1={hip[0]} y1={hip[1]} x2={knee[0]} y2={knee[1]} stroke={look.pants} strokeWidth="18" />
          <line x1={knee[0]} y1={knee[1]} x2={foot[0]} y2={foot[1]} stroke={look.pants} strokeWidth={behind ? 13 : 16} opacity={behind ? 0.85 : 1} />
          {!behind && <ellipse cx={foot[0] + s * 3} cy={foot[1] + 6} rx={j.toes > 0.5 ? 7 : 10} ry={j.toes > 0.5 ? 3.5 : 5} fill={SHOE} />}
        </g>,
      )
    }
    return out
  }

  const content = standing ? (
    <g transform="translate(100 104) scale(0.7) translate(-100 -177)">
      <ellipse cx="100" cy="308" rx="44" ry="6" fill="#000" opacity="0.06" />
      {legs()}
      <g transform={`translate(${j.hipX + j.shiftX} ${j.bodyY}) rotate(${j.tilt} 100 196)`}>
        <rect x="76" y="176" width="48" height="30" rx="12" fill={look.pants} />
        {upper}
        {arm(L, left, false)}
        {arm(R, right, j.cup > 0.5)}
      </g>
    </g>
  ) : (
    <g transform="translate(100 106) scale(1.12) translate(-100 -118)">
      <g transform={`translate(${j.shiftX} 0) rotate(${j.tilt} 100 190)`}>{upper}</g>
      <path d="M38 205 C38 180 66 170 100 170 C134 170 162 180 162 205 Z" fill={look.pants} />
      <path d="M70 182 C84 178 116 178 130 182" fill="none" stroke="#000" strokeOpacity="0.08" strokeWidth="3" strokeLinecap="round" />
      <g transform={`translate(${j.shiftX} 0) rotate(${j.tilt} 100 190)`}>
        {arm(L, left, false)}
        {arm(R, right, j.cup > 0.5)}
      </g>
    </g>
  )

  return (
    <svg viewBox={crop === 'cara' ? '58 22 84 84' : '0 0 200 200'} className={className} role="img"
      aria-label={isW ? 'Guía: mujer haciendo el ejercicio' : 'Guía: hombre haciendo el ejercicio'}>
      <defs>
        <clipPath id={clip}><circle cx="100" cy="100" r={crop === 'cara' ? 200 : 96} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{crop === 'cara' ? upper : content}</g>
    </svg>
  )
}
