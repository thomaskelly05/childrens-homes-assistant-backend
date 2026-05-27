import type { ChildJourneyData } from '@/lib/child-journey/data'
import { buildChildJourneyTodayCards } from '@/lib/child-journey/child-journey-routes'

import { ChildJourneyContextCard } from './child-journey-context-card'

export function ChildJourneyTodaySection({ childId, data }: { childId: string; data: ChildJourneyData }) {
  const items = buildChildJourneyTodayCards(childId, data)
  const hasLiveSummary = Boolean(data.dailyNotes[0]?.summary || data.timeline[0]?.summary)

  return (
    <section data-testid="child-journey-today-section" className="min-w-0">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Today</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">What adults need to know today</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          A calm picture from visible records — not a full chronology dump.
        </p>
      </div>
      {!hasLiveSummary ? (
        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
          No live summary available yet. Use chronology and records to build this picture.
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ChildJourneyContextCard key={item.key} item={item} />
        ))}
      </div>
    </section>
  )
}
