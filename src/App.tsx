import { useCallback, useEffect, useMemo, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorNote, Logo, Spinner } from './components/ui'
import { AppContext, type AppState } from './lib/app-context'
import { createBackend } from './lib/backend'
import type { DataBackend, Me } from './lib/types'
import CompanyPage from './pages/Company'
import HistoryPage from './pages/History'
import HomePage from './pages/Home'
import LoginPage from './pages/Login'
import MyTeamPage from './pages/MyTeam'

export default function App() {
  const [backend, setBackend] = useState<DataBackend | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMe = useCallback(async (b: DataBackend) => {
    const uid = await b.currentUserId()
    setMe(uid ? await b.getMe() : null)
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
      reloadMe: () => loadMe(backend),
      signOut: async () => {
        await backend.signOut()
        setMe(null)
      },
    }
  }, [backend, me, loadMe])

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

  return (
    <AppContext.Provider value={state}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/historico" element={<HistoryPage />} />
            {(me!.role === 'manager' || me!.role === 'admin') && <Route path="/equipo" element={<MyTeamPage />} />}
            {me!.role === 'admin' && <Route path="/empresa" element={<CompanyPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  )
}
