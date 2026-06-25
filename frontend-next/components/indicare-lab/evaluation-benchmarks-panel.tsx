'use client'

import { ArrowLeftRight, FileText, FlaskConical, Play, Scale } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import { generateBuildBriefFromFailedBenchmark } from '@/lib/indicare-lab/evaluations/evaluation-actions'
import {
  createEvaluationRun,
  listEvaluationRuns,
  listScenarios
} from '@/lib/indicare-lab/evaluations/evaluation-storage'
import {
  EVALUATION_COMPARISON_RECOMMENDATION_LABELS,
  EVALUATION_RESULT_CLASSIFICATION_LABELS,
  EVALUATION_RUBRIC_DIMENSION_LABELS,
  EVALUATION_SCENARIO_CATEGORY_LABELS,
  type EvaluationComparison,
  type EvaluationResult,
  type EvaluationRun,
  type EvaluationScenario
} from '@/lib/indicare-lab/evaluations/types'
import { REVIEW_AGENT_LABELS } from '@/lib/indicare-lab/review-events/types'
import type { BuildBrief } from '@/lib/indicare-lab/types'

type EvaluationBenchmarksPanelProps = {
  onCreateBuildBrief: (brief: BuildBrief) => void
  onRunComplete?: () => void
}

const CLASSIFICATION_TONE: Record<string, string> = {
  pass: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  'needs-improvement': 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  fail: 'text-rose-300 border-rose-400/30 bg-rose-500/10'
}

const COMPARISON_TONE: Record<string, string> = {
  'approve-test': 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  'needs-more-work': 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  reject: 'text-rose-300 border-rose-400/30 bg-rose-500/10'
}

export function EvaluationBenchmarksPanel({
  onCreateBuildBrief,
  onRunComplete
}: EvaluationBenchmarksPanelProps) {
  const scenarios = useMemo(() => listScenarios(), [])
  const [runs, setRuns] = useState<EvaluationRun[]>(() => listEvaluationRuns())
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? '')
  const [draftAnswer, setDraftAnswer] = useState('')
  const [comparisonMode, setComparisonMode] = useState(false)
  const [proposedAnswer, setProposedAnswer] = useState('')
  const [lastRun, setLastRun] = useState<EvaluationRun | null>(null)
  const [running, setRunning] = useState(false)

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId)
  const latestRunForScenario = runs.find((r) => r.scenarioId === selectedScenarioId && r.result)

  const refreshRuns = useCallback(() => {
    setRuns(listEvaluationRuns())
  }, [])

  function handleRunEvaluation() {
    if (!selectedScenarioId || !draftAnswer.trim()) return
    setRunning(true)

    const run = createEvaluationRun({
      scenarioId: selectedScenarioId,
      draftAnswer: draftAnswer.trim(),
      proposedAnswer: comparisonMode ? proposedAnswer.trim() : undefined
    })

    setLastRun(run)
    refreshRuns()
    onRunComplete?.()
    setRunning(false)
  }

  function loadExample(type: 'pass' | 'fail' | 'comparison') {
    if (!selectedScenario) return

    if (type === 'pass' && selectedScenario.category === 'daily-record') {
      setDraftAnswer(
        'At 18:15 staff observed YP-A in the lounge. YP-A said they felt calmer after talking with staff. Staff responded with support and informed the on-call manager at 18:20.'
      )
    } else if (type === 'fail') {
      setDraftAnswer(
        'The child was naughty and definitely caused the problem. Staff gave a punishment sanction with no manager informed.'
      )
    } else if (type === 'comparison') {
      setComparisonMode(true)
      setDraftAnswer(
        'Staff noted the young person was upset. No further detail recorded.'
      )
      setProposedAnswer(
        'At 14:30 staff observed YP-H in the corridor. YP-H said they did not want to join the activity. Staff responded with a calm offer of alternative space and informed the on-call manager.'
      )
    }
  }

  return (
    <LabSectionCard
      id="evaluation-benchmarks"
      eyebrow="Phase 5"
      title="Evaluation benchmarks"
      description="Internal synthetic benchmarks that evaluate and score ORB brain quality against residential childcare scenarios. Supports founder decisions — does not change production ORB responses."
      action={
        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
          <FlaskConical className="h-4 w-4" aria-hidden />
          Internal synthetic benchmarks · {scenarios.length} scenarios
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/90">
        <p>
          Rule-based scoring only — no live model calls. Results are founder-only and never exposed to
          normal ORB users. Production prompts are not changed automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Scenario library
          </p>
          <div className="max-h-[480px] space-y-2 overflow-auto pr-1">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                selected={scenario.id === selectedScenarioId}
                latestRun={runs.find((r) => r.scenarioId === scenario.id && r.result)}
                onSelect={() => setSelectedScenarioId(scenario.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {selectedScenario ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge level={selectedScenario.riskLevel} />
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {EVALUATION_SCENARIO_CATEGORY_LABELS[selectedScenario.category]}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-white">{selectedScenario.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{selectedScenario.scenarioPrompt}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {selectedScenario.relevantAgents.map((agent) => (
                    <span
                      key={agent}
                      className="rounded-md border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-200"
                    >
                      {REVIEW_AGENT_LABELS[agent]}
                    </span>
                  ))}
                </div>
                {latestRunForScenario?.result ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Latest benchmark:{' '}
                    <span className="font-bold text-slate-300">
                      {latestRunForScenario.result.scorecard.overallScore}/5 ·{' '}
                      {EVALUATION_RESULT_CLASSIFICATION_LABELS[latestRunForScenario.result.scorecard.classification]}
                    </span>
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">No benchmark run yet for this scenario.</p>
                )}
              </div>

              <div className="mb-2 flex flex-wrap gap-2">
                <ExampleButton label="Pass example" onClick={() => loadExample('pass')} />
                <ExampleButton label="Fail example" onClick={() => loadExample('fail')} />
                <ExampleButton label="Comparison example" onClick={() => loadExample('comparison')} />
                <button
                  type="button"
                  onClick={() => setComparisonMode((v) => !v)}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition ${
                    comparisonMode
                      ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <ArrowLeftRight className="mr-1 inline h-3 w-3" aria-hidden />
                  Comparison mode
                </button>
              </div>

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {comparisonMode ? 'Current answer' : 'Draft answer to evaluate'}
                </span>
                <textarea
                  value={draftAnswer}
                  onChange={(e) => setDraftAnswer(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                  placeholder="Paste the ORB draft answer to score against this scenario..."
                />
              </label>

              {comparisonMode ? (
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Proposed answer
                  </span>
                  <textarea
                    value={proposedAnswer}
                    onChange={(e) => setProposedAnswer(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                    placeholder="Paste the proposed improved answer..."
                  />
                </label>
              ) : null}

              <button
                type="button"
                disabled={
                  !draftAnswer.trim() ||
                  running ||
                  (comparisonMode && !proposedAnswer.trim())
                }
                onClick={handleRunEvaluation}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Run internal evaluation
              </button>

              {lastRun?.result ? (
                <ScorecardDisplay
                  result={lastRun.result}
                  comparison={lastRun.comparison}
                  onCreateBuildBrief={() => {
                    if (!lastRun.result) return
                    const brief = generateBuildBriefFromFailedBenchmark(
                      lastRun.result,
                      selectedScenario
                    )
                    onCreateBuildBrief(brief)
                  }}
                />
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-500">
              Select a scenario from the library to begin.
            </div>
          )}
        </div>
      </div>
    </LabSectionCard>
  )
}

function ScenarioCard({
  scenario,
  selected,
  latestRun,
  onSelect
}: {
  scenario: EvaluationScenario
  selected: boolean
  latestRun?: EvaluationRun
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`eval-scenario-${scenario.id}`}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? 'border-cyan-400/40 bg-cyan-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-200">{scenario.title}</p>
        <RiskBadge level={scenario.riskLevel} className="shrink-0 text-[8px]" />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        {EVALUATION_SCENARIO_CATEGORY_LABELS[scenario.category]}
      </p>
      {latestRun?.result ? (
        <p className="mt-1 text-[10px] text-cyan-300/80">
          {latestRun.result.scorecard.overallScore}/5 ·{' '}
          {EVALUATION_RESULT_CLASSIFICATION_LABELS[latestRun.result.scorecard.classification]}
        </p>
      ) : null}
    </button>
  )
}

function ScorecardDisplay({
  result,
  comparison,
  onCreateBuildBrief
}: {
  result: EvaluationResult
  comparison?: EvaluationComparison
  onCreateBuildBrief: () => void
}) {
  const { scorecard } = result

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      data-testid="evaluation-scorecard"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-cyan-300" aria-hidden />
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${CLASSIFICATION_TONE[scorecard.classification]}`}
        >
          {EVALUATION_RESULT_CLASSIFICATION_LABELS[scorecard.classification]}
        </span>
        <span className="text-sm font-bold text-white">
          {scorecard.overallScore}/{scorecard.overallScoreOutOf} overall
        </span>
      </div>

      {comparison ? (
        <ComparisonSummary comparison={comparison} />
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {scorecard.dimensionScores.map((dim) => (
          <div
            key={dim.dimension}
            className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">{dim.label}</span>
              <span
                className={`text-xs font-bold ${
                  dim.score >= 4
                    ? 'text-emerald-300'
                    : dim.score >= 3
                      ? 'text-amber-300'
                      : 'text-rose-300'
                }`}
              >
                {dim.score}/5
              </span>
            </div>
            {dim.notes[0] ? (
              <p className="mt-1 text-[10px] text-slate-500">{dim.notes[0]}</p>
            ) : null}
          </div>
        ))}
      </div>

      {scorecard.findings.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Findings</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {scorecard.findings.slice(0, 6).map((f) => (
              <li key={f.id} className="rounded-lg border border-white/5 bg-black/20 p-2">
                <RiskBadge level={f.severity} className="mb-1 text-[8px]" />
                <span className="ml-1">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {scorecard.blockers.length > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300">Blockers</p>
          <ul className="mt-1 list-inside list-disc text-xs text-rose-200/90">
            {scorecard.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scorecard.recommendedImprovements.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Recommended improvements
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-slate-400">
            {scorecard.recommendedImprovements.slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scorecard.classification === 'fail' || scorecard.classification === 'needs-improvement' ? (
        <button
          type="button"
          onClick={onCreateBuildBrief}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Create build brief from failed benchmark
        </button>
      ) : null}
    </div>
  )
}

function ComparisonSummary({ comparison }: { comparison: EvaluationComparison }) {
  return (
    <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">
        Comparison results
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] text-slate-500">Current score</p>
          <p className="text-lg font-bold text-slate-200">{comparison.currentScore}/5</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Proposed score</p>
          <p className="text-lg font-bold text-slate-200">{comparison.proposedScore}/5</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Delta</p>
          <p
            className={`text-lg font-bold ${
              comparison.scoreDelta > 0
                ? 'text-emerald-300'
                : comparison.scoreDelta < 0
                  ? 'text-rose-300'
                  : 'text-slate-300'
            }`}
          >
            {comparison.scoreDelta > 0 ? '+' : ''}
            {comparison.scoreDelta}
          </p>
        </div>
      </div>

      {comparison.safeguardingRegression ? (
        <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          Safeguarding regression warning — proposed answer scores lower on safeguarding.
        </div>
      ) : null}

      {comparison.dimensionsImproved.length > 0 ? (
        <p className="mt-2 text-xs text-emerald-300/90">
          Improved:{' '}
          {comparison.dimensionsImproved
            .map((d) => EVALUATION_RUBRIC_DIMENSION_LABELS[d])
            .join(', ')}
        </p>
      ) : null}

      {comparison.dimensionsWorsened.length > 0 ? (
        <p className="mt-1 text-xs text-rose-300/90">
          Worsened:{' '}
          {comparison.dimensionsWorsened
            .map((d) => EVALUATION_RUBRIC_DIMENSION_LABELS[d])
            .join(', ')}
        </p>
      ) : null}

      <div className="mt-3">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${COMPARISON_TONE[comparison.recommendation]}`}
        >
          Recommendation: {EVALUATION_COMPARISON_RECOMMENDATION_LABELS[comparison.recommendation]}
        </span>
      </div>
    </div>
  )
}

function ExampleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
    >
      {label}
    </button>
  )
}
