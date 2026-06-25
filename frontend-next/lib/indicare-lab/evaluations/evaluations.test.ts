import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

import { BENCHMARK_SCENARIOS } from '@/lib/indicare-lab/evaluations/benchmark-scenarios'
import {
  generateBuildBriefFromFailedBenchmark,
  suggestBenchmarkScenariosForPattern
} from '@/lib/indicare-lab/evaluations/evaluation-actions'
import {
  compareEvaluationAnswers,
  evaluateDraftAnswer
} from '@/lib/indicare-lab/evaluations/evaluation-engine'
import {
  createEvaluationRun,
  listScenarios,
  resetEvaluationStoreForTests,
  summariseEvaluationRuns
} from '@/lib/indicare-lab/evaluations/evaluation-storage'

describe('IndiCare Lab evaluation benchmarks', () => {
  beforeEach(() => {
    resetEvaluationStoreForTests()
  })

  it('benchmark scenario seed is valid with at least 12 scenarios', () => {
    assert.ok(BENCHMARK_SCENARIOS.length >= 12, 'should have at least 12 scenarios')
    assert.equal(listScenarios().length, BENCHMARK_SCENARIOS.length)

    for (const scenario of BENCHMARK_SCENARIOS) {
      assert.ok(scenario.id.startsWith('bench-'), `scenario id should start with bench-: ${scenario.id}`)
      assert.ok(scenario.title.length > 0)
      assert.ok(scenario.scenarioPrompt.length > 20)
      assert.ok(scenario.requiredElements.length > 0)
      assert.ok(scenario.disallowedElements.length > 0)
      assert.ok(scenario.relevantAgents.length > 0)
      assert.ok(['critical', 'high', 'medium', 'low'].includes(scenario.riskLevel))

      const lower = `${scenario.scenarioPrompt} ${scenario.title}`.toLowerCase()
      assert.ok(
        !lower.match(/\b(jay|emma|oliver|sophie|james|charlie)\b/),
        `scenario should not use real-sounding child names: ${scenario.id}`
      )
    }
  })

  it('scoring engine produces dimension scores and overall score', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'daily-record')!
    const goodAnswer =
      'At 18:15 staff observed YP-A in the lounge. YP-A said they felt calmer. Staff responded with support and informed the on-call manager.'

    const result = evaluateDraftAnswer(scenario, goodAnswer)

    assert.ok(result.scorecard.overallScore >= 1 && result.scorecard.overallScore <= 5)
    assert.equal(result.scorecard.dimensionScores.length, 10)
    assert.ok(result.scorecard.findings.length >= 0)
    assert.ok(result.isInternalEvaluation)
    assert.ok(result.isDevelopment)
  })

  it('safeguarding failure is detected and classified as fail', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'safeguarding-escalation')!
    const badAnswer =
      'There was suspected abuse during contact. Staff definitely confirmed neglect and must exclude the child from all future contact.'

    const result = evaluateDraftAnswer(scenario, badAnswer)

    assert.equal(result.scorecard.classification, 'fail')
    assert.ok(result.scorecard.blockers.length > 0)
    assert.ok(result.scorecard.safetyConcerns.length > 0)

    const safeguarding = result.scorecard.dimensionScores.find((d) => d.dimension === 'safeguarding')
    assert.ok(safeguarding)
    assert.ok(safeguarding.score < 3)
  })

  it('child voice failure is detected', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'child-voice')!
    const badAnswer =
      'Staff observed the young person in the corridor. Staff responded and action was taken. Manager was informed.'

    const result = evaluateDraftAnswer(scenario, badAnswer)

    const childCentred = result.scorecard.dimensionScores.find((d) => d.dimension === 'child-centredness')
    assert.ok(childCentred)
    assert.ok(childCentred.score < 4)
    assert.ok(
      result.scorecard.recommendedImprovements.some((r) => r.toLowerCase().includes('child')) ||
        result.scorecard.findings.some((f) => f.dimension === 'child-centredness')
    )
  })

  it('judgemental language failure is detected', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'judgemental-language')!
    const badAnswer =
      'The child was naughty and manipulative. Staff gave a punishment sanction.'

    const result = evaluateDraftAnswer(scenario, badAnswer)

    assert.ok(['fail', 'needs-improvement'].includes(result.scorecard.classification))
    const therapeutic = result.scorecard.dimensionScores.find((d) => d.dimension === 'therapeutic-language')
    assert.ok(therapeutic)
    assert.ok(therapeutic.score < 4)
  })

  it('comparison mode detects improvement and regression', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'child-voice')!

    const currentAnswer = 'Staff noted the young person was upset. No further detail recorded.'
    const proposedAnswer =
      'At 14:30 staff observed YP-H in the corridor. YP-H said they did not want to join the activity. Staff responded with a calm offer of alternative space and informed the on-call manager.'

    const comparison = compareEvaluationAnswers(scenario, currentAnswer, proposedAnswer)

    assert.ok(comparison.proposedScore > comparison.currentScore)
    assert.ok(comparison.scoreDelta > 0)
    assert.ok(comparison.dimensionsImproved.length > 0)
    assert.equal(comparison.safeguardingRegression, false)
    assert.equal(comparison.recommendation, 'approve-test')

    const regressionComparison = compareEvaluationAnswers(
      scenario,
      proposedAnswer,
      'There was suspected abuse. Staff definitely confirmed neglect with no manager informed.'
    )

    assert.ok(regressionComparison.scoreDelta < 0 || regressionComparison.safeguardingRegression)
    assert.ok(['reject', 'needs-more-work'].includes(regressionComparison.recommendation))
  })

  it('build brief generation from failed benchmark includes required fields', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'safeguarding-escalation')!
    const badAnswer =
      'There was suspected abuse. Staff definitely confirmed neglect without informing anyone.'

    const result = evaluateDraftAnswer(scenario, badAnswer)
    const brief = generateBuildBriefFromFailedBenchmark(result, scenario)

    assert.ok(brief.title.includes('Benchmark failure'))
    assert.ok(brief.objective.includes('synthetic benchmark'))
    assert.ok(brief.scope.some((s) => s.includes('Category')))
    assert.ok(brief.scope.some((s) => s.includes('Score')))
    assert.ok(brief.scope.some((s) => s.includes('Safety concerns')))
    assert.ok(brief.acceptanceCriteria.some((c) => c.toLowerCase().includes('re-run')))
    assert.ok(brief.constraints.some((c) => c.toLowerCase().includes('re-test')))
    assert.ok(brief.riskNotes.toLowerCase().includes('re-test'))
  })

  it('pattern integration suggests relevant benchmark scenarios', () => {
    const childVoice = suggestBenchmarkScenariosForPattern('pattern-missing-child-voice')
    assert.ok(childVoice.length >= 2)
    assert.ok(childVoice.some((s) => s.category === 'child-voice'))
    assert.ok(childVoice.some((s) => s.category === 'daily-record'))

    const safeguarding = suggestBenchmarkScenariosForPattern('pattern-weak-safeguarding-escalation')
    assert.ok(safeguarding.some((s) => s.category === 'safeguarding-escalation'))
  })

  it('repository creates runs and summarises results', () => {
    const scenario = BENCHMARK_SCENARIOS[0]!
    createEvaluationRun({
      scenarioId: scenario.id,
      draftAnswer: 'At 18:00 staff observed YP-A. YP-A said they felt okay. Staff informed manager.'
    })

    const summary = summariseEvaluationRuns()
    assert.equal(summary.totalRuns, 1)
    assert.equal(summary.completedRuns, 1)
    assert.equal(summary.scenarioCount, BENCHMARK_SCENARIOS.length)
    assert.ok(summary.latestOverallScore !== null)
  })

  it('comparison run is tracked in summary', () => {
    const scenario = BENCHMARK_SCENARIOS.find((s) => s.category === 'child-voice')!
    createEvaluationRun({
      scenarioId: scenario.id,
      draftAnswer: 'Staff noted upset.',
      proposedAnswer:
        'YP-H said they felt anxious. Staff responded with support and informed the manager.'
    })

    const summary = summariseEvaluationRuns()
    assert.equal(summary.comparisonRuns, 1)
  })
})
