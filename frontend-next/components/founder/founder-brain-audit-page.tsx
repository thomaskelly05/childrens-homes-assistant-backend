'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Shield } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import type { BrainAuditAreaResult, BrainAuditSummary } from '@/lib/founder/brain-audit/brain-audit-types'
import { BRAIN_AUDIT_CATEGORY_LABELS } from '@/lib/founder/brain-audit/brain-audit-domains'
import type { BrainAuditCategory } from '@/lib/founder/brain-audit/brain-audit-types'

type BrainAuditPayload = {
  audit: BrainAuditSummary
  domainCount: number
  latestMicroCheck: {
    areasTested: string[]
    scenarioCount: number
    criticalFailures: number
    completedAt: string
  } | null
}

const STRENGTH_TONE: Record<string, string> = {
  untested: 'text-slate-400',
  weak: 'text-rose-300',
  moderate: 'text-amber-300',
  strong: 'text-emerald-300'
}

function AreaRow({ area }: { area: BrainAuditAreaResult }) {
  return (
    <tr className="border-b border-white/5 text-xs" data-testid={`brain-audit-area-${area.id}`}>
      <td className="py-2 pr-3 text-slate-300">{area.label}</td>
      <td className="py-2 pr-3 capitalize text-slate-500">{area.category.replace(/_/g, ' ')}</td>
      <td className="py-2 pr-3 text-slate-400">{area.scenariosAvailable}</td>
      <td className="py-2 pr-3 text-slate-400">{area.scenariosRun}</td>
      <td className="py-2 pr-3 text-slate-400">{area.passRate !== null ? `${area.passRate}%` : '—'}</td>
      <td className="py-2 pr-3 text-slate-400">{area.criticalFailures}</td>
      <td className={`py-2 pr-3 font-bold capitalize ${STRENGTH_TONE[area.coverageStrength] ?? 'text-slate-400'}`}>
        {area.coverageStrength}
      </td>
      <td className="py-2 text-slate-500">{area.benchmarkStatus.replace(/_/g, ' ')}</td>
    </tr>
  )
}

export function FounderBrainAuditPage() {
  const [payload, setPayload] = useState<BrainAuditPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<BrainAuditCategory | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const result = await founderGet<BrainAuditPayload>('/brain-audit')
    if (result.ok) setPayload(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const runAudit = async () => {
    await founderPost('/brain-audit', {})
    await load()
  }

  const audit = payload?.audit
  const filteredAreas =
    audit?.areas.filter((a) => category === 'all' || a.category === category) ?? []

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Internal Brain Coverage Audit"
          subtitle="ORB internal brain coverage across Ofsted-regulated children's home domains. Synthetic testing only — no real child data."
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runAudit()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-200"
            data-testid="brain-audit-run-button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Run coverage audit
          </button>
          <Link
            href="/founder/learning-loop"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            Learning Loop
          </Link>
          <Link
            href="/founder/autonomy"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            Autonomy Scheduler
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading brain audit…</p>
        ) : audit ? (
          <>
            <FounderSectionCard
              eyebrow="Overview"
              title="Coverage summary"
              description={`${payload?.domainCount ?? 0} residential childcare domains tracked. Internal brain only.`}
            >
              <p className="mb-4 text-sm text-slate-400" data-testid="brain-audit-last-updated">
                Latest audit: {new Date(audit.generatedAt).toLocaleString('en-GB')}
                {audit.lastUpdatedFrom ? (
                  <>
                    {' '}
                    · Last updated from: <span className="text-cyan-300">{audit.lastUpdatedFrom}</span>
                    {audit.lastUpdatedRunId ? ` (run ${audit.lastUpdatedRunId.slice(0, 12)}…)` : ''}
                  </>
                ) : null}
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="brain-audit-summary">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Overall coverage</p>
                  <p className="mt-1 text-2xl font-bold text-white">{audit.overallCoveragePercent}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Weak areas</p>
                  <p className="mt-1 text-2xl font-bold text-rose-300">{audit.weakAreas.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Untested</p>
                  <p className="mt-1 text-2xl font-bold text-slate-400">{audit.untestedAreas.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Critical failures</p>
                  <p className="mt-1 text-2xl font-bold text-amber-300">{audit.criticalFailureCount}</p>
                </div>
              </div>

              {payload?.latestMicroCheck ? (
                <p className="mt-4 text-sm text-slate-400">
                  Latest rotating micro-check: {payload.latestMicroCheck.scenarioCount} scenarios across{' '}
                  {payload.latestMicroCheck.areasTested.length} areas at{' '}
                  {new Date(payload.latestMicroCheck.completedAt).toLocaleString('en-GB')}.
                </p>
              ) : null}
            </FounderSectionCard>

            <FounderSectionCard
              eyebrow="Top gaps"
              title="Top 10 missing or weak areas"
              description="Priority areas before increasing automated testing frequency."
            >
              <ul className="space-y-2 text-sm text-slate-300" data-testid="brain-audit-top-gaps">
                {audit.topMissingWeakAreas.map((area) => (
                  <li key={area.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    <div>
                      <strong className="text-white">{area.label}</strong>
                      <p className="mt-1 text-xs text-slate-500">{area.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </FounderSectionCard>

            <FounderSectionCard eyebrow="Domains" title="Coverage by area" description="Filter by category.">
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${category === 'all' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400'}`}
                >
                  All
                </button>
                {(Object.keys(BRAIN_AUDIT_CATEGORY_LABELS) as BrainAuditCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${category === cat ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400'}`}
                  >
                    {BRAIN_AUDIT_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left" data-testid="brain-audit-table">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="pb-2 pr-3">Area</th>
                      <th className="pb-2 pr-3">Category</th>
                      <th className="pb-2 pr-3">Available</th>
                      <th className="pb-2 pr-3">Run</th>
                      <th className="pb-2 pr-3">Pass</th>
                      <th className="pb-2 pr-3">Critical</th>
                      <th className="pb-2 pr-3">Strength</th>
                      <th className="pb-2">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAreas.map((area) => (
                      <AreaRow key={area.id} area={area} />
                    ))}
                  </tbody>
                </table>
              </div>
            </FounderSectionCard>
          </>
        ) : (
          <p className="text-sm text-slate-400">No audit data yet. Run a coverage audit to begin.</p>
        )}
      </div>
    </div>
  )
}
