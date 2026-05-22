import Link from 'next/link'
import { ClipboardCheck, ClipboardPlus, Mic2, ShieldAlert } from 'lucide-react'

import { CARE_HUB_HERO_ACTIONS } from '@/components/command-centre/care-hub-routes'

const iconByLabel = {
  'Start shift handover': ClipboardCheck,
  'Record daily note': ClipboardPlus,
  'Record incident': ShieldAlert,
  'Ask ORB': Mic2
} as const

export function CareHubStartHero({ selectedYoungPersonId }: { selectedYoungPersonId?: string }) {
  const actions = CARE_HUB_HERO_ACTIONS({ selectedYoungPersonId })

  return (
    <section
      data-testid="care-hub-start-hero"
      className="rounded-[36px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-white/10 md:p-8"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Care Hub</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white md:text-4xl">Today in the home</h1>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
        Start with the live picture, then record what matters. ORB can help at any point.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = iconByLabel[action.label as keyof typeof iconByLabel]
          return (
            <Link
              key={action.label}
              href={action.href}
              aria-label={action.ariaLabel}
              className="group flex min-h-[88px] flex-col justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-4 transition hover:border-cyan-200/40 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
            >
              <span className="flex items-center gap-2 text-sm font-black text-white">
                <Icon className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />
                {action.label}
              </span>
              <span className="mt-2 text-xs font-semibold leading-5 text-slate-300">{action.description}</span>
              <span className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200 group-hover:text-white">Open →</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
