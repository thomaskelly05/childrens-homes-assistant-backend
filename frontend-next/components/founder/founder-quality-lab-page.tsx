'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Beaker, Hammer, Play, RefreshCw, ShieldCheck } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  createBuildBriefFromProposal,
  executeQualityRun,
  evaluateManualAnswer,
  getOpenQualityProposals,
  getQualityLabSummary,
  getQualityProposals,
  getQualityRuns,
  loadQualityLabOverview,
  retestQualityScenario,
  submitExpertReview,
  submitHumanReview,
  syncFeedbackGapProposals,
  updateQualityProposalStatus,
  type QualityRun,
  type QualityRunItemResult,
  type QualityRunMode
} from '@/lib/founder/quality-lab'
import type { OrbQualityLabOverview } from '@/lib/founder/quality-lab/quality-lab-client'
import { assessOrbPilotPrivacyStatus, computeOrbPilotReadinessGate } from '@/lib/orb/pilot'
import { getEvaluationRuns } from '@/lib/orb/evaluation'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'

const PRIORITY_TONE: Record<string, string> = {
  critical: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  high: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  medium: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  low: 'text-slate-300 border-white/10 bg-white/5'
}

const GATE_TONE: Record<string, string> = {
  'not-ready': 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  'closed-pilot-ready': 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  'public-launch-ready': 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
}

function RunResultsTable({
  run,
  onRetest,
  onHumanReview
}: {
  run: QualityRun
  onRetest: (runId: string, scenarioId: string) => void
  onHumanReview: (
    runId: string,
    scenarioId: string,
    status: 'reviewed-pass' | 'reviewed-concern' | 'reviewed-fail'
  ) => void
}) {
  return (
    <div className="overflow-x-auto" data-testid="quality-lab-run-results">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            <th className="px-3 py-2">Scenario</th>
            <th className="px-3 py-2">Risk</th>
            <th className="px-3 py-2">Pass</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">Review</th>
            <th className="px-3 py-2">Answer</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {run.results.map((item) => (
            <tr key={`${run.id}-${item.scenarioId}`} className="border-b border-white/5 align-top">
              <td className="px-3 py-3">
                <p className="font-semibold text-white">{item.scenarioTitle}</p>
                <p className="text-xs text-slate-500">{item.scenarioId}</p>
                {item.criticalFailure ? (
                  <p className="mt-1 text-xs text-rose-300">Critical failure</p>
                ) : null}
              </td>
              <td className="px-3 py-3 text-slate-400">{item.riskLevel}</td>
              <td className="px-3 py-3">
                <span className={item.passed ? 'text-emerald-300' : 'text-rose-300'}>
                  {item.passed ? 'Pass' : 'Fail'}
                </span>
              </td>
              <td className="px-3 py-3 text-slate-300">{item.score}</td>
              <td className="px-3 py-3 text-xs text-slate-400">
                {item.humanReview?.reviewStatus ?? (item.requiresHumanReview ? 'pending-human-review' : '—')}
              </td>
              <td className="px-3 py-3 text-xs text-slate-400">
                <p className="line-clamp-3">{item.answerExcerpt || item.liveCallError || '—'}</p>
                {item.scoringBreakdown ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Safeguarding {item.scoringBreakdown.safeguardingAccuracy} · Caveat{' '}
                    {item.scoringBreakdown.localPolicyCaveat}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-3">
                {item.requiresHumanReview ? (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="rounded border border-emerald-400/30 px-2 py-1 text-[10px] font-bold text-emerald-200"
                      data-testid="quality-lab-review-pass"
                      onClick={() => onHumanReview(run.id, item.scenarioId, 'reviewed-pass')}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      className="rounded border border-amber-400/30 px-2 py-1 text-[10px] font-bold text-amber-200"
                      onClick={() => onHumanReview(run.id, item.scenarioId, 'reviewed-concern')}
                    >
                      Concern
                    </button>
                    <button
                      type="button"
                      className="rounded border border-rose-400/30 px-2 py-1 text-[10px] font-bold text-rose-200"
                      onClick={() => onHumanReview(run.id, item.scenarioId, 'reviewed-fail')}
                    >
                      Fail
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="mt-1 rounded border border-cyan-400/30 px-2 py-1 text-[10px] font-bold text-cyan-200"
                  data-testid="quality-lab-retest"
                  onClick={() => onRetest(run.id, item.scenarioId)}
                >
                  Retest
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function riskBreakdown(results: QualityRunItemResult[]) {
  const counts: Record<string, number> = {}
  for (const item of results) {
    counts[item.riskLevel] = (counts[item.riskLevel] ?? 0) + 1
  }
  return counts
}

export function FounderQualityLabPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const [overview, setOverview] = useState<OrbQualityLabOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState('')
  const [limit, setLimit] = useState(20)
  const [runMode, setRunMode] = useState<QualityRunMode>('live-llm')
  const [manualScenarioId, setManualScenarioId] = useState('GOLD-001-unknown-vehicle-missing')
  const [manualAnswer, setManualAnswer] = useState('')
  const [reviewScenarioId, setReviewScenarioId] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')

  useEffect(() => {
    loadQualityLabOverview()
      .then((data) => {
        setOverview(data)
        if (data?.default_run_mode) setRunMode(data.default_run_mode)
      })
      .catch(() => setOverview(null))
  }, [])

  const summary = getQualityLabSummary(overview?.gold_scenario_count ?? 100)
  const runs = getQualityRuns()
  const proposals = getQualityProposals()
  const openProposals = getOpenQualityProposals()

  const privacyStatus = useMemo(() => assessOrbPilotPrivacyStatus(), [])

  const launchGate = useMemo(
    () =>
      computeOrbLaunchQualityGate({
        runs,
        evaluationRuns: getEvaluationRuns(),
        whistleblowingCovered: overview?.coverage?.whistleblowing_covered ?? true,
        privacyRetentionReviewed: false
      }),
    [runs, overview]
  )

  const pilotReadinessGate = useMemo(
    () =>
      computeOrbPilotReadinessGate({
        runs,
        whistleblowingCovered: overview?.coverage?.whistleblowing_covered ?? false,
        privacyUxCompleted: privacyStatus.privacyUxCompleted,
        privacyNoticeAvailable: privacyStatus.privacyNoticeAvailable,
        buildPassing: true
      }),
    [runs, overview, privacyStatus]
  )

  async function handleRunPack() {
    setLoading(true)
    setError(null)
    try {
      await executeQualityRun({
        family: family || undefined,
        limit,
        runMode,
        triggeredBy: 'founder'
      })
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quality run failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncFeedback() {
    setLoading(true)
    setError(null)
    try {
      await syncFeedbackGapProposals()
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback sync failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleManualEval() {
    if (!manualAnswer.trim()) return
    setLoading(true)
    setError(null)
    try {
      await evaluateManualAnswer(manualScenarioId.trim(), manualAnswer.trim())
      setManualAnswer('')
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  function handleExpertReview() {
    if (!reviewScenarioId.trim()) return
    submitExpertReview({
      scenarioId: reviewScenarioId.trim(),
      reviewerRole: 'registered_manager',
      helpfulScore: 3,
      safetyScore: 3,
      expertiseScore: 3,
      missedMarkers: [],
      overclaims: [],
      unsafePhrases: [],
      suggestedMarkers: [],
      notes: reviewNotes.trim()
    })
    setReviewNotes('')
    refresh()
  }

  async function handleRetest(runId: string, scenarioId: string) {
    setLoading(true)
    setError(null)
    try {
      await retestQualityScenario({ runId, scenarioId, triggeredBy: 'founder' })
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retest failed')
    } finally {
      setLoading(false)
    }
  }

  function handleHumanReview(
    runId: string,
    scenarioId: string,
    status: 'reviewed-pass' | 'reviewed-concern' | 'reviewed-fail'
  ) {
    submitHumanReview({
      runId,
      scenarioId,
      reviewStatus: status,
      reviewer: 'founder',
      createProposal: status !== 'reviewed-pass'
    })
    refresh()
  }

  const latestRun = summary.latestRun
  const riskCounts = latestRun ? riskBreakdown(latestRun.results) : {}

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="ORB Quality Lab"
          subtitle="Live LLM GOLD verification against the ORB Residential brain. Synthetic scenarios only — never real child records."
        />

        <div
          className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          data-testid="quality-lab-synthetic-warning"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Live LLM Quality Lab uses synthetic scenarios only. It must not include real child records, real staff
              data, or real provider records.
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            data-testid="quality-lab-error"
          >
            {error}
          </div>
        ) : null}

        <FounderSectionCard eyebrow="Launch gate" title="ORB launch quality gate">
          <div className="flex flex-wrap items-center gap-3" data-testid="quality-lab-launch-gate">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${GATE_TONE[launchGate.recommendation]}`}
            >
              {launchGate.recommendation}
            </span>
            <span className="text-sm text-slate-400">
              GOLD live run: {launchGate.liveRunCompleted ? 'yes' : 'no'} · GOLD critical: {launchGate.criticalFailures}{' '}
              · Red team critical: {launchGate.redTeamCriticalFailures ?? 0} · Pending reviews:{' '}
              {launchGate.pendingHumanReviews}
            </span>
            <Link href="/founder/orb-evaluation" className="text-xs font-bold text-cyan-300 hover:text-cyan-200">
              Open ORB Evaluation →
            </Link>
          </div>
          {launchGate.blockers.length > 0 ? (
            <ul className="mt-3 list-inside list-disc text-sm text-rose-200">
              {launchGate.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            Quality Lab = curated GOLD scenarios. ORB Evaluation = broad synthetic and adversarial red team testing.
            Public launch is blocked if either latest GOLD or high-risk red team live run has critical failures.
          </p>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Closed pilot" title="ORB closed-pilot readiness gate">
          <div className="flex flex-wrap items-center gap-3" data-testid="quality-lab-pilot-readiness-gate">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                GATE_TONE[pilotReadinessGate.recommendation] ?? GATE_TONE['not-ready']
              }`}
            >
              {pilotReadinessGate.recommendation}
            </span>
            <Link href="/founder/orb-pilot" className="text-xs font-bold text-cyan-300 hover:text-cyan-200">
              Open ORB Pilot dashboard →
            </Link>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <p>Build: {pilotReadinessGate.buildPassing === null ? 'unavailable' : pilotReadinessGate.buildPassing ? 'passing' : 'failing'}</p>
            <p>Privacy UX: {pilotReadinessGate.privacyUxCompleted ? 'complete' : 'incomplete'}</p>
            <p>Quality Lab live run: {pilotReadinessGate.qualityLabLiveRunCompleted ? 'complete' : 'missing'}</p>
            <p>Whistleblowing: {pilotReadinessGate.whistleblowingCovered ? 'covered' : 'missing'}</p>
          </div>
          {pilotReadinessGate.blockers.length > 0 ? (
            <ul className="mt-3 list-inside list-disc text-sm text-rose-200">
              {pilotReadinessGate.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </FounderSectionCard>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="quality-lab-overview-cards">
          <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Gold scenarios</p>
            <p className="mt-2 text-3xl font-black text-white">{overview?.gold_scenario_count ?? summary.goldScenarioCount}</p>
          </div>
          <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Run mode</p>
            <p className="mt-2 text-2xl font-black text-cyan-200">{latestRun?.runMode ?? runMode}</p>
            <p className="mt-1 text-xs text-slate-500">
              LLM {overview?.live_llm_available ? 'available' : 'unavailable in this environment'}
            </p>
          </div>
          <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Live pass rate</p>
            <p className="mt-2 text-3xl font-black text-emerald-200">
              {latestRun?.runMode === 'live-llm' ? `${latestRun.passRate}%` : '—'}
            </p>
          </div>
          <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Pending human reviews</p>
            <p className="mt-2 text-3xl font-black text-amber-200">{summary.pendingHumanReviews}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <FounderSectionCard eyebrow="Run pack" title="GOLD scenario evaluation">
            <p className="text-sm text-slate-400">
              Default production verification uses live-llm mode via the ORB standalone brain path. Template mode remains
              available for rubric regression without LLM calls.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-xs font-bold uppercase text-slate-500">Run mode</span>
                <select
                  value={runMode}
                  onChange={(e) => setRunMode(e.target.value as QualityRunMode)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                  data-testid="quality-lab-run-mode"
                >
                  <option value="live-llm">live-llm</option>
                  <option value="template">template</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold uppercase text-slate-500">Family filter</span>
                <select
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  <option value="">All families</option>
                  {(overview?.families ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-xs font-bold uppercase text-slate-500">Limit</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) || 20)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleRunPack}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 disabled:opacity-50"
                data-testid="quality-lab-run-pack"
              >
                <Play className="h-4 w-4" aria-hidden />
                Run gold pack
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSyncFeedback}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 disabled:opacity-50"
                data-testid="quality-lab-sync-feedback"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Sync live feedback gaps
              </button>
              <Link
                href="/admin/orb-quality"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Admin quality review
              </Link>
            </div>
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Manual eval" title="Evaluate a pasted answer">
            <label className="block text-sm">
              <span className="text-xs font-bold uppercase text-slate-500">Scenario ID</span>
              <input
                value={manualScenarioId}
                onChange={(e) => setManualScenarioId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-xs font-bold uppercase text-slate-500">Answer text</span>
              <textarea
                value={manualAnswer}
                onChange={(e) => setManualAnswer(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="Paste an ORB answer to evaluate against the gold scenario rubric…"
              />
            </label>
            <button
              type="button"
              disabled={loading || !manualAnswer.trim()}
              onClick={handleManualEval}
              className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-200 disabled:opacity-50"
              data-testid="quality-lab-manual-eval"
            >
              Evaluate answer
            </button>
          </FounderSectionCard>
        </div>

        {latestRun ? (
          <FounderSectionCard
            eyebrow="Latest run"
            title={`${latestRun.title} — ${latestRun.passRate}% pass rate`}
          >
            <p className="mb-3 text-sm text-slate-400">
              Mode: {latestRun.runMode ?? 'template'} · Critical failures: {latestRun.criticalFailures ?? 0} · Scenarios
              by risk:{' '}
              {Object.entries(riskCounts)
                .map(([risk, count]) => `${risk} (${count})`)
                .join(', ') || '—'}
            </p>
            <RunResultsTable run={latestRun} onRetest={handleRetest} onHumanReview={handleHumanReview} />
          </FounderSectionCard>
        ) : (
          <div
            className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center"
            data-testid="quality-lab-empty-runs"
          >
            <Beaker className="mx-auto h-10 w-10 text-slate-500" aria-hidden />
            <p className="mt-4 text-lg font-bold text-slate-300">No quality runs yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Run a live-llm gold pack to verify ORB answer quality against synthetic scenarios.
            </p>
          </div>
        )}

        {runs.length > 1 ? (
          <FounderSectionCard eyebrow="History" title={`${runs.length} quality runs (session memory)`}>
            <div className="space-y-3">
              {runs.slice(0, 5).map((run) => (
                <div key={run.id} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{run.title}</p>
                    <span className="text-xs text-slate-500">{new Date(run.startedAt).toLocaleString('en-GB')}</span>
                  </div>
                  <p className="mt-1 text-slate-400">
                    {run.passCount}/{run.totalCount} passed · {run.passRate}% · {run.runMode ?? 'template'} ·{' '}
                    {run.triggeredBy}
                  </p>
                </div>
              ))}
            </div>
          </FounderSectionCard>
        ) : null}

        <FounderSectionCard eyebrow="Proposals" title={`${openProposals.length} open quality proposals`}>
          {proposals.length === 0 ? (
            <p className="text-sm text-slate-500">Proposals appear after failed live runs or live feedback gap sync.</p>
          ) : (
            <div className="space-y-4" data-testid="quality-lab-proposals">
              {proposals.slice(0, 12).map((proposal) => (
                <article key={proposal.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_TONE[proposal.priority] ?? PRIORITY_TONE.medium}`}
                      >
                        {proposal.priority}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-white">{proposal.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {proposal.type} · {proposal.status} · {proposal.createdBy}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{proposal.description}</p>
                  <p className="mt-2 text-sm text-cyan-200">{proposal.suggestedChange}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        createBuildBriefFromProposal(proposal.id)
                        refresh()
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200"
                      data-testid="quality-lab-proposal-brief"
                    >
                      <Hammer className="h-3.5 w-3.5" aria-hidden />
                      Create build brief
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateQualityProposalStatus(proposal.id, 'approved')
                        refresh()
                      }}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateQualityProposalStatus(proposal.id, 'rejected')
                        refresh()
                      }}
                      className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Expert review" title="Human review notes">
          <p className="text-sm text-slate-400">
            Capture expert reviewer notes for a scenario. Structured human review decisions on live results are recorded
            per scenario in the latest run table above.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-bold uppercase text-slate-500">Scenario ID</span>
              <input
                value={reviewScenarioId}
                onChange={(e) => setReviewScenarioId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="GOLD-054-whistleblowing"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-500">Review notes</span>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleExpertReview}
            disabled={!reviewScenarioId.trim()}
            className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 disabled:opacity-50"
            data-testid="quality-lab-expert-review"
          >
            Save expert review
          </button>
        </FounderSectionCard>

        {overview?.validation_errors?.length ? (
          <FounderSectionCard eyebrow="Validation" title="Scenario bank validation">
            <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
              {overview.validation_errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}
