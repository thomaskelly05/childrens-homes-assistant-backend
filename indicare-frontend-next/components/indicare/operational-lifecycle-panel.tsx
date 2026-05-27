import Link from 'next/link'

import { EmptyState, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { lifecycleCounts, lifecycleNeedsReview } from '@/lib/lifecycle/selectors'
import type { OperationalLifecycleView } from '@/lib/lifecycle/types'

function formatDate(value?: string) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function detailLine(item: OperationalLifecycleView) {
  if (item.resolutionReason) return `Resolution: ${item.resolutionReason}`
  if (item.reviewNotes) return `Review note: ${item.reviewNotes}`
  if (item.escalationReason) return `Escalation reason: ${item.escalationReason}`
  if (item.evidenceIds.length) return `${item.evidenceIds.length} evidence link(s) support this state.`
  return item.summary
}

export function OperationalLifecyclePanel({
  title = 'Operational lifecycle',
  description = 'Current state, review history and evidence support are shown without blame language.',
  items,
  hrefForItem
}: {
  title?: string
  description?: string
  items: OperationalLifecycleView[]
  hrefForItem?: (item: OperationalLifecycleView) => string | undefined
}) {
  const visible = items.filter(lifecycleNeedsReview).slice(0, 8)
  const counts = lifecycleCounts(items)
  const countLabels = [
    ['Open', counts.open],
    ['Acknowledged', counts.acknowledged],
    ['In review', counts.in_review],
    ['Resolved', counts.resolved],
    ['Reopened', counts.reopened],
    ['Escalated', counts.escalated],
    ['Archived', counts.archived]
  ]

  return (
    <div>
      <SectionHeader eyebrow="Lifecycle" title={title} description={description} />
      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {countLabels.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
            <strong className="mt-1 block text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</strong>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {visible.map((item) => {
          const href = hrefForItem?.(item)
          const content = (
            <article className="rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{item.entityType.replaceAll('_', ' ')}</p>
                  <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
                </div>
                <StatusBadge value={item.currentState.replaceAll('_', ' ')} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{detailLine(item)}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                Evidence {item.evidenceIds.length} · Chronology {item.chronologyIds.length} · Governance {item.governanceIds.length}
              </p>
              {item.resolvedBy || item.signedOffBy || item.escalatedBy ? (
                <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                  Reviewed by {item.resolvedBy || item.signedOffBy || item.escalatedBy} · {formatDate(item.resolvedAt || item.signedOffAt || item.escalatedAt)}
                </p>
              ) : null}
            </article>
          )
          return href ? <Link key={`${item.entityType}-${item.id}`} href={href}>{content}</Link> : <div key={`${item.entityType}-${item.id}`}>{content}</div>
        })}
        {!visible.length ? <EmptyState title="No active lifecycle items" description="No open, review, reopened or escalated lifecycle items were derived from the returned records." /> : null}
      </div>
    </div>
  )
}
