import Link from 'next/link'

import {
  buildCareHubAttentionItems,
  type CareHubAttentionItem
} from '@/components/command-centre/care-hub-routes'
import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'

function AttentionCard({ item }: { item: CareHubAttentionItem }) {
  return (
    <article className="os-review-card group flex min-h-[120px] flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <Link href={item.href} className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
          <span className={`os-status-pill shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${item.statusTone}`}>
            {item.status}
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-slate-950">{item.count}</p>
        <p className="mt-1 flex-1 text-xs font-semibold leading-5 text-slate-500">{item.reason}</p>
        <span className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 opacity-0 transition group-hover:opacity-100">
          Open →
        </span>
      </Link>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <OrbInlineHint label={item.orbHint} href={item.orbHref} tone="cyan" />
      </div>
    </article>
  )
}

export function CareHubAttentionStrip({
  reviewQueue,
  safeguarding,
  recordQualityMarkers,
  actionsOutstanding,
  missingEpisodes,
  recentIncidents
}: {
  reviewQueue: number
  safeguarding: number
  recordQualityMarkers: number
  actionsOutstanding: number
  missingEpisodes: number
  recentIncidents: number
}) {
  const items = buildCareHubAttentionItems({
    reviewQueue,
    safeguarding,
    recordQualityMarkers,
    actionsOutstanding,
    missingEpisodes,
    recentIncidents
  })

  return (
    <section data-testid="care-hub-attention-strip" className="min-w-0">
      <div className="os-section-heading">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Shift priorities</p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">What needs attention?</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          Review signals before recording. ORB can help summarise and prioritise.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <AttentionCard key={item.label} item={item} />
        ))}
      </div>
    </section>
  )
}
