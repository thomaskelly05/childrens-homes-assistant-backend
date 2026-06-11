'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Hammer, RefreshCw } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  createBuildBriefFromEvaluationResult,
  createFixFromResult,
  getEvaluationRun,
  retestFailedScenarios
} from '@/lib/orb/evaluation'

export function FounderOrbEvaluationRunDetailPage({ runId }: { runId: string }) {
  const run = useMemo(() => getEvaluationRun(runId), [runId])
  const results = run?.results ?? []

  if (!run) {
    return (
      <div className="founder-page mx-auto max-w-5xl px-4 py-8 md:px-8">
        <FounderNavHeader
          title="Run not found"
          subtitle="No evaluation run exists with this identifier."
          showBack
          backHref="/founder/orb-evaluation"
        />
        <p className="mt-6 text-slate-400" data-testid="orb-eval-no-run">
          No evaluation run exists. Return to the evaluation dashboard to start a live LLM run.
        </p>
      </div>
    )
  }

  return (
    <div className="founder-page mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
      <FounderNavHeader
        title={run.title ?? 'Evaluation run'}
        subtitle={run.summary}
        showBack
        backHref="/founder/orb-evaluation"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Pass rate</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{run.passRate}%</p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Average score</p>
          <p className="mt-2 text-3xl font-black text-white">{run.averageScore}</p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Critical failures</p>
          <p className="mt-2 text-3xl font-black text-rose-300">{run.criticalFailures}</p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Mode</p>
          <p className="mt-2 text-lg font-bold text-slate-200">{run.mode}</p>
        </div>
      </div>

      {run.limitations?.length ? (
        <FounderSectionCard eyebrow="Limitations" title="Run limitations">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
            {run.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </FounderSectionCard>
      ) : null}

      <FounderSectionCard
        eyebrow="Scenarios"
        title="Scenario results"
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300"
            onClick={() => void retestFailedScenarios(run.id)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retest failed
          </button>
        }
      >
        <div className="space-y-6">
          {results.map((result) => (
            <article
              key={result.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-5"
              data-testid="orb-eval-result-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{result.scenarioId}</p>
                  <p className="mt-1 text-xs text-slate-500">{result.question.slice(0, 160)}…</p>
                </div>
                <div className="text-right">
                  <p className={result.pass ? 'text-emerald-300' : 'text-rose-300'}>
                    {result.pass ? 'Pass' : 'Fail'} · {result.scores.overall}
                  </p>
                  {result.criticalFailure ? (
                    <p className="text-xs text-rose-300">Critical failure</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">ORB answer</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {result.orbAnswer || result.liveCallError || 'No answer captured'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scoring breakdown</p>
                  <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
                    {Object.entries(result.scores).map(([key, value]) => (
                      <li key={key}>
                        {key}: <span className="text-slate-200">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {result.redTeamFindings.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Red team findings</p>
                  <ul className="mt-2 space-y-2">
                    {result.redTeamFindings.map((finding) => (
                      <li key={finding.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                        <span className="font-semibold text-amber-200">{finding.type}</span>
                        <span className="text-slate-500"> · {finding.severity}</span>
                        <p className="mt-1 text-slate-400">{finding.summary}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.recommendedFix ? (
                <p className="mt-4 text-sm text-cyan-200">Recommended fix: {result.recommendedFix}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300"
                  onClick={() => createFixFromResult(result.id)}
                >
                  Create improvement proposal
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300"
                  onClick={() => createBuildBriefFromEvaluationResult(result.id)}
                >
                  <Hammer className="h-3.5 w-3.5" aria-hidden />
                  Create build brief
                </button>
              </div>
            </article>
          ))}
        </div>
      </FounderSectionCard>
    </div>
  )
}
