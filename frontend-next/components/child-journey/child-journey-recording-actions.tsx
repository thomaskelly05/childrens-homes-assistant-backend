import Link from 'next/link'
import { ClipboardPlus } from 'lucide-react'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import { buildChildJourneyRecordingActions } from '@/lib/child-journey/child-journey-routes'

export function ChildJourneyRecordingActions({ childId }: { childId: string }) {
  const actions = buildChildJourneyRecordingActions(childId)

  return (
    <section data-testid="child-journey-recording-actions" className="min-w-0">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Recording</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">What needs recording?</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          Choose a record type for this child. ORB can help with wording and what to include.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <article
            key={action.id}
            className="os-action-card group flex min-h-[108px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <Link
              href={action.href}
              className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span className="flex items-center gap-2 text-sm font-black text-slate-950">
                <ClipboardPlus className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                {action.label}
              </span>
              <span className="mt-1.5 flex-1 text-xs font-semibold leading-5 text-slate-500">{action.description}</span>
              <span className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Open</span>
            </Link>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <OrbInlineHint label={action.orbHint.label} href={action.orbHint.href} tone="muted" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
