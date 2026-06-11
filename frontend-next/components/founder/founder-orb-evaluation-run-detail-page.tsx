'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Hammer, RefreshCw } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  createBuildBriefFromEvaluationResult,
  createFixFromResult,
  fetchEvaluationRun,
  getEvaluationRun,
  hydrateEvaluationStore,
  retestFailedScenarios
} from '@/lib/orb/evaluation'
import { explainMissingRequirements } from '@/lib/orb/evaluation/orb-internal-brain-missing-requirements'
import type { OrbEvaluationRun } from '@/lib/orb/evaluation/orb-evaluation-types'

export function FounderOrbEvaluationRunDetailPage({ runId }: { runId: string }) {
  const [run, setRun] = useState<OrbEvaluationRun | undefined>(() => getEvaluationRun(runId))
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(() =>
    getEvaluationRun(runId) ? 'ready' : 'loading'
  )

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | undefined

    async function loadRun() {
      const cached = getEvaluationRun(runId)
      if (cached) {
        setRun(cached)
        setLoadState('ready')
      } else {
        setLoadState('loading')
      }

      try {
        const payload = await fetchEvaluationRun(runId)
        if (cancelled) return
        hydrateEvaluationStore({ runs: [payload.run] })
        setRun(payload.run)
        setLoadState('ready')
      } catch {
        if (cancelled) return
        if (!cached) {
          setRun(undefined)
          setLoadState('error')
        }
      }
    }

    void loadRun()

    pollTimer = setInterval(() => {
      const current = getEvaluationRun(runId)
      if (current?.status === 'queued' || current?.status === 'running') {
        void fetchEvaluationRun(runId)
          .then((payload) => {
            if (cancelled) return
            hydrateEvaluationStore({ runs: [payload.run] })
            setRun(payload.run)
            setLoadState('ready')
          })
          .catch(() => undefined)
      }
    }, 4000)

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [runId])

  const results = useMemo(() => run?.results ?? [], [run])

  const improvementsByCategory = useMemo(() => {
    if (run?.mode !== 'internal-brain') return []
    const grouped = new Map<string, Array<{ label: string; recommendation: string; scenarioId: string }>>()
    for (const result of results) {
      const category = result.internalBrain?.detectedCategory ?? 'unknown'
      for (const detail of result.improvementOpportunities ?? []) {
        const items = grouped.get(category) ?? []
        items.push({
          label: detail.label,
          recommendation: detail.recommendedImprovement,
          scenarioId: result.scenarioId
        })
        grouped.set(category, items)
      }
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [run?.mode, results])

  if (loadState === 'loading') {
    return (
      <div className="founder-page mx-auto max-w-5xl px-4 py-8 md:px-8">
        <FounderNavHeader
          title="Loading evaluation run"
          subtitle="Fetching persisted run details…"
          showBack
          backHref="/founder/orb-evaluation"
        />
        <p className="mt-6 text-slate-400">Loading evaluation run…</p>
      </div>
    )
  }

  if (!run || loadState === 'error') {
    return (
      <div className="founder-page mx-auto max-w-5xl px-4 py-8 md:px-8">
        <FounderNavHeader
          title="Run not found"
          subtitle="No evaluation run exists with this identifier."
          showBack
          backHref="/founder/orb-evaluation"
        />
        <p className="mt-6 text-slate-400" data-testid="orb-eval-no-run">
          No evaluation run exists. Return to the evaluation dashboard to start an internal-brain or live-llm run.
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
          <p className="mt-2 text-lg font-bold text-cyan-200" data-testid="orb-eval-run-status">
            {run.status}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Progress</p>
          <p className="mt-2 text-3xl font-black text-white" data-testid="orb-eval-run-progress">
            {run.completedCount}/{run.scenarioCount}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Pass rate</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">
            {run.status === 'completed' ? `${run.passRate}%` : '—'}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Average score</p>
          <p className="mt-2 text-3xl font-black text-white">
            {run.status === 'completed' ? run.averageScore : '—'}
          </p>
        </div>
        <div className="founder-surface rounded-2xl border border-white/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Critical failures</p>
          <p className="mt-2 text-3xl font-black text-rose-300">{run.criticalFailures}</p>
        </div>
        {run.mode === 'internal-brain' ? (
          <>
            <div className="founder-surface rounded-2xl border border-white/10 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Missing requirements
              </p>
              <p className="mt-2 text-3xl font-black text-amber-200">{run.missingRequirementsCount ?? 0}</p>
            </div>
          </>
        ) : null}
      </div>

      {run.mode === 'live-llm' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="founder-surface rounded-2xl border border-white/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Scoring version</p>
            <p className="mt-2 text-lg font-bold text-violet-200" data-testid="orb-eval-live-scoring-version">
              {run.scoringVersion === 'live-llm-guarded-v4-firewall'
                ? 'live-llm-guarded-v4-firewall'
                : run.scoringVersion === 'live-llm-guarded-v3'
                  ? 'live-llm-guarded-v3'
                  : 'legacy live/template'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Older failed live runs remain visible for audit. Latest guarded runs are the readiness signal.
            </p>
          </div>
        </div>
      ) : null}

      {run.mode === 'internal-brain' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="founder-surface rounded-2xl border border-white/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Scoring version</p>
            <p className="mt-2 text-lg font-bold text-cyan-200">
              {run.scoringVersion ?? 'internal-brain-v1'}
            </p>
            {run.supersededByScoringFix ? (
              <p className="mt-1 text-xs text-amber-300">Superseded by scoring fix — kept for audit history.</p>
            ) : null}
          </div>
          <div className="founder-surface rounded-2xl border border-white/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Improvement opportunities
            </p>
            <p className="mt-2 text-3xl font-black text-cyan-200">
              {run.improvementOpportunitiesCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Improvements do not block readiness unless severity is critical or high.
            </p>
          </div>
          <div className="founder-surface rounded-2xl border border-white/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Red team findings</p>
            <p className="mt-2 text-3xl font-black text-white">
              {results.reduce((sum, r) => sum + r.redTeamFindings.length, 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Internal-brain critical failures use safety rules, not red-team agents.
            </p>
          </div>
        </div>
      ) : null}

      {run.mode === 'internal-brain' && improvementsByCategory.length > 0 ? (
        <FounderSectionCard eyebrow="Improvements" title="Improvement opportunities by category">
          <p className="mb-4 text-sm text-slate-400">
            Grouped by scenario category — these sharpen fallback wording but do not block pass unless marked
            critical or high.
          </p>
          <div className="space-y-4">
            {improvementsByCategory.map(([category, items]) => (
              <div key={category} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-cyan-200">{category}</p>
                <ul className="mt-2 space-y-2">
                  {items.map((item) => (
                    <li key={`${item.scenarioId}-${item.label}`} className="text-sm text-slate-400">
                      <span className="text-cyan-100">{item.label}</span>
                      <span className="text-slate-600"> · {item.scenarioId}</span>
                      <p className="mt-0.5 text-slate-500">{item.recommendation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FounderSectionCard>
      ) : null}

      {run.status === 'queued' || run.status === 'running' ? (
        <p
          className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          data-testid="orb-eval-run-in-progress"
        >
          Run in progress — showing completed results so far. Final scores appear when the run completes.
        </p>
      ) : null}

      {run.mode === 'internal-brain' ? (
        <p
          className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100"
          data-testid="orb-eval-internal-brain-label"
        >
          This run tested ORB&apos;s internal IndiCare Intelligence logic without an external LLM.
          Internal safety/routing evidence — not full answer generation evidence.
        </p>
      ) : null}

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
                  <p className="text-xs text-slate-400">
                    Critical failure: {result.criticalFailure ? 'yes' : 'no'}
                  </p>
                </div>
              </div>

              {run.mode === 'internal-brain' && result.internalBrain ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-500">Detected domain:</span>{' '}
                      {result.internalBrain.detectedDomain}
                    </p>
                    <p>
                      <span className="text-slate-500">Detected category:</span>{' '}
                      {result.internalBrain.detectedCategory}
                      {result.internalBrain.routing?.practice_specific_fallback_used ? (
                        <span
                          className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200"
                          data-testid="orb-eval-practice-fallback-badge"
                        >
                          Practice-specific fallback used
                        </span>
                      ) : null}
                    </p>
                    <p>
                      <span className="text-slate-500">Detected risk level:</span>{' '}
                      {result.internalBrain.detectedRiskLevel}
                    </p>
                    <p>
                      <span className="text-slate-500">Escalation required:</span>{' '}
                      {result.internalBrain.requiredEscalation ? 'Yes' : 'No'}
                    </p>
                    {result.internalBrain.requiredSafeguards.length > 0 ? (
                      <div>
                        <p className="text-slate-500">Required safeguards</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.internalBrain.requiredSafeguards.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {result.internalBrain.regulatoryAnchors.length > 0 ? (
                      <div>
                        <p className="text-slate-500">Regulatory anchors</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.internalBrain.regulatoryAnchors.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 text-sm text-slate-300">
                    {result.internalBrain.localPolicyCaveats.length > 0 ? (
                      <div>
                        <p className="text-slate-500">Local policy caveats</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.internalBrain.localPolicyCaveats.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {result.internalBrain.childVoicePrompts.length > 0 ? (
                      <div>
                        <p className="text-slate-500">Child voice prompts</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.internalBrain.childVoicePrompts.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {result.internalBrain.therapeuticPrompts.length > 0 ? (
                      <div>
                        <p className="text-slate-500">Therapeutic prompts</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.internalBrain.therapeuticPrompts.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {result.internalBrain.dataProtectionWarnings.length > 0 ? (
                      <div>
                        <p className="text-slate-500">Data protection warnings</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.internalBrain.dataProtectionWarnings.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {result.internalBrain.recommendedTemplate ? (
                      <p>
                        <span className="text-slate-500">Recommended template:</span>{' '}
                        {result.internalBrain.recommendedTemplate}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {run.mode === 'live-llm' && result.liveGuardrail ? (
                <div
                  className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300"
                  data-testid="orb-eval-live-guardrail"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Live guardrail / safety firewall (V4)
                  </p>
                  <p className="mt-2">
                    <span className="text-slate-500">Answer source:</span>{' '}
                    {result.liveGuardrail.answerSource ?? (result.liveGuardrail.fallbackUsed ? 'fallback' : 'raw')}
                  </p>
                  <p>
                    <span className="text-slate-500">OpenAI called:</span>{' '}
                    {result.liveGuardrail.safetyFirewallUsed || result.liveGuardrail.openaiCalled === false
                      ? 'No'
                      : 'Yes'}
                  </p>
                  <p>
                    <span className="text-slate-500">Safety firewall used:</span>{' '}
                    {result.liveGuardrail.safetyFirewallUsed ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <span className="text-slate-500">Guardrail passed raw answer:</span>{' '}
                    {(result.liveGuardrail.guardrailPassedRaw ?? result.liveGuardrail.passed)
                      ? 'Yes'
                      : 'No'}
                  </p>
                  {result.safetyScaffoldCategory ? (
                    <p>
                      <span className="text-slate-500">Safety scaffold category:</span>{' '}
                      {result.safetyScaffoldCategory}
                    </p>
                  ) : null}
                  <p>
                    <span className="text-slate-500">Fallback used:</span>{' '}
                    {result.liveGuardrail.fallbackUsed ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <span className="text-slate-500">Repair attempted:</span>{' '}
                    {result.liveGuardrail.repairAttempted ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <span className="text-slate-500">Scored answer source:</span>{' '}
                    {result.liveGuardrail.answerSource ?? 'final_answer'}
                  </p>
                  {(result.liveGuardrail.failReasons ?? []).length > 0 ? (
                    <p className="mt-2 text-rose-200">
                      Fail reasons: {(result.liveGuardrail.failReasons ?? []).join(', ')}
                    </p>
                  ) : null}
                  {result.liveGuardrail.missingSafeguards.length > 0 ? (
                    <p className="mt-2 text-rose-200">
                      Missing live safeguards: {result.liveGuardrail.missingSafeguards.join(', ')}
                    </p>
                  ) : null}
                  {result.liveGuardrail.answerSource === 'safety_firewall' ||
                  result.liveGuardrail.safetyFirewallUsed ? (
                    <p className="mt-2 text-amber-200">
                      ORB did not call the LLM because this prompt contained an unsafe adversarial
                      instruction. The deterministic internal safety fallback was returned and scored.
                    </p>
                  ) : null}
                  {result.liveGuardrail.answerSource === 'fallback' ? (
                    <p className="mt-2 text-amber-200">
                      Internal-brain safety fallback used because live answer failed deterministic guardrails.
                    </p>
                  ) : null}
                  {result.liveGuardrail.answerSource === 'privacy_block' ? (
                    <p className="mt-2 text-amber-200">
                      Privacy/data minimisation response used before live LLM processing.
                    </p>
                  ) : null}
                  {result.firewallScoring?.applies ? (
                    <div
                      className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100"
                      data-testid="orb-eval-firewall-scoring"
                    >
                      <p>{result.firewallScoring.explanation}</p>
                      <p className="mt-2">
                        <span className="text-violet-300/80">Firewall rubric passed:</span>{' '}
                        {result.firewallScoring.rubricPassed ? 'yes' : 'no'}
                      </p>
                      {result.firewallScoring.requiredSafeguardsDetected.length > 0 ? (
                        <p className="mt-1">
                          <span className="text-violet-300/80">Required safeguards detected:</span>{' '}
                          {result.firewallScoring.requiredSafeguardsDetected.join(' · ')}
                        </p>
                      ) : null}
                      <p className="mt-1">
                        <span className="text-violet-300/80">False-positive findings filtered:</span>{' '}
                        {result.firewallScoring.falsePositiveFindingsFiltered}
                      </p>
                    </div>
                  ) : null}
                  {result.liveGuardrail.rawAnswer &&
                  result.liveGuardrail.rawAnswer !== result.orbAnswer &&
                  (result.liveGuardrail.fallbackUsed || result.liveGuardrail.answerSource === 'privacy_block') ? (
                    <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <summary className="cursor-pointer text-xs text-slate-500">
                        Debug: raw live LLM answer (not scored or displayed)
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
                        {result.liveGuardrail.rawAnswer}
                      </p>
                    </details>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {run.mode === 'internal-brain' ? 'Fallback answer' : 'ORB answer'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {result.orbAnswer || result.liveCallError || 'No answer captured'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {run.mode === 'internal-brain' ? 'Internal brain score breakdown' : 'Scoring breakdown'}
                  </p>
                  <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
                    {run.mode === 'internal-brain' && result.internalBrainScores
                      ? Object.entries(result.internalBrainScores).map(([key, value]) => (
                          <li key={key}>
                            {key}: <span className="text-slate-200">{value}</span>
                          </li>
                        ))
                      : Object.entries(result.scores).map(([key, value]) => (
                          <li key={key}>
                            {key}: <span className="text-slate-200">{value}</span>
                          </li>
                        ))}
                  </ul>
                </div>
              </div>

              {run.mode === 'internal-brain' && result.criticalFailure && result.redTeamFindings.length === 0 ? (
                <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  Critical failure without red-team findings:{' '}
                  {result.issues.slice(0, 3).join(' · ') || 'see safety rules below'}.
                </p>
              ) : null}

              {run.mode === 'internal-brain' && result.internalBrain ? (
                <div className="mt-4 space-y-4" data-testid="orb-eval-missing-requirements">
                  {(result.missingRequirementDetails ?? result.internalBrain.missingRequirementDetails ?? [])
                    .length > 0 ? (
                    <>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Missing requirements by severity
                        </p>
                        <ul className="mt-2 space-y-3">
                          {(result.missingRequirementDetails ??
                            result.internalBrain.missingRequirementDetails ??
                            []
                          )
                            .filter((detail) => detail.severity !== 'improvement')
                            .map((detail) => (
                              <li
                                key={detail.id}
                                className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-sm"
                              >
                                <p className="font-semibold text-amber-100">
                                  {detail.label}{' '}
                                  <span className="text-xs uppercase text-amber-300/80">({detail.severity})</span>
                                </p>
                                <p className="mt-1 text-slate-400">{detail.whyItMatters}</p>
                                <p className="mt-1 text-amber-100/90">{detail.recommendedImprovement}</p>
                              </li>
                            ))}
                        </ul>
                      </div>
                      {(result.improvementOpportunities ?? []).length > 0 ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Improvement opportunities
                          </p>
                          <ul className="mt-2 space-y-2">
                            {(result.improvementOpportunities ?? []).map((detail) => (
                              <li
                                key={detail.id}
                                className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100"
                              >
                                {detail.label}: {detail.recommendedImprovement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : result.internalBrain.missingRequirements.length === 0 ? (
                    <p className="text-sm text-emerald-200">No missing requirements detected.</p>
                  ) : (
                    <ul className="space-y-3">
                      {explainMissingRequirements(
                        result.internalBrain.missingRequirements,
                        result.orbAnswer || result.internalBrain.fallbackAnswer
                      ).map((detail) => (
                        <li
                          key={detail.requirement}
                          className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-sm"
                        >
                          <p className="font-semibold text-amber-100">{detail.requirement}</p>
                          <p className="mt-1 text-slate-400">{detail.whyItMatters}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

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
