import { useState, type FormEvent } from 'react'
import { NeedsField, PausesField, ScheduleField, StandField } from '../components/PreferenceFields'
import { DEFAULT_PREFS, type PrefsDraft } from '../lib/prefs'
import { Card, ErrorNote, PageTitle } from '../components/ui'
import { useApp } from '../lib/app-context'
import { isValidWindow } from '../lib/format'

export default function PreferencesPage() {
  const { backend, prefs, reloadPrefs } = useApp()
  const [draft, setDraft] = useState<PrefsDraft>(prefs ?? DEFAULT_PREFS)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<PrefsDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setStatus('idle')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (draft.needs.length === 0) return setError('Elige al menos una necesidad.')
    if (!isValidWindow(draft.workStart, draft.workEnd)) return setError('La hora de inicio debe ser anterior a la de fin.')
    setStatus('saving')
    try {
      await backend.savePreferences(draft)
      await reloadPrefs()
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      <PageTitle title="Mis preferencias" subtitle="Solo tú las ves. Las usamos para sugerirte pausas." />
      <Card>
        <h2 className="mb-4 text-xl font-semibold">¿Qué necesitas más?</h2>
        <NeedsField value={draft.needs} onChange={(needs) => set({ needs })} />
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Pausas al día</h2>
        <PausesField value={draft.pausesPerDay} onChange={(pausesPerDay) => set({ pausesPerDay })} />
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">¿Puedes ponerte de pie?</h2>
        <StandField value={draft.canStand} onChange={(canStand) => set({ canStand })} />
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Horario aproximado</h2>
        <ScheduleField start={draft.workStart} end={draft.workEnd} onChange={(workStart, workEnd) => set({ workStart, workEnd })} />
      </Card>
      {error && <ErrorNote message={error} />}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={status === 'saving'}>{status === 'saving' ? 'Guardando…' : 'Guardar'}</button>
        {status === 'saved' && <span role="status" className="text-sm text-salvia-oscuro">Preferencias guardadas</span>}
      </div>
    </form>
  )
}
