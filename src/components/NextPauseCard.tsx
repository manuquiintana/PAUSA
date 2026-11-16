import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/app-context'
import { MODULE_BY_ID } from '../lib/modules'
import { localDay, nextSlot, pauseSlots, suggestActivity } from '../lib/suggest'
import type { Activity, PauseSession } from '../lib/types'
import { StandingTag } from './ActivityCard'
import { Card, Spinner } from './ui'

export function NextPauseCard() {
  const { backend, getActivities, prefs, me } = useApp()
  const [data, setData] = useState<{ activities: Activity[]; sessions: PauseSession[] } | null>(null)
  const [skip, setSkip] = useState<string[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([getActivities(), backend.listMySessions(14)])
      .then(([activities, sessions]) => setData({ activities, sessions }))
      .catch(() => setError(true))
  }, [backend, getActivities])

  const now = useMemo(() => new Date(), [])
  const suggestion = useMemo(
    () => (data && prefs ? suggestActivity(data.activities, prefs, data.sessions, now, skip) : null),
    [data, prefs, now, skip],
  )

  if (!prefs) return null
  const slots = pauseSlots(prefs, { start: me.company.pauseWindowStart, end: me.company.pauseWindowEnd })
  const next = nextSlot(slots, now)
  const doneToday = data?.sessions.filter((s) => s.completedAt && localDay(new Date(s.startedAt)) === localDay(now)).length ?? 0

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold">Tu próxima pausa</h2>
        <span className="shrink-0 text-sm tabular-nums text-neutro-oscuro">
          {Math.min(doneToday, prefs.pausesPerDay)}/{prefs.pausesPerDay} hoy
        </span>
      </div>
      <p className="mt-1 text-sm text-neutro-oscuro">
        {doneToday >= prefs.pausesPerDay
          ? 'Ya has hecho tus pausas de hoy. Si te apetece otra, adelante.'
          : next ? `Te sugerimos hacerla hacia las ${next}.` : 'Tu horario de hoy ha terminado. Puedes hacer una pausa igualmente.'}
      </p>

      {error && <p className="mt-4 text-sm text-[#7A3A22]">No se pudo cargar la sugerencia.</p>}
      {!data && !error && <Spinner label="Buscando una pausa para ti…" />}
      {suggestion && (() => {
        const m = MODULE_BY_ID[suggestion.module]
        return (
          <div className="mt-4 flex flex-1 flex-col rounded-2xl p-4" style={{ background: m.bg }}>
            <div className="flex items-center gap-2 text-xs font-medium text-[#3E4A4E]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} aria-hidden="true" />
              {m.name} · {suggestion.durationMin} min
              <span className="ml-auto"><StandingTag standing={suggestion.requiresStanding} /></span>
            </div>
            <h3 className="mt-2 font-titulo text-xl font-semibold">{suggestion.title}</h3>
            <p className="mt-1 text-sm text-[#3E4A4E]">{suggestion.summary}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Link to={`/reproducir/${suggestion.id}`} className="btn-primary">Empezar</Link>
              <button type="button" className="btn bg-white/70 hover:bg-white" onClick={() => setSkip((s) => [...s, suggestion.id])}>
                Otra sugerencia
              </button>
            </div>
          </div>
        )
      })()}
      <Link to="/preferencias" className="mt-3 text-sm text-neutro-oscuro underline-offset-4 hover:underline">Ajustar mis preferencias</Link>
    </Card>
  )
}
