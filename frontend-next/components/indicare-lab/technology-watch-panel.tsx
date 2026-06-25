import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { PriorityBadge, RiskBadge } from '@/components/indicare-lab/lab-shared'
import type { TechnologyWatchItem } from '@/lib/indicare-lab/types'

export function TechnologyWatchPanel({ items }: { items: TechnologyWatchItem[] }) {
  return (
    <LabSectionCard
      id="technology-watch"
      eyebrow="Technology opportunities"
      title="Technology watch"
      description="Surfaces emerging capabilities relevant to ORB Residential. Recommendations require founder approval before experimentation."
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-violet-400/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300/70">{item.category}</p>
              <div className="flex gap-2">
                <RiskBadge level={item.riskLevel} />
                <PriorityBadge priority={item.priority} />
              </div>
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">{item.title}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Signal</dt>
                <dd className="mt-1 text-slate-300">{item.signal}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Relevance</dt>
                <dd className="mt-1 text-slate-300">{item.relevance}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommendation</dt>
                <dd className="mt-1 text-slate-400">{item.recommendation}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </LabSectionCard>
  )
}
