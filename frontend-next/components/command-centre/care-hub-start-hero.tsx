import Link from 'next/link'
import { ClipboardCheck, ClipboardList, ClipboardPlus, Mic2, ShieldAlert } from 'lucide-react'

import { CARE_HUB_HERO_ACTIONS, CARE_HUB_HERO_ORB_HINTS } from '@/components/command-centre/care-hub-routes'
import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'

const iconByLabel = {
  'Record something': ClipboardList,
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
      className="os-hero rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-[0_18px_52px_rgba(15,23,42,0.16)] ring-1 ring-white/10 md:p-6"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Care Hub · ORB connected</p>
      <h1 className="mt-1.5 text-2xl font-black tracking-[-0.05em] text-white md:text-3xl">Today in the home</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
        Start with what needs attention, then record what matters. ORB is here to guide the shift.
      </p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = iconByLabel[action.label as keyof typeof iconByLabel]
          const orbHint = CARE_HUB_HERO_ORB_HINTS[action.label]
          return (
            <article
              key={action.label}
              className="os-action-card group flex min-h-[96px] flex-col rounded-2xl border border-white/10 bg-white/10 px-3.5 py-3.5 transition hover:border-cyan-200/40 hover:bg-white/15"
            >
              <Link
                href={action.href}
                aria-label={action.ariaLabel}
                className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                <span className="flex items-center gap-2 text-sm font-black text-white">
                  <Icon className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden />
                  {action.label}
                </span>
                <span className="mt-1.5 flex-1 text-xs font-semibold leading-5 text-slate-300">{action.description}</span>
                <span className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200 group-hover:text-white">Open</span>
              </Link>
              {orbHint ? (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <OrbInlineHint
                    label={orbHint.label}
                    href={orbHint.href}
                    tone="cyan"
                    className="!border-cyan-400/20 !bg-cyan-950/40 !text-cyan-100 hover:!text-white"
                  />
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
