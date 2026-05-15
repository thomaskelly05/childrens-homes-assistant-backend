import { ReactNode } from 'react'
import Link from 'next/link'

import { OrbStandaloneSidebar } from './orb-standalone-sidebar'

export function OrbStandaloneShell({ children }: { children: ReactNode }) {
  return (
    <main className="orb-standalone-atmosphere relative min-h-screen overflow-hidden text-white">
      <div className="orb-screen-edge-pulse" data-orb-state="idle" aria-hidden />
      <div className="pointer-events-none absolute inset-0 orb-neural-haze" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-[-18rem] h-[36rem] rounded-full bg-cyan-300/10 blur-3xl" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 md:px-8">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <Link href="/assistant" className="orb-presence-pill px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em]">
            ORB powered by IndiCare
          </Link>
          <details className="group relative z-50">
            <summary className="orb-quiet-action list-none rounded-full px-4 py-3 text-sm font-black text-slate-100 marker:hidden">
              Controls
            </summary>
            <div className="fixed right-4 top-20 w-[min(22rem,calc(100vw-2rem))] md:right-8">
              <OrbStandaloneSidebar />
            </div>
          </details>
        </header>
        <section className="mx-auto flex w-full max-w-7xl flex-1 items-center py-6 md:py-10">
          <div className="w-full">{children}</div>
        </section>
      </div>
    </main>
  )
}

