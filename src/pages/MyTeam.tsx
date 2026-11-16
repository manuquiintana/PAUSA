import { useEffect, useState } from 'react'
import { Card, ErrorNote, PageTitle, Spinner } from '../components/ui'
import { WellbeingPanel } from '../components/WellbeingPanel'
import { useApp } from '../lib/app-context'
import type { TeamSummary } from '../lib/types'

export default function MyTeamPage() {
  const { backend, me } = useApp()
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    backend.listTeams()
      .then((all) => {
        // El manager ve sus equipos; el admin, todos los de su empresa.
        const mine = me.role === 'admin' ? all : all.filter((t) => t.managerId === me.id)
        setTeams(mine)
        setSelected(mine[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar equipos'))
  }, [backend, me])

  const team = teams?.find((t) => t.id === selected)

  return (
    <div>
      <PageTitle title={me.role === 'admin' ? 'Equipos' : 'Mi equipo'}
        subtitle="Indicadores agregados y anónimos. Nunca verás datos de una persona concreta." />
      {error && <ErrorNote message={error} />}
      {!teams && !error && <Spinner />}
      {teams && teams.length === 0 && <Card><p className="text-neutro-oscuro">Todavía no tienes equipos asignados.</p></Card>}
      {teams && teams.length > 0 && (
        <div className="space-y-5">
          {teams.length > 1 && (
            <label className="block max-w-xs">
              <span className="mb-1 block text-sm font-medium">Equipo</span>
              <select className="input" value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}
          {team && (
            <Card>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-semibold">{team.name}</h2>
                <span className="text-sm text-neutro-oscuro">{team.memberCount} personas en el equipo</span>
              </div>
              <WellbeingPanel loadKey={team.id} load={(p, o) => backend.teamWellbeing(team.id, p, o)} />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
