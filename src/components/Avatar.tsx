import { useId } from 'react'
import { armPoints, type Guide, type Joints, REST } from '../lib/avatar'

/** Colores del avatar, en armonía con la paleta de Pausa. */
const SKIN = '#F2C6A4'
const SKIN_SHADE = '#E2A985'
const LINE = '#5B3B2E'
const LOOK: Record<Guide, { hair: string; shirt: string; shirtShade: string; pants: string; shoulderX: number }> = {
  mujer: { hair: '#B8643C', shirt: '#FFFFFF', shirtShade: '#EDE6DA', pants: '#A9D3C4', shoulderX: 30 },
  hombre: { hair: '#4A3A30', shirt: '#6F9A82', shirtShade: '#5E8770', pants: '#5E7C8A', shoulderX: 36 },
}

/**
 * Avatar guía en ilustración plana (diseño propio de Pausa).
 * Se dibuja en un lienzo de 200×200 recortado en círculo.
 */
export function Avatar({ guide, joints = REST, className, crop }: {
  guide: Guide; joints?: Joints; className?: string
  /** 'cara' recorta el dibujo a la cabeza (para iconos pequeños) */
  crop?: 'cara'
}) {
  const clip = useId()
  const look = LOOK[guide]
  const sy = joints.shoulders
  const L: [number, number] = [100 - look.shoulderX, 130 + sy]
  const R: [number, number] = [100 + look.shoulderX, 130 + sy]
  const left = armPoints(L, joints.leftUpper, joints.leftFore, -1)
  const right = armPoints(R, joints.rightUpper, joints.rightFore, 1)
  const isW = guide === 'mujer'

  const arm = (s: [number, number], p: ReturnType<typeof armPoints>) => {
    const sleeve: [number, number] = [s[0] + (p.elbow[0] - s[0]) * 0.45, s[1] + (p.elbow[1] - s[1]) * 0.45]
    return (
      <g strokeLinecap="round">
        <line x1={s[0]} y1={s[1]} x2={p.elbow[0]} y2={p.elbow[1]} stroke={SKIN} strokeWidth={isW ? 11 : 13} />
        <line x1={p.elbow[0]} y1={p.elbow[1]} x2={p.wrist[0]} y2={p.wrist[1]} stroke={SKIN} strokeWidth={isW ? 10 : 12} />
        <line x1={s[0]} y1={s[1]} x2={sleeve[0]} y2={sleeve[1]} stroke={look.shirt} strokeWidth={isW ? 15 : 17} />
        <circle cx={p.wrist[0]} cy={p.wrist[1]} r={isW ? 6 : 7} fill={SKIN} />
      </g>
    )
  }

  return (
    <svg viewBox={crop === 'cara' ? '58 22 84 84' : '0 0 200 200'} className={className} role="img"
      aria-label={isW ? 'Guía: mujer haciendo el ejercicio' : 'Guía: hombre haciendo el ejercicio'}>
      <defs>
        <clipPath id={clip}><circle cx="100" cy="100" r="96" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g transform="translate(100 106) scale(1.12) translate(-100 -118)">
        {/* Cuello */}
        <rect x={isW ? 93 : 91} y="92" width={isW ? 14 : 18} height="36" rx="6" fill={SKIN_SHADE} />
        {/* Cabeza (se inclina sobre la parte alta del cuello) */}
        <g transform={`rotate(${joints.head} 100 100)`}>
          {isW && (
            <>
              {/* Pelo largo por detrás + coleta que cae sobre el hombro */}
              <ellipse cx="100" cy="76" rx="24" ry="26" fill={look.hair} />
              <path d="M84 66 C68 74 68 98 72 114 C74 124 68 132 63 137 C78 133 85 120 83 106 C81 93 83 80 92 70 Z" fill={look.hair} />
            </>
          )}
          <ellipse cx="81" cy="81" rx="4" ry="6" fill={SKIN} />
          <ellipse cx="119" cy="81" rx="4" ry="6" fill={SKIN} />
          <ellipse cx="100" cy="79" rx={isW ? 19 : 20} ry="23" fill={SKIN} />
          {isW ? (
            <path d="M80 78 C77 57 92 50 103 51 C116 52 123 61 120 78 C116 67 108 61 97 62 C90 63 84 69 80 78 Z" fill={look.hair} />
          ) : (
            <>
              <path d="M80 77 C78 56 92 49 102 49 C116 49 124 59 120 77 C118 66 110 61 100 61 C91 61 84 66 80 77 Z" fill={look.hair} />
              {/* Barba corta */}
              <path d="M81 84 C82 98 90 103 100 103 C110 103 118 98 119 84 C116 94 109 97 100 97 C91 97 84 94 81 84 Z" fill={look.hair} opacity="0.55" />
            </>
          )}
          {/* Cara: ojos cerrados y sonrisa tranquila */}
          <g fill="none" stroke={LINE} strokeLinecap="round">
            <path d="M88.5 70.5 q4 -2 8 0" strokeWidth={isW ? 1.3 : 2} opacity="0.7" />
            <path d="M103.5 70.5 q4 -2 8 0" strokeWidth={isW ? 1.3 : 2} opacity="0.7" />
            <path d="M89 79 q4 3.2 8 0" strokeWidth="1.7" />
            <path d="M103 79 q4 3.2 8 0" strokeWidth="1.7" />
            <path d="M100 82 q-1.6 4.5 1.4 5.2" strokeWidth="1.3" stroke={SKIN_SHADE} />
            <path d="M95.5 92 q4.5 3.2 9 0" strokeWidth="1.6" stroke="#B5524A" />
          </g>
          <circle cx="88" cy="87" r="3.4" fill="#E58F6E" opacity="0.3" />
          <circle cx="112" cy="87" r="3.4" fill="#E58F6E" opacity="0.3" />
        </g>

        {/* Tronco (sube con los hombros, se expande al respirar) */}
        <g transform={`translate(0 ${sy}) translate(100 190) scale(${1 + (joints.chest - 1) * 0.6} ${joints.chest}) translate(-100 -190)`}>
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

        {/* Piernas cruzadas (regazo) */}
        <path d="M38 205 C38 180 66 170 100 170 C134 170 162 180 162 205 Z" fill={look.pants} />
        <path d="M70 182 C84 178 116 178 130 182" fill="none" stroke="#000" strokeOpacity="0.08" strokeWidth="3" strokeLinecap="round" />

        {/* Brazos por delante */}
        {arm(L, left)}
        {arm(R, right)}
        </g>
      </g>
    </svg>
  )
}
