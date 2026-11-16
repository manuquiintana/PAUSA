import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../lib/app-context'
import { ROLE_LABEL } from '../lib/format'
import { Logo } from './ui'

interface NavItem { to: string; label: string; icon: ReactNode }

const icons = {
  home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
  history: <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4.5l3 2" />,
  team: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c0-3 2.7-5 6-5s6 2 6 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3 2.3 3 5" />,
  company: <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" />,
}
const Icon = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)

export function Layout({ children }: { children: ReactNode }) {
  const { me, backend, signOut } = useApp()

  const items: NavItem[] = [
    { to: '/', label: 'Inicio', icon: <Icon d={icons.home} /> },
    { to: '/historico', label: 'Mi histórico', icon: <Icon d={icons.history} /> },
  ]
  if (me.role === 'manager' || me.role === 'admin') items.push({ to: '/equipo', label: 'Equipos', icon: <Icon d={icons.team} /> })
  if (me.role === 'admin') items.push({ to: '/empresa', label: 'Empresa', icon: <Icon d={icons.company} /> })

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
      isActive ? 'bg-salvia-claro text-[#2F4A3C]' : 'text-neutro-oscuro hover:bg-black/5 hover:text-tinta'}`
  const mobileCls = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
      isActive ? 'text-salvia-oscuro' : 'text-neutro-oscuro'}`

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {backend.kind === 'demo' && (
        <div className="bg-[#2F4A3C] px-4 py-2 text-center text-xs text-white/90">
          Modo demo · datos de ejemplo en tu navegador, con las mismas reglas de privacidad que la versión real
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-[#E9E3D8] bg-fondo/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-8">
          <Logo />
          <nav aria-label="Principal" className="ml-6 hidden gap-1 md:flex">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end className={linkCls}>{i.icon}{i.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{me.fullName}</p>
              <p className="text-xs text-neutro-oscuro">{ROLE_LABEL[me.role]} · {me.company.name}</p>
            </div>
            <button type="button" className="btn-ghost text-sm" onClick={signOut}>Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[#E9E3D8] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end className={mobileCls}>{i.icon}{i.label}</NavLink>
        ))}
      </nav>
    </div>
  )
}
