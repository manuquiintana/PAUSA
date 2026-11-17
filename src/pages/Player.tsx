import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ErrorNote, Spinner } from '../components/ui'
import { useApp } from '../lib/app-context'
import { MODULE_BY_ID } from '../lib/modules'
import { breathAt, fmtClock, locate, parseAnimation, ringCompleted, stepStartMs } from '../lib/player'
import { loadSoundPref, saveSoundPref, SoundEngine } from '../lib/sound'
import { Avatar } from '../components/Avatar'
import { type Guide, isPose, poseAt } from '../lib/avatar'
import type { Activity } from '../lib/types'

/** Reproductor a pantalla completa. Pausar y salir siempre visibles. Espacio = pausar, Esc = salir. */
export default function PlayerPage() {
  const { id } = useParams()
  const { backend, getActivities, prefs, reloadPrefs } = useApp()
  const [guide, setGuide] = useState<Guide>(prefs?.guide ?? 'mujer')
  const navigate = useNavigate()
  const location = useLocation()
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [finished, setFinished] = useState(false)
  const sessionId = useRef<Promise<string | null> | null>(null)
  const reduced = usePrefersReducedMotion()
  const [soundOn, setSoundOn] = useState(loadSoundPref)
  const [needsTap, setNeedsTap] = useState(false)
  const sound = useRef<SoundEngine | null>(null)
  const prevElapsed = useRef(0)

  useEffect(() => {
    getActivities().then((all) => setActivity(all.find((a) => a.id === id) ?? null))
  }, [getActivities, id])

  // Registrar el inicio de la pausa (una sola vez, privado del empleado).
  useEffect(() => {
    if (activity && !sessionId.current) {
      sessionId.current = backend.startSession(activity.id).catch(() => null)
    }
  }, [activity, backend])

  // Reloj: avanza con requestAnimationFrame mientras está en marcha.
  useEffect(() => {
    if (!activity || !running || finished) return
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      // Si la pestaña estuvo oculta, no "saltamos" pasos: como mucho avanzamos 1 s.
      const dt = Math.min(1000, t - last)
      last = t
      setElapsed((e) => e + dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [activity, running, finished])

  // Sonido ambiente de relajación durante toda la pausa (con fundidos de entrada y salida).
  useEffect(() => {
    if (!activity) return
    const engine = new SoundEngine(!loadSoundPref())
    sound.current = engine
    engine.unlock().then((ok) => {
      if (sound.current !== engine) return
      if (ok) engine.startAmbient(activity.module)
      else setNeedsTap(true) // el navegador pide un toque antes de reproducir sonido
    })
    return () => {
      engine.close()
      if (sound.current === engine) sound.current = null
    }
  }, [activity])

  useEffect(() => {
    sound.current?.setAmbientPaused(!running)
  }, [running])

  // Burbuja cuando se completa el anillo exterior de un paso.
  useEffect(() => {
    if (activity && ringCompleted(activity.steps, prevElapsed.current, elapsed)) sound.current?.pop()
    prevElapsed.current = elapsed
  }, [elapsed, activity])

  /** Activa el audio tras un toque si el navegador lo había bloqueado. */
  const ensureSound = useCallback(async () => {
    const engine = sound.current
    if (!engine || !activity || engine.isRunning) return
    if (await engine.unlock()) {
      engine.startAmbient(activity.module)
      setNeedsTap(false)
    }
  }, [activity])

  const toggleSound = useCallback(() => {
    const on = needsTap ? true : !soundOn
    setSoundOn(on)
    saveSoundPref(on)
    sound.current?.setMuted(!on)
    void ensureSound()
  }, [needsTap, soundOn, ensureSound])

  /** Cambia la guía (mujer / hombre) y la guarda en las preferencias. */
  const toggleGuide = useCallback(() => {
    const next: Guide = guide === 'mujer' ? 'hombre' : 'mujer'
    setGuide(next)
    if (prefs) {
      const { onboardedAt: _omit, ...draft } = prefs
      void _omit
      backend.savePreferences({ ...draft, guide: next }).then(reloadPrefs).catch(() => undefined)
    }
  }, [guide, prefs, backend, reloadPrefs])

  const pos = activity ? locate(activity.steps, elapsed) : null

  useEffect(() => {
    if (pos?.done && !finished) {
      setFinished(true)
      sound.current?.stopAmbient(3)
      sessionId.current?.then((sid) => (sid ? backend.completeSession(sid) : undefined)).catch(() => undefined)
    }
  }, [pos?.done, finished, backend])

  const exit = useCallback(() => {
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }, [location.key, navigate])

  const goTo = useCallback((index: number) => {
    if (!activity) return
    void ensureSound()
    const i = Math.max(0, Math.min(activity.steps.length - 1, index))
    setElapsed(stepStartMs(activity.steps, i))
  }, [activity, ensureSound])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return
      if (e.key === 'Escape') exit()
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        void ensureSound()
        setRunning((r) => !r)
      } else if (e.key === 'ArrowRight' && pos) goTo(pos.index + 1)
      else if (e.key === 'ArrowLeft' && pos) goTo(pos.index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exit, goTo, pos, finished, ensureSound])

  if (activity === undefined) return <div className="fixed inset-0 bg-fondo"><Spinner /></div>
  if (activity === null || !pos) return <div className="p-6"><ErrorNote message="No encontramos esta pausa." /></div>

  const m = MODULE_BY_ID[activity.module]
  const step = activity.steps[pos.index]
  const stepLen = step.seconds * 1000

  if (finished) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center" style={{ background: m.bg }}>
        <span className="flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white" style={{ background: m.color }} aria-hidden="true">✓</span>
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Pausa completada</h1>
          <p className="mt-2 text-[#3E4A4E]">Gracias por regalarte estos {activity.durationMin} minutos.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">Volver al inicio</Link>
          <Link to="/pausas" className="btn-outline">Ver otras pausas</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 flex flex-col" style={{ background: m.bg }} aria-label={`Pausa: ${activity.title}`}>
      <header className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
        <button type="button" onClick={exit} className="btn bg-white/70 px-4 hover:bg-white" aria-label="Salir de la pausa">
          <span aria-hidden="true">✕</span> Salir
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-titulo text-lg font-semibold">{activity.title}</p>
          <p className="text-xs text-[#3E4A4E]">{m.name} · Paso {pos.index + 1} de {activity.steps.length}
            <span className="tabular-nums sm:hidden"> · {fmtClock(pos.totalRemainingMs)}</span></p>
        </div>
        <div className="flex items-center justify-end gap-2 sm:w-[160px]">
          <span className="hidden text-sm tabular-nums text-[#3E4A4E] sm:inline" aria-label="Tiempo restante">
            {fmtClock(pos.totalRemainingMs)}
          </span>
          {activity.steps.some((st) => isPose(st.pose)) && (
            <button type="button" onClick={toggleGuide}
              aria-label={`Guía: ${guide === 'mujer' ? 'mujer' : 'hombre'}. Cambiar a ${guide === 'mujer' ? 'hombre' : 'mujer'}`}
              title={guide === 'mujer' ? 'Guía: mujer · cambiar a hombre' : 'Guía: hombre · cambiar a mujer'}
              className="btn min-w-[48px] overflow-hidden bg-white/70 px-1 hover:bg-white">
              <span className="block h-9 w-9 overflow-hidden rounded-full bg-salvia-claro">
                <Avatar guide={guide} crop="cara" className="h-full w-full" />
              </span>
            </button>
          )}
          <button type="button" onClick={toggleSound} aria-pressed={soundOn && !needsTap}
            aria-label={needsTap ? 'Activar el sonido' : soundOn ? 'Silenciar el sonido' : 'Activar el sonido'}
            title={needsTap ? 'Toca para activar el sonido' : soundOn ? 'Silenciar' : 'Activar sonido'}
            className={`btn min-w-[48px] px-3 ${needsTap ? 'bg-salvia-oscuro text-white' : 'bg-white/70 hover:bg-white'}`}>
            <SoundIcon on={soundOn && !needsTap} />
            {needsTap && <span className="text-sm">Activar sonido</span>}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <Visual code={step.animation} stepElapsed={pos.stepElapsedMs} progress={pos.stepElapsedMs / stepLen}
          color={m.color} running={running} reduced={reduced} pose={step.pose} guide={guide} />
        <p className="max-w-xl font-titulo text-2xl font-medium leading-snug md:text-3xl" aria-live="polite">{step.text}</p>
      </div>

      <footer className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-8">
        <div className="mx-auto flex max-w-xl gap-1" aria-hidden="true">
          {activity.steps.map((s, i) => (
            <span key={i} className="h-1.5 overflow-hidden rounded-full bg-white/70" style={{ flex: s.seconds }}>
              <span className="block h-full rounded-full" style={{
                background: m.color,
                width: i < pos.index ? '100%' : i === pos.index ? `${(pos.stepElapsedMs / stepLen) * 100}%` : '0%',
              }} />
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-center gap-4">
          <button type="button" className="btn min-w-[48px] bg-white/60 px-4 text-xl hover:bg-white disabled:opacity-40" onClick={() => goTo(pos.index - 1)}
            disabled={pos.index === 0} aria-label="Paso anterior">‹</button>
          <button type="button" className="btn-primary min-w-[160px] text-lg" onClick={() => { void ensureSound(); setRunning((r) => !r) }}
            aria-label={running ? 'Pausar' : 'Reanudar'}>
            {running ? 'Pausar' : 'Reanudar'}
          </button>
          <button type="button" className="btn min-w-[48px] bg-white/60 px-4 text-xl hover:bg-white disabled:opacity-40" onClick={() => goTo(pos.index + 1)}
            aria-label="Siguiente paso" disabled={pos.index === activity.steps.length - 1}>›</button>
        </div>
        <p className="mt-3 text-center text-[11px] text-[#5E686D]">Contenido de ejemplo, pendiente de revisión profesional · Espacio: pausar · Esc: salir</p>
      </footer>
    </main>
  )
}

function Visual({ code, stepElapsed, progress, color, running, reduced, pose, guide }: {
  code: string; stepElapsed: number; progress: number; color: string; running: boolean; reduced: boolean
  pose?: string | null; guide: Guide
}) {
  const anim = parseAnimation(code)
  if (isPose(pose)) return <AvatarVisual anim={anim} pose={pose} guide={guide} stepElapsed={stepElapsed} progress={progress} color={color} reduced={reduced} />
  const size = 'min(62vw, 300px)'
  const R = 47
  const C = 2 * Math.PI * R
  const play = { animationPlayState: running ? 'running' : 'paused' } as const

  let inner: React.ReactNode
  let label: React.ReactNode = null
  if (anim.kind === 'breath') {
    const b = breathAt(anim.phases, stepElapsed)
    inner = (
      <span className="absolute inset-[12%] rounded-full" style={{
        background: color, opacity: 0.85,
        transform: `scale(${reduced ? 0.8 : b.scale})`, transition: reduced ? 'none' : 'transform 80ms linear',
      }} />
    )
    label = (
      <span className="relative z-10 text-center text-tinta">
        <span className="block text-xl font-semibold md:text-2xl">{b.label}</span>
        <span className="block text-sm tabular-nums">{b.secondsLeft}</span>
      </span>
    )
  } else if (anim.kind === 'move') {
    inner = (
      <>
        <span className="absolute inset-[18%] rounded-full" style={{ background: color, opacity: 0.25 }} />
        <span className={`absolute inset-[8%] ${reduced ? '' : 'animate-orbit'}`} style={play}>
          <span className="absolute left-1/2 top-0 h-[14%] w-[14%] -translate-x-1/2 rounded-full" style={{ background: color }} />
        </span>
      </>
    )
  } else if (anim.kind === 'pulse') {
    inner = (
      <>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`absolute inset-[20%] rounded-full border-4 ${reduced ? '' : 'animate-ripple'}`}
            style={{ borderColor: color, animationDelay: `${i * -1.3}s`, ...play }} />
        ))}
        <span className="absolute inset-[38%] rounded-full" style={{ background: color }} />
      </>
    )
  } else if (anim.kind === 'eyes') {
    inner = (
      <span className={`absolute inset-[30%] rounded-full ${reduced ? '' : 'animate-far'}`} style={{ background: color, ...play }} />
    )
  } else {
    inner = (
      <span className={`absolute inset-[16%] rounded-full ${reduced ? '' : 'animate-breathe'}`}
        style={{ background: color, opacity: 0.6, ...play }} />
    )
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} aria-hidden={!label}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, progress))} />
      </svg>
      {inner}
      {label}
    </div>
  )
}

/** Círculo con el avatar guía haciendo el movimiento del paso. */
function AvatarVisual({ anim, pose, guide, stepElapsed, progress, color, reduced }: {
  anim: ReturnType<typeof parseAnimation>; pose: string; guide: Guide; stepElapsed: number; progress: number
  color: string; reduced: boolean
}) {
  const size = 'min(68vw, 320px)'
  const R = 47
  const C = 2 * Math.PI * R
  const b = anim.kind === 'breath' ? breathAt(anim.phases, stepElapsed) : null
  const breath = b ? (b.scale - 0.55) / 0.45 : undefined
  // Con "reducir movimiento", mostramos la postura objetivo quieta.
  const joints = reduced ? poseAt(pose, 4000) : poseAt(pose, stepElapsed, breath)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, progress))} />
      </svg>
      <span className="absolute inset-[5%] rounded-full" style={{ background: color, opacity: 0.22 }} />
      {b && (
        <span className="absolute inset-[5%] rounded-full" style={{
          background: color, opacity: 0.35, transform: `scale(${reduced ? 0.85 : 0.7 + b.scale * 0.3})`,
        }} />
      )}
      <Avatar guide={guide} joints={joints} className="absolute inset-[5%] h-[90%] w-[90%]" />
      {b && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-tinta shadow-sm"
          aria-live="polite">
          {b.label} · <span className="tabular-nums">{b.secondsLeft}</span>
        </span>
      )}
    </div>
  )
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5m0-5-5 5" />}
    </svg>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}
