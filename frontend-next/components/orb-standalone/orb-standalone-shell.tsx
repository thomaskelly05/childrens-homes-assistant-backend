import { ReactNode } from 'react'
import Link from 'next/link'

export function OrbStandaloneShell({ children }: { children: ReactNode }) {
  return (
    <main className="orb-standalone-atmosphere relative min-h-screen overflow-hidden text-white">
      <div className="orb-screen-edge-pulse" data-orb-state="idle" aria-hidden />
      <div className="pointer-events-none absolute inset-0 orb-neural-haze" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-[-18rem] h-[36rem] rounded-full bg-cyan-300/10 blur-3xl" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 md:px-8">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <Link href="/orb" className="orb-presence-pill px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em]">
            ORB Residential
          </Link>
          <p className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 md:block">
            ORB Residential
          </p>
        </header>
        <section className="mx-auto flex w-full max-w-7xl flex-1 items-center py-6 md:py-10">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  )
}

