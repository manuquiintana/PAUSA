import type { ReactNode } from 'react'

export function Logo({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? '#F7F4EE' : '#6F9A82'} />
        <circle cx="32" cy="32" r="14" fill="none" stroke={light ? '#6F9A82' : '#F7F4EE'} strokeWidth="5" />
        <circle cx="32" cy="32" r="4" fill="#E58F6E" />
      </svg>
      <span className={`font-titulo text-xl font-semibold ${light ? 'text-white' : 'text-tinta'}`}>Pausa</span>
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 md:p-6 ${className}`}>{children}</section>
}

/** Marca de funcionalidad no terminada. Nunca se muestra un botón que simule funcionar. */
export function Proximamente({ label = 'Próximamente' }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-coral-claro px-3 py-1 text-xs font-medium text-[#9A4A2C]">
      {label}
    </span>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-neutro-oscuro">{subtitle}</p>}
    </header>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-neutro-oscuro" role="status">
      <span className="animate-breathe block h-14 w-14 rounded-full bg-salvia/30 ring-8 ring-salvia/10" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-coral-claro px-4 py-3 text-sm text-[#7A3A22]">
      {message}
    </p>
  )
}
