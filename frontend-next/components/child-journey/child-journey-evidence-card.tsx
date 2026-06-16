import type { ChildJourneyData } from '@/lib/child-journey/data'
import { buildChildJourneyEvidenceCards } from '@/lib/child-journey/child-journey-routes'

import { ChildJourneyContextCard } from './child-journey-context-card'

export function ChildJourneyEvidenceSection({ childId, data }: { childId: string; data: ChildJourneyData }) {
  const items = buildChildJourneyEvidenceCards(childId, data)

  return (
    <section data-testid="child-journey-evidence-section" className="min-w-0">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Evidence trail</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">Evidence and review</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          Documents, actions, manager review and Inspection evidence preparation for this journey.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ChildJourneyContextCard key={item.key} item={item} />
        ))}
      </div>
    </section>
  )
}
