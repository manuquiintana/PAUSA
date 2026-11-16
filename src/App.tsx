import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorNote, Logo, Spinner } from './components/ui'
import { AppContext, type AppState } from './lib/app-context'
import { createBackend } from './lib/backend'
import type { Activity, DataBackend, Me, Preferences } from './lib/types'
import ActivityDetailPage from './pages/ActivityDetail'
import CatalogPage from './pages/Catalog'
import CompanyPage from './pages/Company'
import HistoryPage from './pages/History'
import HomePage from './pages/Home'
import LoginPage from './pages/Login'
import MyTeamPage from './pages/MyTeam'
import OnboardingPage from './pages/Onboarding'
import PlayerPage from './pages/Player'
import PreferencesPage from './pages/Preferences'

export default function App() {
  const [backend, setBackend] = useState<DataBackend | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activitiesRef = useRef<Promise<Activity[]> | null>(null)

  const loadMe = useCallback(async (b: DataBackend) => {
    const uid = await b.currentUserId()
    if (!uid) {
      setMe(null)
      setPrefs(null)
      return
    }
    const [m, p] = await Promise.all([b.getMe(), b.getPreferences()])
    setPrefs(p)
    setMe(m)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const b = await createBackend()
        if (!alive) return
        setBackend(b)
        await loadMe(b)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo iniciar la app')
      } finally {
        if (alive) setBooting(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [loadMe])

  const state = useMemo<AppState | null>(() => {
    if (!backend || !me) return null
    return {
      backend,
      me,
      prefs,
      reloadMe: () => loadMe(backend),
      reloadPrefs: async () => setPrefs(await backend.getPreferences()),
      getActivities: () => (activitiesRef.current ??= backend.listActivities()),
      signOut: async () => {
        await backend.signOut()
        setMe(null)
        setPrefs(null)
      },
    }
  }, [backend, me, prefs, loadMe])

  if (booting || error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
        <Logo size={40} />
        {error ? <ErrorNote message={error} /> : <Spinner label="Preparando tu espacio…" />}
      </main>
    )
  }

  if (!state) {
    return <LoginPage backend={backend!} onSignedIn={() => loadMe(backend!)} />
  }

  // Primer acceso: onboarding de 4 preguntas antes de entrar.
  if (!state.prefs?.onboardedAt) {
    return (
      <AppContext.Provider value={state}>
        <OnboardingPage />
      </AppContext.Provider>
    )
  }

  const role = state.me.role
  return (
    <AppContext.Provider value={state}>
      <HashRouter>
        <Routes>
          <Route path="/reproducir/:id" element={<PlayerPage />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/pausas" element={<CatalogPage />} />
                  <Route path="/pausas/:id" element={<ActivityDetailPage />} />
                  <Route path="/preferencias" element={<PreferencesPage />} />
                  <Route path="/historico" element={<HistoryPage />} />
                  {(role === 'manager' || role === 'admin') && <Route path="/equipo" element={<MyTeamPage />} />}
                  {role === 'admin' && <Route path="/empresa" element={<CompanyPage />} />}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  )
}
