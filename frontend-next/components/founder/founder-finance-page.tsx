'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, PoundSterling, TrendingDown } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet } from '@/lib/founder/api/founder-api-client'
import type { FinanceSnapshot } from '@/lib/founder/finance/finance-types'

function MetricCard({ label, value, hint, labelType }: { label: string; value: string; hint?: string; labelType?: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {labelType ? <p className="mt-1 text-[10px] font-bold uppercase text-cyan-400/80">{labelType}</p> : null}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

export function FounderFinancePage() {
  const [loading, setLoading] = useState(true)
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await founderGet<{ snapshot: FinanceSnapshot }>('/finance')
    if (result.ok) {
      setSnapshot(result.data.snapshot)
    } else {
      setError(result.error ?? 'Failed to load finance data')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Finance Agent"
          subtitle="Monthly costs, burn, margin, runway and break-even insight. Actual, estimated, assumed and projected figures are clearly labelled."
        />

        {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}

        {loading ? (
          <p className="text-sm text-slate-400">Loading finance snapshot…</p>
        ) : snapshot ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="finance-metrics">
              <MetricCard
                label="Monthly burn"
                value={`£${snapshot.monthlyBurn.toLocaleString('en-GB')}`}
                labelType={snapshot.monthlyBurnLabel}
              />
              <MetricCard
                label="MRR (actual)"
                value={snapshot.actualRevenue.mrr !== null ? `£${snapshot.actualRevenue.mrr}` : '—'}
                labelType={snapshot.actualRevenue.label}
                hint="Stripe not connected"
              />
              <MetricCard
                label="Runway"
                value={snapshot.runwayMonths !== null ? `${snapshot.runwayMonths} months` : 'Unknown'}
                labelType="estimated"
              />
              <MetricCard
                label="Break-even users"
                value={snapshot.breakEvenUsers !== null ? String(snapshot.breakEvenUsers) : '—'}
                labelType="projected"
                hint={`At £25/user, £${snapshot.breakEvenMrr} MRR`}
              />
            </div>

            <FounderSectionCard eyebrow="Costs" title="Monthly cost breakdown" description={`Label: ${snapshot.estimatedCosts.label}`}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Hosting" value={`£${snapshot.estimatedCosts.hosting ?? '—'}`} labelType={snapshot.estimatedCosts.label} />
                <MetricCard label="OpenAI / API" value={`£${snapshot.estimatedCosts.openAiApi ?? '—'}`} labelType={snapshot.estimatedCosts.label} />
                <MetricCard label="Email provider" value={`£${snapshot.estimatedCosts.emailProvider ?? '—'}`} labelType={snapshot.estimatedCosts.label} />
                <MetricCard label="Domain / software" value={`£${snapshot.estimatedCosts.domainSoftware ?? '—'}`} labelType={snapshot.estimatedCosts.label} />
              </div>
            </FounderSectionCard>

            <FounderSectionCard eyebrow="Unit economics" title="Per-user and evaluation costs">
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Cost per active user"
                  value={snapshot.costPerActiveUser !== null ? `£${snapshot.costPerActiveUser}` : '—'}
                  labelType="estimated"
                />
                <MetricCard
                  label="Cost per evaluation run"
                  value={snapshot.costPerEvaluationRun !== null ? `£${snapshot.costPerEvaluationRun}` : '—'}
                  labelType="estimated"
                />
                <MetricCard
                  label="Live LLM test estimate"
                  value={snapshot.liveLlmTestCostEstimate !== null ? `£${snapshot.liveLlmTestCostEstimate}` : '—'}
                  labelType="estimated"
                />
              </div>
            </FounderSectionCard>

            {snapshot.warnings.length > 0 ? (
              <FounderSectionCard eyebrow="Warnings" title="Cost alerts">
                <ul className="space-y-2">
                  {snapshot.warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-2 text-sm text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {warning}
                    </li>
                  ))}
                </ul>
              </FounderSectionCard>
            ) : null}

            <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-slate-500">
              <TrendingDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <div>
                {snapshot.limitations.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
