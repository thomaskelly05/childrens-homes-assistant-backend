import { ReactNode } from 'react'
import Link from 'next/link'

import { OrbStandaloneSidebar } from './orb-standalone-sidebar'

export function OrbStandaloneShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_8%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_18%_78%,rgba(168,85,247,0.15),transparent_28%),radial-gradient(circle_at_84%_72%,rgba(251,146,60,0.10),transparent_24%),linear-gradient(180deg,#02040c,#070b18_48%,#0d1022)] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-[-18rem] h-[36rem] rounded-full bg-cyan-300/10 blur-3xl" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 md:px-8">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <Link href="/assistant" className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur">
            ORB powered by IndiCare
          </Link>
          <details className="group relative z-50">
            <summary className="list-none rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-100 backdrop-blur marker:hidden">
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

