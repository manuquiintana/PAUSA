import { Link } from 'react-router-dom'
import { NextPauseCard } from '../components/NextPauseCard'
import { Card, Proximamente } from '../components/ui'
import { useApp } from '../lib/app-context'
import { firstName, greeting } from '../lib/format'
import { MODULES } from '../lib/modules'

export default function HomePage() {
  const { me } = useApp()

  return (
    <div className="space-y-6">
      <header>
        <p className="text-neutro-oscuro">{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{greeting()}, {firstName(me.fullName)}</h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">¿Cómo te sientes hoy?</h2>
              <p className="mt-1 text-neutro-oscuro">Un toque del 1 al 10. Es voluntario y solo lo ves tú.</p>
            </div>
            <Proximamente label="Fase 3" />
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="flex h-11 items-center justify-center rounded-xl border border-dashed border-[#D9D2C5] text-neutro">
                {i + 1}
              </span>
            ))}
          </div>
        </Card>

        <NextPauseCard />
      </div>

      <section aria-labelledby="modulos">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="modulos" className="text-2xl font-semibold">Tipos de pausa</h2>
          <Link to="/pausas" className="text-sm font-medium text-salvia-oscuro underline-offset-4 hover:underline">Ver todas</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {MODULES.map((m) => (
            <Link to="/pausas" key={m.id} className="card overflow-hidden transition hover:border-salvia">
              <div className="flex h-16 items-center justify-center sm:h-20" style={{ background: m.bg }}>
                <span className="h-10 w-10 rounded-full" style={{ background: m.color }} aria-hidden="true" />
              </div>
              <div className="p-4">
                <h3 className="font-titulo text-base font-semibold leading-snug sm:text-lg">{m.name}</h3>
                <p className="mt-0.5 text-xs font-medium" style={{ color: m.color === '#E58F6E' ? '#A8573A' : '#4F7562' }}>{m.minutes}</p>
                <p className="mt-2 text-sm text-neutro-oscuro">{m.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <PrivacyCard />
    </div>
  )
}

export function PrivacyCard() {
  return (
    <Card className="bg-[#EEF3EF]">
      <h2 className="text-xl font-semibold">Qué ve tu empresa y qué no</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-texto text-sm font-semibold uppercase tracking-wide text-salvia-oscuro">Solo tú ves</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>• Tus puntuaciones de inicio y fin de día</li>
            <li>• Tus notas libres</li>
            <li>• Tus preferencias y las pausas que haces</li>
          </ul>
        </div>
        <div>
          <h3 className="font-texto text-sm font-semibold uppercase tracking-wide text-[#A8573A]">Tu empresa ve</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>• Medias del equipo, nunca datos de una persona</li>
            <li>• Solo si al menos 5 personas aportaron datos en el periodo</li>
            <li>• Nunca quién ha hecho o no ha hecho check-in</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
