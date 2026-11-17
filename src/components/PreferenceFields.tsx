import { NEED_LABEL } from '../lib/modules'
import type { Guide } from '../lib/avatar'
import type { Need } from '../lib/types'
import { Avatar } from './Avatar'

const NEEDS: Need[] = ['cuello_espalda', 'desconectar', 'concentracion', 'energia', 'calma']

const choiceCls = (on: boolean) =>
  `min-h-[52px] rounded-2xl border px-4 py-3 text-left font-medium transition focus-visible:outline-coral ${
    on ? 'border-salvia-oscuro bg-salvia-claro text-[#2F4A3C]' : 'border-[#D9D2C5] bg-white hover:border-salvia'}`

export function NeedsField({ value, onChange }: { value: Need[]; onChange: (v: Need[]) => void }) {
  return (
    <div role="group" aria-label="Qué necesitas más" className="grid gap-2 sm:grid-cols-2">
      {NEEDS.map((n) => {
        const on = value.includes(n)
        return (
          <button key={n} type="button" aria-pressed={on} className={choiceCls(on)}
            onClick={() => onChange(on ? value.filter((x) => x !== n) : [...value, n])}>
            <span className="flex items-center justify-between gap-3">
              {NEED_LABEL[n]}
              <span aria-hidden="true" className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
                on ? 'border-salvia-oscuro bg-salvia-oscuro text-white' : 'border-[#D9D2C5]'}`}>{on ? '✓' : ''}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PausesField({ value, onChange }: { value: 1 | 2 | 3; onChange: (v: 1 | 2 | 3) => void }) {
  return (
    <div role="radiogroup" aria-label="Pausas al día" className="grid grid-cols-3 gap-3">
      {([1, 2, 3] as const).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} className={`${choiceCls(value === n)} text-center`}
          onClick={() => onChange(n)}>
          <span className="block font-titulo text-3xl">{n}</span>
          <span className="text-sm font-normal">{n === 1 ? 'pausa' : 'pausas'}</span>
        </button>
      ))}
    </div>
  )
}

export function StandField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="radiogroup" aria-label="Puedes ponerte de pie" className="grid gap-3 sm:grid-cols-2">
      <button type="button" role="radio" aria-checked={value} className={choiceCls(value)} onClick={() => onChange(true)}>
        Sí, puedo levantarme
        <span className="block text-sm font-normal text-neutro-oscuro">Incluye estiramientos y movimiento de pie</span>
      </button>
      <button type="button" role="radio" aria-checked={!value} className={choiceCls(!value)} onClick={() => onChange(false)}>
        Prefiero quedarme sentado
        <span className="block text-sm font-normal text-neutro-oscuro">Solo te propondremos pausas en la silla</span>
      </button>
    </div>
  )
}

export function ScheduleField({ start, end, onChange }: { start: string; end: string; onChange: (s: string, e: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label>
        <span className="mb-1 block text-sm font-medium">Empiezo hacia las</span>
        <input className="input" type="time" value={start} onChange={(e) => onChange(e.target.value, end)} required />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium">Termino hacia las</span>
        <input className="input" type="time" value={end} onChange={(e) => onChange(start, e.target.value)} required />
      </label>
    </div>
  )
}

export function GuideField({ value, onChange }: { value: Guide; onChange: (v: Guide) => void }) {
  return (
    <div role="radiogroup" aria-label="Guía de las pausas" className="grid grid-cols-2 gap-3">
      {(['mujer', 'hombre'] as const).map((g) => (
        <button key={g} type="button" role="radio" aria-checked={value === g} onClick={() => onChange(g)}
          className={`${choiceCls(value === g)} flex flex-col items-center gap-2 text-center`}>
          <span className="block h-24 w-24 overflow-hidden rounded-full bg-salvia-claro">
            <Avatar guide={g} className="h-full w-full" />
          </span>
          {g === 'mujer' ? 'Mujer' : 'Hombre'}
        </button>
      ))}
    </div>
  )
}
