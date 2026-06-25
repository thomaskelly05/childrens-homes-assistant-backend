import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import type { RoadmapItem } from '@/lib/indicare-lab/types'

const ROADMAP_TONE: Record<RoadmapItem['status'], string> = {
  planned: 'text-slate-300 border-white/10 bg-white/5',
  'in-progress': 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  blocked: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  done: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
}

export function LabRoadmapPanel({ items }: { items: RoadmapItem[] }) {
  return (
    <LabSectionCard
      id="roadmap"
      eyebrow="Product direction"
      title="Lab roadmap"
      description="Planned improvement themes for ORB Residential. Dependencies reflect internal evaluation gates — not delivery commitments."
    >
      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-indigo-400/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300/70">
                  {item.quarter} · {item.theme}
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">{item.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${ROADMAP_TONE[item.status]}`}
                >
                  {item.status}
                </span>
                <RiskBadge level={item.riskLevel} />
              </div>
            </div>
            {item.dependencies.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Dependencies</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-400">
                  {item.dependencies.map((dep) => (
                    <li key={dep} className="flex gap-2">
                      <span className="text-violet-400/60">→</span>
                      {dep}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </LabSectionCard>
  )
}
