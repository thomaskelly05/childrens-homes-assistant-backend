import { ReactNode } from 'react'

import { OrbStandaloneSidebar } from './orb-standalone-sidebar'

export function OrbStandaloneShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,#050610,#111326)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[310px_minmax(0,1fr)]">
        <OrbStandaloneSidebar />
        <section className="min-w-0 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </section>
      </div>
    </main>
  )
}

