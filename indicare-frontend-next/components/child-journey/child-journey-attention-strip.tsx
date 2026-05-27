import type { ChildJourneyData } from '@/lib/child-journey/data'
import { buildChildJourneyAttentionItems } from '@/lib/child-journey/child-journey-routes'

import { ChildJourneyContextCard } from './child-journey-context-card'

export function ChildJourneyAttentionStrip({ childId, data }: { childId: string; data: ChildJourneyData }) {
  const items = buildChildJourneyAttentionItems(childId, data)

  return (
    <section data-testid="child-journey-attention-strip" className="min-w-0">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Journey priorities</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">What needs attention?</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          Summary-level signals only — open records for detail. ORB can help prioritise calmly.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ChildJourneyContextCard key={item.key} item={item} showCount />
        ))}
      </div>
    </section>
  )
}
