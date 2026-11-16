import { useEffect, useState } from 'react'
import { ActivityCard } from '../components/ActivityCard'
import { ErrorNote, PageTitle, Spinner } from '../components/ui'
import { useApp } from '../lib/app-context'
import { MODULES } from '../lib/modules'
import type { Activity } from '../lib/types'

export default function CatalogPage() {
  const { getActivities, prefs } = useApp()
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getActivities().then(setActivities).catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
  }, [getActivities])

  return (
    <div>
      <PageTitle title="Pausas" subtitle="Elige la que te apetezca. Todas duran entre 5 y 10 minutos." />
      {error && <ErrorNote message={error} />}
      {!activities && !error && <Spinner />}
      {activities && (
        <div className="space-y-10">
          {MODULES.map((m) => {
            const list = activities.filter((a) => a.module === m.id)
            if (list.length === 0) return null
            return (
              <section key={m.id} aria-labelledby={`mod-${m.id}`}>
                <div className="mb-4 flex items-center gap-3 rounded-xl2 px-4 py-3" style={{ background: m.bg }}>
                  <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: m.color }} aria-hidden="true" />
                  <div>
                    <h2 id={`mod-${m.id}`} className="text-xl font-semibold">{m.name}</h2>
                    <p className="text-sm text-neutro-oscuro">{m.description}</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((a) => (
                    <ActivityCard key={a.id} activity={a} blocked={a.requiresStanding && prefs?.canStand === false} />
                  ))}
                </div>
              </section>
            )
          })}
          <p className="text-center text-xs text-neutro-oscuro">Contenido de ejemplo, pendiente de revisión profesional.</p>
        </div>
      )}
    </div>
  )
}
