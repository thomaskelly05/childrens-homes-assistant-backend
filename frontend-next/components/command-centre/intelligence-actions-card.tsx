import Link from 'next/link'

import { Card, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { fetchIntelligenceAttentionFeed } from '@/lib/os-api/intelligence-actions'

export async function IntelligenceActionsCard({
  homeId,
  childId
}: {
  homeId?: string
  childId?: string
}) {
  const feedResult = await fetchIntelligenceAttentionFeed({ home_id: homeId, child_id: childId })
  const feed = feedResult.data

  const sections = [
    { title: 'Urgent — needs review', items: feed.urgent, tone: 'overdue' as const },
    { title: 'High priority', items: feed.high_priority, tone: 'review' as const },
    { title: 'Awaiting manager decision', items: feed.awaiting_decision, tone: 'review' as const },
    { title: 'Follow-up due', items: feed.follow_ups_due, tone: 'available' as const }
  ]

  return (
    <Card data-testid="intelligence-actions-command-card" className="border border-blue-100 bg-blue-50/30">
      <SectionHeader
        eyebrow="Intelligence actions"
        title="Manager decision attention"
        description="Proposed actions from the intelligence spine — decision support only."
      />
      <p className="mb-4 text-xs font-bold leading-6 text-slate-600">
        {feed.action_notice ||
          'Actions are proposed for manager review. Human decision required — not a safeguarding decision.'}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/intelligence-actions" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white">
          Action Board
        </Link>
        <Link
          href="/intelligence-spine"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
        >
          Intelligence Spine
        </Link>
        <Link
          href="/intelligence-oversight"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
        >
          Oversight review
        </Link>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{section.title}</p>
            <ul className="mt-2 space-y-2">
              {section.items.length ? (
                section.items.slice(0, 4).map((item) => (
                  <li key={item.id} className="rounded-2xl border border-white bg-white/80 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={section.tone} />
                      <span className="text-[10px] font-black uppercase text-slate-400">{item.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-black text-slate-800">{item.title}</p>
                    {item.summary ? <p className="text-xs text-slate-500">{item.summary}</p> : null}
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-500">None in this category.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
      {feedResult.warning ? (
        <p className="mt-4 text-xs font-bold text-amber-800">{feedResult.warning}</p>
      ) : null}
    </Card>
  )
}
