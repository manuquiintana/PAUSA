import { useEffect, useState, type FormEvent } from 'react'
import { Card, ErrorNote, PageTitle, Proximamente, Spinner } from '../components/ui'
import { TimeField } from '../components/TimeField'
import { WellbeingPanel } from '../components/WellbeingPanel'
import { useApp } from '../lib/app-context'
import { hhmm, isValidWindow } from '../lib/format'
import type { TeamSummary } from '../lib/types'

export default function CompanyPage() {
  const { backend, me } = useApp()
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)

  useEffect(() => {
    backend.listTeams().then(setTeams).catch(() => setTeams([]))
  }, [backend])

  return (
    <div className="space-y-6">
      <PageTitle title={me.company.name} subtitle="Gestión de la empresa e indicadores globales." />

      <Card>
        <h2 className="mb-4 text-2xl font-semibold">Bienestar en toda la empresa</h2>
        <WellbeingPanel loadKey="company" load={(p, o) => backend.companyWellbeing(p, o)} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Equipos</h2>
            <div className="flex flex-wrap gap-2"><Proximamente label="Invitar empleados · próximamente" /><Proximamente label="Asignar managers · próximamente" /></div>
          </div>
          {!teams ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-neutro-oscuro">
                  <tr className="border-b border-[#E9E3D8]">
                    <th className="py-2 pr-4 font-medium">Equipo</th>
                    <th className="py-2 pr-4 font-medium">Manager</th>
                    <th className="py-2 text-right font-medium">Personas</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="border-b border-[#F0EBE2] last:border-0">
                      <td className="py-3 pr-4 font-medium">{t.name}</td>
                      <td className="py-3 pr-4">{t.managerName ?? <span className="text-neutro-oscuro">Sin asignar</span>}</td>
                      <td className="py-3 text-right tabular-nums">{t.memberCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <PauseWindowCard />
      </div>
    </div>
  )
}

function PauseWindowCard() {
  const { backend, me, reloadMe } = useApp()
  const [start, setStart] = useState(hhmm(me.company.pauseWindowStart))
  const [end, setEnd] = useState(hhmm(me.company.pauseWindowEnd))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidWindow(start, end)) {
      setError('La hora de inicio debe ser anterior a la de fin.')
      return
    }
    setStatus('saving')
    try {
      await backend.updatePauseWindow(start, end)
      await reloadMe()
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setStatus('idle')
    }
  }

  return (
    <Card className="lg:col-span-2">
      <h2 className="text-2xl font-semibold">Ventana de pausas</h2>
      <p className="mt-1 text-sm text-neutro-oscuro">Los recordatorios solo se enviarán dentro de este horario.</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Desde" value={start} onChange={(v) => { setStart(v); setStatus('idle') }} />
          <TimeField label="Hasta" value={end} onChange={(v) => { setEnd(v); setStatus('idle') }} />
        </div>
        {error && <ErrorNote message={error} />}
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={status === 'saving'}>{status === 'saving' ? 'Guardando…' : 'Guardar'}</button>
          {status === 'saved' && <span className="text-sm text-salvia-oscuro" role="status">Guardado</span>}
        </div>
        <p className="text-xs text-neutro-oscuro">El envío de recordatorios (Web Push) llega en una fase posterior.</p>
      </form>
    </Card>
  )
}
