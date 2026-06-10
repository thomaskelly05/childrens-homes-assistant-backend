'use client'

import type { CompanyKpi } from '@/lib/founder/company/company-types'
import { buildMetricDataBasis, formatMetricDisplay } from '@/lib/founder/company/live-data-guard'

const STATUS_TONE: Record<CompanyKpi['sourceStatus'], string> = {
  live: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  unavailable: 'text-slate-400 border-white/10 bg-white/5',
  forecast: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  manual: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10'
}

export function FounderCompanyKpiCard({ kpi, compact = false }: { kpi: CompanyKpi; compact?: boolean }) {
  const display = formatMetricDisplay({
    value: kpi.value,
    source: kpi.dataSource,
    sourceStatus: kpi.sourceStatus,
    lastUpdated: kpi.lastUpdated,
    limitation: kpi.limitation
  }, kpi.unit || undefined)

  return (
    <article className={`founder-surface rounded-2xl border p-4 ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{kpi.name}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_TONE[kpi.sourceStatus]}`}>
          {kpi.sourceStatus}
        </span>
      </div>
      <p className={`mt-2 font-black tracking-tight text-white ${compact ? 'text-xl' : 'text-2xl'}`}>
        {display}
      </p>
      {!compact && kpi.trend !== null && kpi.trend !== undefined && kpi.sourceStatus === 'live' ? (
        <p className="mt-1 text-xs text-slate-400">Trend: {kpi.trend > 0 ? '+' : ''}{kpi.trend}%</p>
      ) : !compact && kpi.sourceStatus !== 'live' && kpi.trend === null ? (
        <p className="mt-1 text-xs text-slate-500">Trend unavailable until more live data is captured.</p>
      ) : null}
      {!compact ? (
        <p className="mt-2 text-[10px] leading-5 text-slate-500" title={buildMetricDataBasis({
          value: kpi.value,
          source: kpi.dataSource,
          sourceStatus: kpi.sourceStatus,
          lastUpdated: kpi.lastUpdated,
          limitation: kpi.limitation
        })}>
          {kpi.dataSource}
          {kpi.limitation ? ` · ${kpi.limitation}` : ''}
        </p>
      ) : null}
    </article>
  )
}
