import { useState } from 'react'
import { NeedsField, PausesField, ScheduleField, StandField } from '../components/PreferenceFields'
import { DEFAULT_PREFS, type PrefsDraft } from '../lib/prefs'
import { ErrorNote, Logo } from '../components/ui'
import { useApp } from '../lib/app-context'
import { firstName, isValidWindow } from '../lib/format'
import { PrivacyCard } from './Home'

const TOTAL = 4

/** Onboarding de 4 preguntas (menos de un minuto) + qué ve la empresa y qué no. */
export default function OnboardingPage() {
  const { backend, me, prefs, reloadPrefs, signOut } = useApp()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<PrefsDraft>(prefs ? { ...DEFAULT_PREFS, ...prefs, needs: prefs.needs } : DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<PrefsDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const next = () => setStep((s) => s + 1)

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      await backend.savePreferences(draft)
      await reloadPrefs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  const questions = [
    {
      title: '¿Qué necesitas más en tu jornada?',
      hint: 'Elige una o varias. Lo usaremos para sugerirte pausas.',
      body: <NeedsField value={draft.needs} onChange={(needs) => set({ needs })} />,
      canNext: draft.needs.length > 0,
    },
    {
      title: '¿Cuántas pausas te gustaría hacer al día?',
      hint: 'Puedes cambiarlo cuando quieras.',
      body: <PausesField value={draft.pausesPerDay} onChange={(pausesPerDay) => { set({ pausesPerDay }); next() }} />,
      canNext: true,
    },
    {
      title: '¿Puedes ponerte de pie durante tus pausas?',
      hint: 'Si no, solo te propondremos ejercicios sentado.',
      body: <StandField value={draft.canStand} onChange={(canStand) => { set({ canStand }); next() }} />,
      canNext: true,
    },
    {
      title: '¿Cuál es tu horario aproximado?',
      hint: 'Repartiremos tus pausas a lo largo de la jornada.',
      body: <ScheduleField start={draft.workStart} end={draft.workEnd} onChange={(workStart, workEnd) => set({ workStart, workEnd })} />,
      canNext: isValidWindow(draft.workStart, draft.workEnd),
    },
  ]
  const q = questions[step]

  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-5">
        <Logo />
        <button type="button" className="btn-ghost text-sm" onClick={signOut}>Salir</button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-10">
        {step === 0 && (
          <p className="mb-2 text-neutro-oscuro">Hola, {firstName(me.fullName)}. Cuatro preguntas rápidas, menos de un minuto.</p>
        )}

        {q ? (
          <>
            <div className="mb-8 flex items-center gap-3" aria-label={`Pregunta ${step + 1} de ${TOTAL}`}>
              {questions.map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-salvia' : 'bg-[#E2DBCE]'}`} />
              ))}
              <span className="text-sm tabular-nums text-neutro-oscuro">{step + 1}/{TOTAL}</span>
            </div>
            <h1 className="text-3xl font-semibold md:text-4xl">{q.title}</h1>
            <p className="mt-2 text-neutro-oscuro">{q.hint}</p>
            <div className="mt-8">{q.body}</div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-10">
              <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Atrás</button>
              <button type="button" className="btn-primary min-w-[140px]" disabled={!q.canNext} onClick={next}>Continuar</button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold md:text-4xl">Antes de empezar: tu privacidad</h1>
            <p className="mt-2 text-neutro-oscuro">
              Pausa es para ti. Tu empresa la ofrece, pero no puede ver lo que haces ni lo que anotas.
            </p>
            <div className="mt-6"><PrivacyCard /></div>
            {error && <div className="mt-4"><ErrorNote message={error} /></div>}
            <div className="mt-auto flex items-center justify-between gap-3 pt-10">
              <button type="button" className="btn-ghost" onClick={() => setStep(TOTAL - 1)}>Atrás</button>
              <button type="button" className="btn-primary min-w-[140px]" disabled={busy} onClick={finish}>
                {busy ? 'Guardando…' : 'Empezar'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
