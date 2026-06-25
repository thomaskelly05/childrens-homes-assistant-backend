import { FileText } from 'lucide-react'

import { PriorityBadge, RiskBadge } from '@/components/indicare-lab/lab-shared'
import type { LabGap } from '@/lib/indicare-lab/types'

export function GapCard({
  gap,
  selected,
  onToggleSelect,
  onCreateBrief
}: {
  gap: LabGap
  selected?: boolean
  onToggleSelect?: (gapId: string) => void
  onCreateBrief?: (gap: LabGap) => void
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.06]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300/70">{gap.area}</p>
          <h3 className="mt-1 text-lg font-bold text-white">{gap.title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge level={gap.riskLevel} />
          <PriorityBadge priority={gap.priority} />
        </div>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Issue</dt>
          <dd className="mt-1 text-slate-300">{gap.issue}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Why it matters</dt>
          <dd className="mt-1 text-slate-300">{gap.whyItMatters}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommendation</dt>
          <dd className="mt-1 text-slate-300">{gap.recommendation}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Suggested action</dt>
          <dd className="mt-1 text-slate-400">{gap.suggestedAction}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {onToggleSelect ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(gap.id)}
              className="rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/30"
            />
            Select for build brief
          </label>
        ) : null}
        {onCreateBrief ? (
          <button
            type="button"
            onClick={() => onCreateBrief(gap)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Create Build Brief
          </button>
        ) : null}
      </div>
    </article>
  )
}
