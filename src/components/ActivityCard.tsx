import { Link } from 'react-router-dom'
import { MODULE_BY_ID } from '../lib/modules'
import type { Activity } from '../lib/types'

export function StandingTag({ standing }: { standing: boolean }) {
  return (
    <span className="rounded-full bg-[#EFEAE1] px-2.5 py-0.5 text-xs font-medium text-neutro-oscuro">
      {standing ? 'De pie' : 'Sentado'}
    </span>
  )
}

export function ActivityCard({ activity, blocked }: { activity: Activity; blocked?: boolean }) {
  const m = MODULE_BY_ID[activity.module]
  return (
    <Link to={`/pausas/${activity.id}`}
      className="card group flex h-full flex-col p-4 transition hover:border-salvia hover:bg-white">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} aria-hidden="true" />
        <span className="text-xs font-medium text-neutro-oscuro">{activity.durationMin} min</span>
        <span className="ml-auto"><StandingTag standing={activity.requiresStanding} /></span>
      </div>
      <h3 className="mt-2 font-titulo text-lg font-semibold leading-snug group-hover:text-salvia-oscuro">{activity.title}</h3>
      <p className="mt-1 text-sm text-neutro-oscuro">{activity.summary}</p>
      {blocked && <p className="mt-2 text-xs text-[#9A4A2C]">Requiere ponerse de pie: no te la sugeriremos.</p>}
    </Link>
  )
}
