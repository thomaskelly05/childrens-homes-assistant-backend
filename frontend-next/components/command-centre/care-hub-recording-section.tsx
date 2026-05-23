import Link from 'next/link'
import { ClipboardCheck, ClipboardList, ClipboardPlus, Mic2, ShieldAlert, Shield } from 'lucide-react'

import { CARE_HUB_HERO_ACTIONS, CARE_HUB_HERO_ORB_HINTS } from '@/components/command-centre/care-hub-routes'
import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'

const iconByLabel = {
  'Record something': ClipboardList,
  'Record daily note': ClipboardPlus,
  'Record incident': ShieldAlert,
  'Safeguarding concern': Shield,
  'Start shift handover': ClipboardCheck,
  'Ask ORB': Mic2
} as const

export function CareHubRecordingSection({ selectedYoungPersonId }: { selectedYoungPersonId?: string }) {
  const actions = CARE_HUB_HERO_ACTIONS({ selectedYoungPersonId })

  return (
    <section data-testid="care-hub-recording-section" className="min-w-0">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Recording</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">What needs recording?</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          Choose a record type. Each opens the right workflow — ORB can help with wording and quality.
        </p>
      </div>
      <div className="mt-3">
        <Link
          href={selectedYoungPersonId ? `/record?child_id=${encodeURIComponent(selectedYoungPersonId)}&about=child` : '/record'}
          data-testid="care-hub-all-recording-forms"
          className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
        >
          All recording forms
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = iconByLabel[action.label as keyof typeof iconByLabel]
          const orbHint = CARE_HUB_HERO_ORB_HINTS[action.label]
          return (
            <article
              key={action.label}
              className="os-action-card group flex min-h-[108px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <Link
                href={action.href}
                aria-label={action.ariaLabel}
                className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.99]"
              >
                <span className="flex items-center gap-2 text-sm font-black text-slate-950">
                  <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                  {action.label}
                </span>
                <span className="mt-1.5 flex-1 text-xs font-semibold leading-5 text-slate-500">{action.description}</span>
                <span className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Open</span>
              </Link>
              {orbHint ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <OrbInlineHint label={orbHint.label} href={orbHint.href} tone="muted" />
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
