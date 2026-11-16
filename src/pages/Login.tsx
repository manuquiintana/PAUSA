import { useState, type FormEvent } from 'react'
import { ErrorNote, Logo } from '../components/ui'
import { ROLE_LABEL } from '../lib/format'
import type { DataBackend } from '../lib/types'

export default function LoginPage({ backend, onSignedIn }: { backend: DataBackend; onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await onSignedIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(() => backend.signInWithPassword(email, password))
  }

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-salvia p-12 text-white md:flex">
        <Logo size={36} light />
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
            Tu bienestar también forma parte de tu jornada laboral.
          </h1>
          <p className="mt-5 text-lg text-white/85">
            Pausas guiadas de 5 a 10 minutos que encajan en tu día, y un momento para notar cómo empiezas y terminas.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/70">Lo que anotas es tuyo. Tu empresa solo ve datos agregados y anónimos de equipos de 5 o más personas.</p>
        <span aria-hidden="true" className="animate-breathe absolute -bottom-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-white/10" />
        <span aria-hidden="true" className="animate-breathe absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 [animation-delay:-4s]" />
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 md:hidden"><Logo size={36} /></div>
          <h2 className="text-3xl font-semibold">Entrar</h2>
          <p className="mt-2 text-neutro-oscuro">Accede con el email de tu empresa.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input className="input" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.es" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Contraseña</span>
              <input className="input" type="password" autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <ErrorNote message={error} />}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>

          {backend.demoPersonas && backend.signInAsDemo && (
            <div className="mt-10">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E2DBCE]" />
                <span className="text-xs font-medium uppercase tracking-wide text-neutro-oscuro">Modo demo · entra como</span>
                <span className="h-px flex-1 bg-[#E2DBCE]" />
              </div>
              <ul className="mt-4 space-y-2">
                {backend.demoPersonas.map((p) => (
                  <li key={p.userId}>
                    <button type="button" disabled={busy}
                      onClick={() => run(() => backend.signInAsDemo!(p.userId))}
                      className="card flex min-h-[56px] w-full items-center gap-4 px-4 py-3 text-left transition hover:border-salvia hover:bg-white">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-salvia-claro font-titulo font-semibold text-[#2F4A3C]">
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{p.name} <span className="text-xs font-normal text-neutro-oscuro">· {ROLE_LABEL[p.role]}</span></span>
                        <span className="block truncate text-sm text-neutro-oscuro">{p.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-neutro-oscuro">
                También puedes entrar con el formulario: cualquier email demo (p. ej. ana@demo-logistica.es) y la contraseña PausaDemo2026!
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
