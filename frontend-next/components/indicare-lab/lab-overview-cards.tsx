import { METRIC_TONE } from '@/components/indicare-lab/lab-shared'
import type { LabOverviewMetric } from '@/lib/indicare-lab/types'

export function LabOverviewCards({ metrics }: { metrics: LabOverviewMetric[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className="founder-surface group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-cyan-400/30"
        >
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${METRIC_TONE[metric.tone] ?? METRIC_TONE.cyan} to-transparent opacity-60`}
            aria-hidden
          />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{metric.value}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">{metric.hint}</p>
        </article>
      ))}
    </div>
  )
}
