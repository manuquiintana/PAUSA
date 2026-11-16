import { useEffect, useState } from 'react'
import { fmtScore, PERIOD_OPTIONS, periodLabel } from '../lib/format'
import type { Wellbeing } from '../lib/types'
import { ErrorNote, Spinner } from './ui'

type Loader = (period: 'week' | 'month', offset: number) => Promise<Wellbeing>

export function WellbeingPanel({ load, loadKey }: { load: Loader; loadKey: string }) {
  const [opt, setOpt] = useState(0)
  const [data, setData] = useState<Wellbeing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { period, offset } = PERIOD_OPTIONS[opt]

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    load(period, offset)
      .then((w) => alive && setData(w))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Error al cargar'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey, period, offset])

  return (
    <div>
      <div role="radiogroup" aria-label="Periodo" className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((o, i) => (
          <button key={o.label} type="button" role="radio" aria-checked={i === opt} onClick={() => setOpt(i)}
            className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${
              i === opt ? 'border-salvia-oscuro bg-salvia-oscuro text-white' : 'border-[#D9D2C5] bg-white hover:bg-fondo'}`}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-5" aria-live="polite">
        {error && <ErrorNote message={error} />}
        {!error && !data && <Spinner label="Calculando indicadores…" />}
        {data && (
          <>
            <p className="mb-4 text-sm text-neutro-oscuro">{periodLabel(data, period)}</p>
            {data.sufficient ? <Metrics w={data} /> : <Insufficient />}
          </>
        )}
      </div>
    </div>
  )
}

function Insufficient() {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-dashed border-[#D9D2C5] bg-white/60 px-6 py-12 text-center">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#6F9A82" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" />
      </svg>
      <p className="mt-3 max-w-sm font-medium">Datos insuficientes para proteger la privacidad del equipo</p>
      <p className="mt-1 max-w-sm text-sm text-neutro-oscuro">Los indicadores aparecen cuando al menos 5 personas distintas han aportado datos en el periodo.</p>
    </div>
  )
}

function Metrics({ w }: { w: Wellbeing }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <h3 className="font-texto text-sm font-medium text-neutro-oscuro">Cómo se siente el equipo (media de 1 a 10)</h3>
        <ScoreBar label="Al empezar el día" value={w.avgStart} color="#6F9A82" />
        <ScoreBar label="Al terminar el día" value={w.avgEnd} color="#E58F6E" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Tile label="Personas que participaron" value={String(w.contributors)} />
        <Tile label="Check-ins registrados" value={String(w.checkinsCount)} />
        <Tile label="Pausas completadas" value={String(w.pausesCompleted)} />
        <Tile label="Variación en la jornada" value={
          w.avgStart !== null && w.avgEnd !== null
            ? `${w.avgEnd - w.avgStart >= 0 ? '+' : '−'}${fmtScore(Math.abs(w.avgEnd - w.avgStart))}` : '—'} />
      </div>
    </div>
  )
}

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value === null ? 0 : (value / 10) * 100
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="font-titulo text-2xl font-semibold">{fmtScore(value)}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EDE7DC]" role="img" aria-label={`${label}: ${fmtScore(value)} de 10`}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col justify-between p-4">
      <span className="text-sm text-neutro-oscuro">{label}</span>
      <span className="mt-2 font-titulo text-3xl font-semibold">{value}</span>
    </div>
  )
}
