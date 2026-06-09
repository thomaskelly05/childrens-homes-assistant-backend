import { AlertTriangle, Gauge } from 'lucide-react'

import type { FounderCostCentre } from '@/lib/founder/mock-data'

const warningTone: Record<FounderCostCentre['usageWarning'], string> = {
  normal: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  elevated: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-400/30 bg-rose-500/10 text-rose-200'
}

export function FounderCostCentre({ data }: { data: FounderCostCentre }) {
  const metrics = [
    { label: 'OpenAI spend this month', value: data.openAiSpend },
    { label: 'Estimated cost per user', value: data.costPerUser },
    { label: 'Cost per ORB conversation', value: data.costPerConversation },
    { label: 'Revenue per provider', value: data.revenuePerProvider },
    { label: 'Gross margin estimate', value: data.grossMargin }
  ]

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${warningTone[data.usageWarning]}`}>
        {data.usageWarning === 'normal' ? <Gauge className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
        <span className="text-sm font-bold">{data.usageWarningLabel}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-black text-white">{metric.value}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
