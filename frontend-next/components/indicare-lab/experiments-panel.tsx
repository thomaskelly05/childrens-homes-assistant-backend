import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import type { ExperimentStatus, LabExperiment } from '@/lib/indicare-lab/types'

const EXPERIMENT_TONE: Record<ExperimentStatus, string> = {
  draft: 'text-slate-300 border-white/10 bg-white/5',
  running: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  paused: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  completed: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
}

export function ExperimentsPanel({ experiments }: { experiments: LabExperiment[] }) {
  return (
    <LabSectionCard
      id="experiments"
      eyebrow="Internal evaluation"
      title="Experiments"
      description="Controlled experiments for ORB Residential improvement. High-risk experiments remain paused until founder approval."
    >
      <div className="space-y-4">
        {experiments.map((exp) => (
          <article
            key={exp.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-400/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{exp.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Started {formatLabDate(exp.startedAt)} · {exp.owner}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${EXPERIMENT_TONE[exp.status]}`}
                >
                  {exp.status}
                </span>
                <RiskBadge level={exp.riskLevel} />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              <span className="font-semibold text-slate-400">Hypothesis: </span>
              {exp.hypothesis}
            </p>
            {exp.outcome ? (
              <p className="mt-2 text-sm text-amber-200/90">
                <span className="font-semibold">Outcome: </span>
                {exp.outcome}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </LabSectionCard>
  )
}
