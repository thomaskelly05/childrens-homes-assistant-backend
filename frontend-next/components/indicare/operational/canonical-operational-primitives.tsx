import Link from 'next/link'

import type { ChronologyProjection, EvidenceTraversal, ProviderOperationalQueueItem } from '@/lib/operational-memory/types'
import { routeToChronologyEvent, routeToEvidence } from '@/lib/routes/os-routes'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function CanonicalChronologyTimeline({ projections }: { projections: ChronologyProjection[] }) {
  return (
    <div className="space-y-4">
      {projections.map((projection) => (
        <article key={projection.projection_id} className="rounded-[24px] border border-slate-100 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{projection.projection_type}</span>
            <span className="text-xs font-bold text-slate-400">Replay cursor {projection.replay_cursor}</span>
            <span className="text-xs font-bold text-slate-400">{formatDate(projection.occurred_at)}</span>
          </div>
          <h3 className="mt-3 text-base font-black text-slate-950">{projection.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{projection.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {projection.linked_evidence.map((id) => (
              <Link key={id} href={routeToEvidence(id)} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                Evidence {id}
              </Link>
            ))}
            {projection.source_event_ids.map((id) => (
              <Link key={id} href={routeToChronologyEvent(id)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                Source {id}
              </Link>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

export function CanonicalOperationalQueue({ items }: { items: ProviderOperationalQueueItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.queue_id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.category.replaceAll('_', ' ')}</span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.priority}</span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.status}</span>
          </div>
          <h3 className="mt-3 text-sm font-black text-slate-950">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">Replay cursor {item.replay_cursor}</p>
        </article>
      ))}
    </div>
  )
}

export function CanonicalEvidenceTraversal({ traversal }: { traversal: EvidenceTraversal }) {
  return (
    <div className="space-y-3">
      {traversal.edges.map((edge) => (
        <article key={`${edge.source_id}:${edge.target_id}:${edge.relationship}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">{edge.relationship.replaceAll('_', ' ')}</span>
          <p className="mt-3 text-sm font-black text-emerald-950">{edge.source_id} -> {edge.target_id}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-800">{edge.why_linked}</p>
        </article>
      ))}
    </div>
  )
}
