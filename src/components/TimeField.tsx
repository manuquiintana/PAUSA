import { useId } from 'react'

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

/**
 * Selector de hora en formato 24 h (siempre, sin depender del idioma del navegador).
 * Valor "HH:MM" con minutos de 5 en 5.
 */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  const [h, m] = (value || '09:00').slice(0, 5).split(':')
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort()
  const sel = 'input appearance-none bg-white px-3 text-center tabular-nums'
  return (
    <fieldset>
      <legend id={id} className="mb-1 block text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-1.5">
        <select aria-labelledby={id} aria-label={`${label}: hora`} className={sel} value={h}
          onChange={(e) => onChange(`${e.target.value}:${m}`)}>
          {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <span aria-hidden="true" className="font-medium">:</span>
        <select aria-label={`${label}: minutos`} className={sel} value={m}
          onChange={(e) => onChange(`${h}:${e.target.value}`)}>
          {minutes.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </fieldset>
  )
}
