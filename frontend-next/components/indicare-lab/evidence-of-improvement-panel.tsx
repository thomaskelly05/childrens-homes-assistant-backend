'use client'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'

export type EvidenceOfImprovementCounts = {
  realShadowReviewEvents: number
  syntheticBenchmarkScenarios: number
  benchmarkRunsCompleted: number
  failedHighRiskBenchmarks: number
  realPatternsDetected: number
  evidenceBasedSuggestions: number
  buildBriefsFromEvidence: number
  founderDecisions: number
  productionChangesAutoDeployed: number
  persistentReviewEvents: number
  persistentSuggestions: number
  persistentBuildBriefs: number
  founderActionsLogged: number
  auditEvents: number
  storageMode: string
  redactedStoragePercentage: number
  lastSuccessfulWriteAt?: string | null
  failedWriteCount?: number
}

type EvidenceOfImprovementPanelProps = {
  counts: EvidenceOfImprovementCounts
}

export function EvidenceOfImprovementPanel({ counts }: EvidenceOfImprovementPanelProps) {
  const items = [
    { label: 'Real shadow review events captured', value: counts.realShadowReviewEvents },
    { label: 'Persistent review events stored', value: counts.persistentReviewEvents },
    { label: 'Persistent suggestions stored', value: counts.persistentSuggestions },
    { label: 'Persistent build briefs stored', value: counts.persistentBuildBriefs },
    { label: 'Founder actions logged', value: counts.founderActionsLogged },
    { label: 'Audit events recorded', value: counts.auditEvents },
    { label: 'Synthetic benchmark scenarios available', value: counts.syntheticBenchmarkScenarios },
    { label: 'Benchmark runs completed', value: counts.benchmarkRunsCompleted },
    { label: 'Failed high-risk benchmarks', value: counts.failedHighRiskBenchmarks },
    { label: 'Real patterns detected', value: counts.realPatternsDetected },
    { label: 'Evidence-based suggestions created', value: counts.evidenceBasedSuggestions },
    { label: 'Build briefs generated from evidence', value: counts.buildBriefsFromEvidence },
    { label: 'Founder decisions made', value: counts.founderDecisions },
    {
      label: 'Production changes automatically deployed',
      value: counts.productionChangesAutoDeployed
    },
    { label: 'Redacted storage percentage', value: `${counts.redactedStoragePercentage}%` },
    { label: 'Storage mode', value: counts.storageMode, isText: true },
    {
      label: 'Last successful write',
      value: counts.lastSuccessfulWriteAt ?? 'None yet',
      isText: true
    },
    { label: 'Failed write count', value: counts.failedWriteCount ?? 0 }
  ]

  return (
    <LabSectionCard
      id="evidence-of-improvement"
      eyebrow="Governance log"
      title="Evidence of improvement"
      description="Honest evidence counts for internal founder governance. Zeros are shown as zero — no inflated usage numbers."
      action={
        <div className="rounded-xl border border-slate-400/20 bg-slate-500/10 px-3 py-2 text-xs text-slate-300">
          Evidence log — internal founder governance. No compliance guarantee.
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            data-testid={`evidence-count-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/%/g, 'pct')}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
            <p className={`mt-2 font-black text-white ${item.isText ? 'text-lg' : 'text-3xl'}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </LabSectionCard>
  )
}
