'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Play, RefreshCw } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { getPendingApprovals } from '@/lib/founder/approvals'
import {
  BRAND_OPERATING_LOOP_PLAN,
  fetchOperatingLoopRuns,
  FULL_OPERATING_LOOP_PLAN,
  getLastOperatingLoopRun,
  getOperatingLoopRuns,
  postOperatingLoopRun,
  PRODUCT_OPERATING_LOOP_PLAN,
  QUALITY_OPERATING_LOOP_PLAN,
  TECHNICAL_OPERATING_LOOP_PLAN,
  type FounderOperatingLoopPlan,
  type FounderOperatingLoopRun
} from '@/lib/founder/operating-loop'
import { refreshFounderDashboardData } from '@/lib/founder/intelligence-service'
import { getLastFounderBootstrap } from '@/lib/founder/persistence/founder-persistence-sync'
import { hydrateOperatingLoopRunsFromPersistence } from '@/lib/founder/operating-loop/operating-loop-store'
import { FounderEvidenceQuickLink } from '@/components/founder/founder-evidence-quick-link'

const STATUS_TONE: Record<string, string> = {
  completed: 'text-emerald-300',
  completed_with_warnings: 'text-amber-300',
  failed: 'text-rose-300',
  running: 'text-cyan-300',
  queued: 'text-slate-400'
}

const DEFAULT_PLAN: FounderOperatingLoopPlan = { ...FULL_OPERATING_LOOP_PLAN }

export function FounderOperatingLoopPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const [plan, setPlan] = useState<FounderOperatingLoopPlan>(DEFAULT_PLAN)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<FounderOperatingLoopRun[]>([])

  useEffect(() => {
    const bootstrap = getLastFounderBootstrap()
    const hasBootstrapRuns = Boolean(bootstrap?.operatingLoopRuns?.length)

    refreshFounderDashboardData()
      .then(async () => {
        if (hasBootstrapRuns && bootstrap?.operatingLoopRuns) {
          hydrateOperatingLoopRunsFromPersistence(
            bootstrap.operatingLoopRuns as Parameters<typeof hydrateOperatingLoopRunsFromPersistence>[0]
          )
          setRuns(getOperatingLoopRuns())
          return
        }
        setRuns(await fetchOperatingLoopRuns())
      })
      .catch(() => undefined)
  }, [])

  const lastRun = getLastOperatingLoopRun() ?? runs[0] ?? null
  const pendingApprovals = getPendingApprovals()

  async function handleRun(selectedPlan: FounderOperatingLoopPlan) {
    setRunning(true)
    setError(null)
    try {
      await refreshFounderDashboardData()
      await postOperatingLoopRun(selectedPlan)
      const latest = await fetchOperatingLoopRuns()
      setRuns(latest)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operating loop failed')
    } finally {
      setRunning(false)
    }
  }

  function togglePlan(key: keyof FounderOperatingLoopPlan) {
    setPlan((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Operating Loop"
          subtitle="Run the private IndiCare Intelligence staff team against live telemetry and quality results."
        />

        <FounderSectionCard eyebrow="Run" title="Run New Operating Loop">
          <p className="mb-4 text-sm text-slate-400">
            Approval-based autonomy only. The loop may analyse, draft, recommend, and queue approvals. It will never post,
            email, deploy, or change ORB production knowledge.
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['runStaffAgents', 'Staff Team'],
                ['runQualitySample', 'Quality sample'],
                ['generateActions', 'Actions'],
                ['generateContentDrafts', 'Content drafts'],
                ['generateBuildBriefs', 'Build briefs'],
                ['generateApprovals', 'Approvals'],
                ['generateIntelligenceSnapshot', 'Intelligence snapshot'],
                ['generateDailyBriefing', 'Daily briefing']
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={plan[key]}
                  onChange={() => togglePlan(key)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={running}
              onClick={() => handleRun(plan)}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/15 disabled:opacity-50"
            >
              <Play className="h-4 w-4" aria-hidden />
              {running ? 'Running…' : 'Run Selected Loop'}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => handleRun(FULL_OPERATING_LOOP_PLAN)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
            >
              Run Full Loop
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => handleRun(PRODUCT_OPERATING_LOOP_PLAN)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
            >
              Run Product Loop
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => handleRun(QUALITY_OPERATING_LOOP_PLAN)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
            >
              Run Quality Loop
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => handleRun(BRAND_OPERATING_LOOP_PLAN)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
            >
              Run Brand Loop
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => handleRun(TECHNICAL_OPERATING_LOOP_PLAN)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200"
            >
              Run Technical Loop
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </FounderSectionCard>

        {lastRun ? (
          <FounderSectionCard eyebrow="Last run" title="Last Run Summary">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Status" value={lastRun.status} className={STATUS_TONE[lastRun.status]} />
              <Metric label="Actions" value={lastRun.actionsCreated.length} />
              <Metric label="Drafts" value={lastRun.draftsCreated.length} />
              <Metric label="Approvals" value={lastRun.approvalsCreated.length} />
            </div>
            <p className="mt-4 text-sm text-slate-300">{lastRun.recommendedFounderDecisions[0] ?? lastRun.dataBasis}</p>
            <Link
              href={`/founder/operating-loop/${lastRun.id}`}
              className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              View run detail →
            </Link>
          </FounderSectionCard>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <FounderSectionCard eyebrow="Outputs" title="Outputs Created">
            {lastRun ? (
              <ul className="space-y-2 text-sm text-slate-300">
                <li>{lastRun.actionsCreated.length} actions</li>
                <li>{lastRun.draftsCreated.length} content drafts</li>
                <li>{lastRun.buildBriefsCreated.length} build briefs</li>
                <li>{lastRun.approvalsCreated.length} approvals queued</li>
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Run the operating loop to create outputs.</p>
            )}
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Approvals" title="Required Approvals">
            {pendingApprovals.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-300">
                {pendingApprovals.slice(0, 5).map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No pending approvals.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4">
              <Link href="/founder/approvals" className="inline-flex text-sm font-semibold text-cyan-300">
                Open Approvals →
              </Link>
              <FounderEvidenceQuickLink />
            </div>
          </FounderSectionCard>
        </div>

        {lastRun && lastRun.errors.length > 0 ? (
          <FounderSectionCard eyebrow="Warnings" title="Warnings">
            <div className="flex items-start gap-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <ul className="space-y-1">
                {lastRun.errors.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </FounderSectionCard>
        ) : null}

        {lastRun && lastRun.recommendedFounderDecisions.length > 0 ? (
          <FounderSectionCard eyebrow="Decisions" title="Recommended Founder Decisions">
            <ul className="space-y-2 text-sm text-slate-300">
              {lastRun.recommendedFounderDecisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}

        <FounderSectionCard eyebrow="History" title="Recent Runs">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => fetchOperatingLoopRuns().then(setRuns)}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 hover:text-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </button>
          </div>
          {runs.length === 0 ? (
            <p className="text-sm text-slate-500">No persisted runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-2">Run</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Outputs</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-white/5">
                      <td className="px-3 py-3">
                        <Link href={`/founder/operating-loop/${run.id}`} className="font-semibold text-cyan-300 hover:text-cyan-200">
                          {run.id}
                        </Link>
                      </td>
                      <td className={`px-3 py-3 ${STATUS_TONE[run.status] ?? 'text-slate-300'}`}>{run.status}</td>
                      <td className="px-3 py-3 text-slate-400">{new Date(run.startedAt).toLocaleString('en-GB')}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {run.actionsCreated.length}a / {run.draftsCreated.length}d / {run.buildBriefsCreated.length}b /{' '}
                        {run.approvalsCreated.length}ap
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FounderSectionCard>
      </div>
    </div>
  )
}

function Metric({ label, value, className = 'text-white' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-bold ${className}`}>{value}</p>
    </div>
  )
}
