'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Beaker, Play, RefreshCw, Shield, Target } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { getQualityRuns } from '@/lib/founder/quality-lab'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'
import {
  createBuildBriefFromEvaluationResult,
  executeEvaluationRun,
  generateScenarioPack,
  generateScenarios,
  getAgentIssueCounts,
  getEvaluationRuns,
  getEvaluationSummary,
  getFindingsByType,
  retestFailedScenarios
} from '@/lib/orb/evaluation'
import { RED_TEAM_AGENTS } from '@/lib/orb/evaluation/red-team-agents'

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

export function FounderOrbEvaluationPage() {
  const [runs, setRuns] = useState(getEvaluationRuns)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const summary = useMemo(() => getEvaluationSummary(), [runs])
  const findings = useMemo(() => getFindingsByType(), [runs])
  const agentCounts = useMemo(() => getAgentIssueCounts(), [runs])
  const latestRun = runs[0]

  const launchGate = useMemo(
    () =>
      computeOrbLaunchQualityGate({
        runs: getQualityRuns(),
        evaluationRuns: runs
      }),
    [runs]
  )

  const refresh = useCallback(() => {
    setRuns(getEvaluationRuns())
  }, [])

  const runAction = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      setBusy(label)
      setMessage(null)
      try {
        await action()
        refresh()
        setMessage(`${label} complete`)
      } catch (err) {
        setMessage(`${label} failed: ${err instanceof Error ? err.message : 'unknown error'}`)
      } finally {
        setBusy(null)
      }
    },
    [refresh]
  )

  const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="founder-page mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <FounderNavHeader
        title="ORB Evaluation & Red Team"
        subtitle="Internal safety and quality testing for ORB Residential."
      />

      {message ? (
        <p className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">{message}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Evaluation status</p>
          <p className="mt-2 text-2xl font-black text-white" data-testid="orb-eval-status">
            {summary.liveRunCompleted ? 'Live runs recorded' : 'No live run yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">{summary.scenarioCount} scenarios in bank</p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Latest pass rate</p>
          <p className="mt-2 text-2xl font-black text-emerald-300">
            {summary.latestPassRate !== null ? `${summary.latestPassRate}%` : '—'}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Critical failures</p>
          <p className="mt-2 text-2xl font-black text-rose-300">
            {summary.latestCriticalFailures ?? '—'}
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
        description="Synthetic scenarios only. Live-llm mode uses the real ORB Residential brain — no fabricated answers."
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
              Run high-risk pack
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
              Run adversarial pack
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
          <p className="text-sm text-slate-400">
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
            {busy}…
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Template mode is available for rubric regression only. Launch evidence requires live-llm runs with no critical failures.
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

      <FounderSectionCard eyebrow="Findings" title="Latest evaluation findings">
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
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Pass rate</th>
                <th className="px-3 py-2">Critical</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    No evaluation run exists yet. Run live LLM evaluation to begin.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="border-b border-white/5">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white">{run.title ?? run.id}</p>
                      <p className="text-xs text-slate-500">{run.summary}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{run.mode}</td>
                    <td className="px-3 py-3 text-emerald-300">{run.passRate}%</td>
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
            <div className="flex items-center gap-2 text-violet-300">
              <Shield className="h-4 w-4" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Red team evaluation</span>
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
