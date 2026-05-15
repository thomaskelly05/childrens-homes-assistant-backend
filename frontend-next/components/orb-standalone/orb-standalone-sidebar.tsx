import Link from 'next/link'

import { standaloneOrbBrains } from '@/lib/orb/content/prompts'

export function OrbStandaloneSidebar() {
  return (
    <aside className="border-white/10 bg-black/25 p-4 text-white backdrop-blur lg:border-r">
      <Link href="/assistant" className="block rounded-3xl px-3 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">ORB powered by IndiCare.</p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.05em]">Care. Connect. Empower.</h1>
      </Link>
      <nav className="mt-4 grid gap-2" aria-label="ORB standalone modes">
        {standaloneOrbBrains.map((brain) => (
          <button key={brain} type="button" className="rounded-2xl bg-white/5 px-4 py-3 text-left text-sm font-black text-slate-200 hover:bg-white/10">
            {brain}
          </button>
        ))}
      </nav>
      <div className="mt-5 rounded-3xl border border-cyan-200/20 bg-cyan-200/10 p-4 text-sm leading-6 text-cyan-50">
        Standalone ORB has no live OS record, active child, chronology, home or staff access.
      </div>
    </aside>
  )
}

