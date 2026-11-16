import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StandingTag } from '../components/ActivityCard'
import { ErrorNote, Spinner } from '../components/ui'
import { useApp } from '../lib/app-context'
import { MODULE_BY_ID, NEED_LABEL } from '../lib/modules'
import type { Activity } from '../lib/types'

export default function ActivityDetailPage() {
  const { id } = useParams()
  const { getActivities, prefs } = useApp()
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined)

  useEffect(() => {
    getActivities().then((all) => setActivity(all.find((a) => a.id === id) ?? null))
  }, [getActivities, id])

  if (activity === undefined) return <Spinner />
  if (activity === null) return <ErrorNote message="No encontramos esta pausa." />

  const m = MODULE_BY_ID[activity.module]
  const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}` : `${s} s`)

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/pausas" className="btn-ghost -ml-4 mb-2 text-sm">← Todas las pausas</Link>
      <header className="overflow-hidden rounded-xl2" style={{ background: m.bg }}>
        <div className="p-6 md:p-8">
          <p className="text-sm font-medium" style={{ color: '#3E4A4E' }}>{m.name} · {activity.durationMin} min</p>
          <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{activity.title}</h1>
          <p className="mt-2 max-w-xl text-[#3E4A4E]">{activity.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StandingTag standing={activity.requiresStanding} />
            {activity.needs.map((n) => (
              <span key={n} className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium">{NEED_LABEL[n]}</span>
            ))}
          </div>
          <Link to={`/reproducir/${activity.id}`} className="btn-primary mt-6">Empezar pausa</Link>
          {activity.requiresStanding && prefs?.canStand === false && (
            <p className="mt-3 text-sm text-[#7A3A22]">Esta pausa es de pie. Hazla solo si te resulta cómodo.</p>
          )}
        </div>
      </header>

      <section className="card mt-6 p-5 md:p-6">
        <h2 className="text-xl font-semibold">Qué vas a hacer</h2>
        <ol className="mt-4 space-y-3">
          {activity.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                style={{ background: m.color === '#E58F6E' || m.color === '#C9A86A' ? '#8A6A3A' : '#4F7562' }}>{i + 1}</span>
              <span className="flex-1">{s.text}</span>
              <span className="shrink-0 text-sm tabular-nums text-neutro-oscuro">{fmt(s.seconds)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-neutro-oscuro">Contenido de ejemplo, {activity.reviewStatus}.</p>
      </section>
    </div>
  )
}
