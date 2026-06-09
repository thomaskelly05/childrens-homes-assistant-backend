import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'

import type { FounderKpi } from '@/lib/founder/mock-data'

const changeTone: Record<NonNullable<FounderKpi['changeDirection']>, string> = {
  up: 'text-emerald-400',
  down: 'text-rose-400',
  neutral: 'text-slate-500'
}

function ChangeIcon({ direction }: { direction: NonNullable<FounderKpi['changeDirection']> }) {
  if (direction === 'up') return <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
  if (direction === 'down') return <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
  return <ArrowRight className="h-3.5 w-3.5" aria-hidden />
}

export function FounderKpiCard({ kpi }: { kpi: FounderKpi }) {
  const direction = kpi.changeDirection || 'neutral'

  return (
    <article className="founder-surface group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-cyan-400/30 hover:bg-white/[0.06]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{kpi.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black tracking-[-0.04em] text-white">{kpi.value}</p>
        {kpi.change ? (
          <span className={`inline-flex items-center gap-1 text-sm font-bold ${changeTone[direction]}`}>
            <ChangeIcon direction={direction} />
            {kpi.change}
          </span>
        ) : null}
      </div>
      {kpi.hint ? <p className="mt-2 text-xs font-medium text-slate-500">{kpi.hint}</p> : null}
    </article>
  )
}
