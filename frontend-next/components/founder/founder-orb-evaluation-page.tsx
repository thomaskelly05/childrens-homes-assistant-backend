'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Beaker, Play, RefreshCw, Shield, Target } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { getQualityRuns } from '@/lib/founder/quality-lab'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'
import { getPrivacyRetentionReviewed, syncLaunchGovernanceFromEvaluationRuns } from '@/lib/orb/quality/launch-governance-store'
import {
  ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE,
  assertCompletedEvaluationRunSaved,
  createBuildBriefFromEvaluationResult,
  EvaluationRunError,
  executeEvaluationRun,
  executeInternalBrainEvaluationRun,
  fetchEvaluationRuns,
  isHtmlErrorBody,
  LIVE_LLM_PROVIDER_FAILURE_MESSAGE,
  mapEvaluationInfrastructureError,
  fetchEvaluationScenarios,
  FOUNDER_DATA_SOURCE_BUSY_MESSAGE,
  generateScenarioPack,
  generateScenarios,
  getAgentIssueCounts,
  getAnyActiveInternalBrainRun,
  getEvaluationRuns,
  getEvaluationSummary,
  getFindingsByType,
  getInternalBrainSeveritySummary,
  hydrateEvaluationStore,
  isEvaluationCsrfError,
  isFounderDataSourceBusyError,
  recoverStaleInternalBrainRuns,
  retestFailedScenarios,
  STALE_RUN_INTERRUPTED_MESSAGE,
  formatLiveLlmScoringVersionForDisplay
} from '@/lib/orb/evaluation'
import type { InternalBrainRunProgress } from '@/lib/orb/evaluation/orb-evaluation-run-service'
import { EVALUATION_CSRF_REFRESH_MESSAGE } from '@/lib/security/csrf-client'
import { RED_TEAM_AGENTS } from '@/lib/orb/evaluation/red-team-agents'
import type { OrbEvaluationRun } from '@/lib/orb/evaluation/orb-evaluation-types'

const FINDING_LABELS: Record<string, string> = {
  'unsafe-safeguarding': 'Safeguarding',
  'missed-escalation': 'Escalation',
  'invented-law': 'Invented law',
  diagnosis: 'Diagnosis',
  'punitive-language': 'Punitive language',
  'missing-child-voice': 'Child voice',
  'privacy-risk': 'Data protection',
  'weak-ofsted-alignment': 'Ofsted alignment',
  'unhelpful-practicality': 'Practicality',
  hallucination: 'Hallucination'
}

const LOAD_ERROR_MESSAGE =
  'Evaluation data could not be loaded. Please refresh or sign in again.'

export function FounderOrbEvaluationPage() {
  const [runs, setRuns] = useState<OrbEvaluationRun[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [infrastructureErrorCode, setInfrastructureErrorCode] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState<InternalBrainRunProgress | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null)

  const activeInternalBrainRun = useMemo(
    () => getAnyActiveInternalBrainRun(),
    [runs, runProgress]
  )

  const activeInternalBrainHighRisk = useMemo(
    () =>
      activeInternalBrainRun?.packType === 'high-risk' ? activeInternalBrainRun : undefined,
    [activeInternalBrainRun]
  )

  const summary = useMemo(() => getEvaluationSummary(), [runs])
  const findings = useMemo(() => getFindingsByType(), [runs])
  const internalBrainSeverity = useMemo(() => getInternalBrainSeveritySummary(), [runs])
  const agentCounts = useMemo(() => getAgentIssueCounts(), [runs])
  const latestRun = runs[0]

  const launchGate = useMemo(
    () =>
      computeOrbLaunchQualityGate({
        runs: getQualityRuns(),
        evaluationRuns: runs,
        privacyRetentionReviewed: getPrivacyRetentionReviewed()
      }),
    [runs]
  )

  const loadEvaluationData = useCallback(async (): Promise<OrbEvaluationRun[]> => {
    setLoadState('loading')
    setLoadError(null)
    setRefreshStatus('Refreshing evaluation runs…')
    try {
      const [runsPayload, scenariosPayload] = await Promise.all([
        fetchEvaluationRuns(),
        fetchEvaluationScenarios().catch(() => ({ scenarios: [], count: 0 }))
      ])
      hydrateEvaluationStore({
        runs: runsPayload.runs,
        scenarios: scenariosPayload.scenarios
      })
      syncLaunchGovernanceFromEvaluationRuns(runsPayload.runs)
      const recovered = recoverStaleInternalBrainRuns()
      if (recovered.length > 0) {
        setMessage(STALE_RUN_INTERRUPTED_MESSAGE)
      }
      const nextRuns = getEvaluationRuns()
      setRuns(nextRuns)
      setLoadState('ready')
      setRefreshStatus(`Runs refreshed at ${new Date().toLocaleTimeString('en-GB')}`)
      return nextRuns
    } catch (error) {
      if (isFounderDataSourceBusyError(error)) {
        setLoadState('ready')
        setRefreshStatus('Founder data source is busy — showing cached runs')
        return getEvaluationRuns()
      }
      setLoadState('error')
      setLoadError(LOAD_ERROR_MESSAGE)
      setRefreshStatus(null)
      throw new Error(LOAD_ERROR_MESSAGE)
    }
  }, [])

  useEffect(() => {
    void loadEvaluationData().catch(() => undefined)
  }, [loadEvaluationData])

  const runAction = useCallback(
    async (label: string, action: () => Promise<unknown>, options?: { requireSavedRun?: boolean }) => {
      setBusy(label)
      setMessage(null)
      setInfrastructureErrorCode(null)
      setRunProgress(null)
      try {
        const result = await action()
        const refreshedRuns = await loadEvaluationData()

        if (options?.requireSavedRun && result && typeof result === 'object' && 'id' in result) {
          const run = result as OrbEvaluationRun
          assertCompletedEvaluationRunSaved(run)
          const persisted = refreshedRuns.find((item) => item.id === run.id)
          if (!persisted) {
            throw new Error('Internal brain run did not complete. No result was saved.')
          }
        }

        setMessage(`${label} complete`)
      } catch (err) {
        if (isEvaluationCsrfError(err)) {
          setMessage(EVALUATION_CSRF_REFRESH_MESSAGE)
          return
        }
        if (isFounderDataSourceBusyError(err)) {
          setMessage(FOUNDER_DATA_SOURCE_BUSY_MESSAGE)
          return
        }
        if (err instanceof Error && err.message.includes(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)) {
          setMessage(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)
          return
        }
        if (err instanceof EvaluationRunError && err.run?.infrastructureErrorCode) {
          setMessage(err.message || LIVE_LLM_PROVIDER_FAILURE_MESSAGE)
          setInfrastructureErrorCode(err.run.infrastructureErrorCode)
          return
        }
        const rawMessage = err instanceof Error ? err.message : 'unknown error'
        if (isHtmlErrorBody(rawMessage)) {
          const mapped = mapEvaluationInfrastructureError(rawMessage, 502)
          setMessage(mapped.message)
          setInfrastructureErrorCode(mapped.code)
          return
        }
        setMessage(`${label} failed: ${rawMessage}`)
      } finally {
        setBusy(null)
        setRunProgress(null)
      }
    },
    [loadEvaluationData]
  )

  const runInternalBrainPack = useCallback(
    async (
      label: string,
      packType: NonNullable<OrbEvaluationRun['packType']>,
      options?: { limit?: number }
    ) => {
      if (activeInternalBrainRun) {
        setMessage(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)
        return
      }

      setBusy(label)
      setMessage(`${label} started`)
      setRunProgress(null)

      try {
        generateScenarioPack(packType)
        const result = await executeInternalBrainEvaluationRun(
          {
            title: label,
            packType,
            mode: 'internal-brain',
            limit: options?.limit
          },
          {
            onProgress: (progress) => {
              setRunProgress(progress)
              setMessage(`${label} running ${progress.completedCount}/${progress.scenarioCount}`)
            }
          }
        )

        const refreshedRuns = await loadEvaluationData()
        assertCompletedEvaluationRunSaved(result)
        const persisted = refreshedRuns.find((item) => item.id === result.id)
        if (!persisted) {
          throw new Error('Internal brain run did not complete. No result was saved.')
        }

        setMessage(`${label} complete`)
      } catch (err) {
        if (isEvaluationCsrfError(err)) {
          setMessage(EVALUATION_CSRF_REFRESH_MESSAGE)
          return
        }
        if (isFounderDataSourceBusyError(err)) {
          setMessage(FOUNDER_DATA_SOURCE_BUSY_MESSAGE)
          return
        }
        if (err instanceof Error && err.message.includes(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)) {
          setMessage(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)
          return
        }
        setMessage(`${label} failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      } finally {
        setBusy(null)
        setRunProgress(null)
      }
    },
    [activeInternalBrainRun, loadEvaluationData]
  )

  const runInternalBrainHighRisk = useCallback(async () => {
    if (activeInternalBrainRun) {
      setMessage(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)
      return
    }

    setBusy('Internal brain high-risk test')
    setMessage('Internal brain high-risk test started')
    setRunProgress(null)

    try {
      generateScenarioPack('high-risk')
      const result = await executeInternalBrainEvaluationRun(
        {
          title: 'ORB Evaluation — internal brain high-risk',
          packType: 'high-risk',
          mode: 'internal-brain',
          limit: 30
        },
        {
          onProgress: (progress) => {
            setRunProgress(progress)
            setMessage(
              `Internal brain high-risk test running ${progress.completedCount}/${progress.scenarioCount}`
            )
          }
        }
      )

      const refreshedRuns = await loadEvaluationData()
      assertCompletedEvaluationRunSaved(result)
      const persisted = refreshedRuns.find((item) => item.id === result.id)
      if (!persisted) {
        throw new Error('Internal brain run did not complete. No result was saved.')
      }

      setMessage('Internal brain high-risk test complete')
    } catch (err) {
      if (isEvaluationCsrfError(err)) {
        setMessage(EVALUATION_CSRF_REFRESH_MESSAGE)
        return
      }
      if (isFounderDataSourceBusyError(err)) {
        setMessage(FOUNDER_DATA_SOURCE_BUSY_MESSAGE)
        return
      }
      setMessage(
        `Internal brain high-risk test failed: ${err instanceof Error ? err.message : 'unknown error'}`
      )
    } finally {
      setBusy(null)
      setRunProgress(null)
    }
  }, [activeInternalBrainRun, loadEvaluationData])

  const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="founder-page mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <FounderNavHeader
        title="ORB Evaluation & Red Team"
        subtitle="Internal safety and quality testing for ORB Residential — synthetic scenarios only."
      />

      {loadState === 'error' && loadError ? (
        <p
          className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          data-testid="orb-eval-load-error"
        >
          {loadError}
        </p>
      ) : null}

      {message ? (
        <div
          className={
            infrastructureErrorCode
              ? 'rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'
              : 'rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100'
          }
          data-testid="orb-eval-status-message"
        >
          <p>{message}</p>
          {infrastructureErrorCode ? (
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-rose-200/80">
              Technical code: {infrastructureErrorCode}
            </p>
          ) : null}
        </div>
      ) : null}

      {activeInternalBrainRun ? (
        <div
          className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          data-testid="orb-eval-active-run-banner"
        >
          <p className="font-semibold">{activeInternalBrainRun.title ?? 'Internal-brain evaluation'}</p>
          <p className="mt-1 text-xs text-amber-200/90">
            Status: {activeInternalBrainRun.status} · Progress:{' '}
            {runProgress?.completedCount ?? activeInternalBrainRun.completedCount}/
            {runProgress?.scenarioCount ?? activeInternalBrainRun.scenarioCount} · Started:{' '}
            {new Date(activeInternalBrainRun.startedAt).toLocaleString('en-GB')}
          </p>
          {refreshStatus ? <p className="mt-1 text-xs text-amber-200/70">{refreshStatus}</p> : null}
        </div>
      ) : refreshStatus ? (
        <p className="text-xs text-slate-500" data-testid="orb-eval-refresh-status">
          {refreshStatus}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Latest internal-brain run</p>
          <p className="mt-2 text-lg font-bold text-cyan-200" data-testid="orb-eval-internal-brain-status">
            {activeInternalBrainHighRisk
              ? `Running ${activeInternalBrainHighRisk.completedCount}/${activeInternalBrainHighRisk.scenarioCount}`
              : summary.latestInternalBrainRun
                ? summary.latestInternalBrainRun.title ?? 'Completed'
                : 'None yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500" data-testid="orb-eval-internal-brain-progress">
            {activeInternalBrainHighRisk
              ? `Status: ${activeInternalBrainHighRisk.status} · Critical so far: ${activeInternalBrainHighRisk.criticalFailures}`
              : `High-risk failures: ${summary.latestInternalBrainHighRiskFailures}`}
          </p>
          {summary.latestInternalBrainHighRiskRun && !activeInternalBrainHighRisk ? (
            <p className="mt-2 text-xs text-slate-400">
              Pass rate: {summary.latestInternalBrainHighRiskRun.passRate}% · Critical:{' '}
              {summary.latestInternalBrainHighRiskRun.criticalFailures}
            </p>
          ) : null}
          {activeInternalBrainHighRisk ? (
            <Link
              href={`/founder/orb-evaluation/runs/${activeInternalBrainHighRisk.id}`}
              className="mt-2 inline-block text-xs font-bold text-cyan-300 hover:text-cyan-200"
            >
              View details
            </Link>
          ) : null}
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Latest live-llm run</p>
          <p className="mt-2 text-lg font-bold text-violet-200" data-testid="orb-eval-status">
            {summary.liveRunCompleted ? summary.latestLiveLlmRun?.title ?? 'Completed' : 'None yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Live failures: {summary.latestLiveLlmFailures ?? 0}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Latest pass rate</p>
          <p className="mt-2 text-2xl font-black text-emerald-300">
            {summary.latestPassRate !== null ? `${summary.latestPassRate}%` : '—'}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Launch gate</p>
          <p className="mt-2 text-lg font-bold text-white">{launchGate.recommendation}</p>
        </div>
      </div>

      <FounderSectionCard
        eyebrow="Actions"
        title="Run new evaluation"
        description="Internal brain mode tests ORB's own residential care routing, safeguards and fallback logic without calling OpenAI. Live LLM mode tests the full generated answer and requires OPENAI_API_KEY."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100"
              onClick={() => runAction('Generate 100 scenarios', async () => generateScenarios(100))}
            >
              Generate 100 scenarios
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100"
              onClick={() => runAction('Generate 1,000 scenarios', async () => generateScenarios(1000))}
            >
              Generate 1,000 scenarios
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || Boolean(activeInternalBrainRun)}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"
              data-testid="orb-eval-internal-brain-high-risk"
              onClick={() => void runInternalBrainHighRisk()}
            >
              <Shield className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Run internal brain high-risk test
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || Boolean(activeInternalBrainRun)}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"
              data-testid="orb-eval-internal-brain-adversarial"
              onClick={() =>
                void runInternalBrainPack('Internal brain adversarial test', 'adversarial')
              }
            >
              Run internal brain adversarial test
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || Boolean(activeInternalBrainRun)}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"
              data-testid="orb-eval-internal-brain-full"
              onClick={() =>
                void runInternalBrainPack('Internal brain full test', 'standard', { limit: 39 })
              }
            >
              Run internal brain full test
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-100"
              data-testid="orb-eval-high-risk-pack"
              onClick={() =>
                runAction('High-risk pack', async () => {
                  generateScenarioPack('high-risk')
                  await executeEvaluationRun({ packType: 'high-risk', mode: 'live-llm', limit: 30 })
                })
              }
            >
              <Play className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Run high-risk pack (live-llm)
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-100"
              data-testid="orb-eval-adversarial-pack"
              onClick={() =>
                runAction('Adversarial pack', async () => {
                  generateScenarioPack('adversarial')
                  await executeEvaluationRun({ packType: 'adversarial', mode: 'live-llm' })
                })
              }
            >
              Run adversarial pack (live-llm)
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              className="rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-100"
              data-testid="orb-eval-live-llm"
              onClick={() =>
                runAction('Live LLM evaluation', async () =>
                  executeEvaluationRun({ mode: 'live-llm', limit: 20, packType: 'standard' })
                )
              }
            >
              Run live LLM evaluation
            </button>
          </div>
        }
      >
        {busy ? (
          <p className="text-sm text-slate-400" data-testid="orb-eval-run-progress">
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
            {runProgress
              ? `${busy} — ${runProgress.completedCount}/${runProgress.scenarioCount}`
              : `${busy}…`}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Internal safety/routing evidence — not full answer generation evidence. Template mode is for rubric regression only.
            Public launch still requires completed live-llm GOLD and red team runs with no critical failures.
          </p>
        )}
      </FounderSectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <FounderSectionCard eyebrow="Coverage" title="Scenario bank" description="Synthetic safeguarding, practice, management and adversarial packs.">
          <ul className="space-y-2 text-sm text-slate-300">
            {Object.entries(summary.coverage)
              .slice(0, 12)
              .map(([key, count]) => (
                <li key={key} className="flex justify-between border-b border-white/5 py-2">
                  <span>{key}</span>
                  <span className="text-slate-500">{count}</span>
                </li>
              ))}
          </ul>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Agents" title="Red team agents" description="Eight specialist reviewers score every ORB answer.">
          <ul className="space-y-2">
            {RED_TEAM_AGENTS.map((agent) => (
              <li key={agent.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm">
                <span className="text-slate-200">{agent.name}</span>
                <span className="text-xs text-slate-500">{agentCounts[agent.id] ?? 0} findings</span>
              </li>
            ))}
          </ul>
          {topAgent ? (
            <p className="mt-4 text-xs text-amber-200">
              Most active agent: {topAgent[0]} ({topAgent[1]} findings)
            </p>
          ) : null}
        </FounderSectionCard>
      </div>

      <FounderSectionCard
        eyebrow="Findings"
        title="Latest evaluation findings"
        description="Red team findings come from live-llm runs. Internal-brain runs use severity-classified missing requirements."
      >
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-200/80">
              Critical failures (internal brain)
            </p>
            <p className="mt-2 text-xl font-black text-rose-200">
              {internalBrainSeverity.criticalFailures}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/80">
              Missing requirements
            </p>
            <p className="mt-2 text-xl font-black text-amber-100">
              {internalBrainSeverity.missingRequirements}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">
              Improvement opportunities
            </p>
            <p className="mt-2 text-xl font-black text-cyan-100">
              {internalBrainSeverity.improvementOpportunities}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(FINDING_LABELS).map(([type, label]) => (
            <div key={type} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-black text-white">{findings[type] ?? 0}</p>
            </div>
          ))}
        </div>
      </FounderSectionCard>

      <FounderSectionCard
        eyebrow="Runs"
        title="Evaluation runs"
        action={
          latestRun ? (
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300"
              data-testid="orb-eval-retest-failed"
              onClick={() =>
                latestRun && runAction('Retest failed', async () => retestFailedScenarios(latestRun.id))
              }
            >
              Retest failed scenarios
            </button>
          ) : null
        }
      >
        <div className="overflow-x-auto" data-testid="orb-eval-runs-table">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <th className="px-3 py-2">Run</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Scoring</th>
                <th className="px-3 py-2">Pass rate</th>
                <th className="px-3 py-2">Critical</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadState === 'loading' ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-slate-500">
                    Loading evaluation runs…
                  </td>
                </tr>
              ) : loadState === 'error' ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-rose-200">
                    {LOAD_ERROR_MESSAGE}
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-slate-500" data-testid="orb-eval-no-runs">
                    No evaluation runs yet.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="border-b border-white/5">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white">{run.title ?? run.id}</p>
                      <p className="text-xs text-slate-500">{run.summary}</p>
                      {run.packType ? (
                        <p className="text-xs text-slate-600">{run.packType}</p>
                      ) : null}
                      <p className="text-xs text-slate-600">
                        {new Date(run.startedAt).toLocaleString('en-GB')}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{run.status}</td>
                    <td className="px-3 py-3 text-slate-400">
                      {run.mode === 'internal-brain' ? 'internal-brain (routing)' : run.mode}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {run.completedCount}/{run.scenarioCount}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {run.mode === 'internal-brain'
                        ? run.scoringVersion ?? 'internal-brain-v1'
                        : formatLiveLlmScoringVersionForDisplay(run)}
                      {run.supersededByScoringFix ? (
                        <span className="mt-1 block text-[10px] text-amber-300">superseded by scoring fix</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-emerald-300">
                      {run.status === 'completed' ? `${run.passRate}%` : '—'}
                    </td>
                    <td className="px-3 py-3 text-rose-300">{run.criticalFailures}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/founder/orb-evaluation/runs/${run.id}`}
                        className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FounderSectionCard>

      <FounderSectionCard eyebrow="Quality Lab" title="Launch gate integration">
        <div
          className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="orb-eval-launch-readiness-status"
        >
          <p className="text-sm text-slate-400">
            internalBrainHighRiskPassed:{' '}
            <span className={launchGate.internalBrainHighRiskPassed ? 'text-emerald-300' : 'text-amber-300'}>
              {launchGate.internalBrainHighRiskPassed ? 'yes' : 'no'}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            liveGoldRunCompleted:{' '}
            <span className={launchGate.liveGoldRunCompleted ? 'text-emerald-300' : 'text-amber-300'}>
              {launchGate.liveGoldRunCompleted ? 'yes' : 'no'}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            highRiskHumanReviewed:{' '}
            <span className={launchGate.highRiskHumanReviewed ? 'text-emerald-300' : 'text-amber-300'}>
              {launchGate.highRiskHumanReviewed ? 'yes' : 'no'}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            privacyRetentionReviewed:{' '}
            <span className={launchGate.privacyRetentionReviewed ? 'text-emerald-300' : 'text-amber-300'}>
              {launchGate.privacyRetentionReviewed ? 'yes' : 'no'}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            closedPilotReady:{' '}
            <span className={launchGate.closedPilotReady ? 'text-emerald-300' : 'text-amber-300'}>
              {launchGate.closedPilotReady ? 'yes' : 'no'}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            publicLaunchReady:{' '}
            <span className={launchGate.publicLaunchReady ? 'text-emerald-300' : 'text-amber-300'}>
              {launchGate.publicLaunchReady ? 'yes' : 'no'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <Beaker className="h-4 w-4" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">GOLD Quality Lab</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Latest GOLD live run: {launchGate.liveRunCompleted ? 'completed' : 'not completed'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <Shield className="h-4 w-4" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Internal brain</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              High-risk run:{' '}
              {activeInternalBrainHighRisk
                ? 'in progress'
                : launchGate.internalBrainHighRiskCompleted
                  ? 'completed'
                  : 'not completed'}
            </p>
            <p className="text-xs text-slate-500">
              Critical failures: {launchGate.internalBrainCriticalFailures ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-violet-300">
              <Shield className="h-4 w-4" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Live-llm red team</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Latest high-risk run critical failures: {launchGate.redTeamCriticalFailures ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <Target className="h-4 w-4" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Blockers</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              {launchGate.blockers.length === 0 ? (
                <li>No launch blockers from evaluation gates</li>
              ) : (
                launchGate.blockers.map((b) => (
                  <li key={b} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                    {b}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/founder/quality-lab"
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-slate-300"
          >
            Open Quality Lab
          </Link>
          {latestRun?.results?.[0] ? (
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-slate-300"
              onClick={() => createBuildBriefFromEvaluationResult(latestRun.results![0]!.id)}
            >
              Create build brief from latest failure
            </button>
          ) : null}
        </div>
      </FounderSectionCard>
    </div>
  )
}
