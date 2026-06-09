import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import type { FounderSectorTrend } from '@/lib/founder/mock-data'

const toneClasses: Record<FounderSectorTrend['tone'], string> = {
  amber: 'border-amber-400/25 bg-amber-500/10',
  emerald: 'border-emerald-400/25 bg-emerald-500/10',
  blue: 'border-blue-400/25 bg-blue-500/10',
  purple: 'border-violet-400/25 bg-violet-500/10',
  red: 'border-rose-400/25 bg-rose-500/10'
}

const changeClasses: Record<FounderSectorTrend['direction'], string> = {
  up: 'text-amber-300',
  down: 'text-emerald-300'
}

export function FounderTrendCard({ trend }: { trend: FounderSectorTrend }) {
  return (
    <article className={`rounded-2xl border p-4 ${toneClasses[trend.tone]}`}>
      <p className="text-sm font-semibold text-slate-200">{trend.label}</p>
      <div className={`mt-3 inline-flex items-center gap-1 text-xl font-black ${changeClasses[trend.direction]}`}>
        {trend.direction === 'up' ? <ArrowUpRight className="h-5 w-5" aria-hidden /> : <ArrowDownRight className="h-5 w-5" aria-hidden />}
        {trend.change}
      </div>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Monthly trend</p>
    </article>
  )
}
