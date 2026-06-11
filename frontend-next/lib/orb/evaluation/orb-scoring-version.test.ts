import assert from 'node:assert/strict'
import test from 'node:test'

import { scoreOrbEvaluationAnswer } from './orb-evaluation-scoring-engine.ts'
import { FIREWALL_FALLBACK_FIXTURES } from './orb-firewall-test-fixtures.ts'
import { generateAdversarialPack } from './orb-scenario-generator.ts'
import {
  FIREWALL_ADVERSARIAL_SCORER,
  formatLiveLlmScoringVersionForDisplay,
  formatResultScoringVersionForDisplay,
  LIVE_LLM_FIREWALL_SCORING_VERSION,
  LIVE_LLM_GUARDED_V3_SCORING_VERSION
} from './orb-scoring-version.ts'
import type { OrbEvaluationRun } from './orb-evaluation-types.ts'

test('firewall adversarial live-llm result uses v4-firewall and FirewallAdversarialRubric', () => {
  const scenario = generateAdversarialPack().find((s) => s.category === 'do-not-report')!
  const { result } = scoreOrbEvaluationAnswer({
    scenario,
    answer: FIREWALL_FALLBACK_FIXTURES['do-not-report']!,
    runId: 'scoring-version-fw-1',
    mode: 'live-llm',
    packType: 'adversarial',
    liveGuardrailAnswerSource: 'safety_firewall',
    safetyFirewallUsed: true
  })

  assert.equal(result.scoringVersion, LIVE_LLM_FIREWALL_SCORING_VERSION)
  assert.equal(result.scorerUsed, FIREWALL_ADVERSARIAL_SCORER)
})

test('privacy_block adversarial live-llm result uses v4-firewall', () => {
  const scenario = generateAdversarialPack().find((s) => s.category === 'identifiable-data')!
  const { result } = scoreOrbEvaluationAnswer({
    scenario,
    answer: FIREWALL_FALLBACK_FIXTURES['identifiable-data']!,
    runId: 'scoring-version-fw-2',
    mode: 'live-llm',
    packType: 'adversarial',
    liveGuardrailAnswerSource: 'privacy_block',
    safetyFirewallUsed: true
  })

  assert.equal(result.scoringVersion, LIVE_LLM_FIREWALL_SCORING_VERSION)
  assert.equal(result.scorerUsed, FIREWALL_ADVERSARIAL_SCORER)
})

test('old persisted v3 run remains v3 and is not rewritten', () => {
  const legacyRun: OrbEvaluationRun = {
    id: 'legacy-v3-run',
    mode: 'live-llm',
    status: 'completed',
    scenarioCount: 10,
    completedCount: 10,
    passRate: 50,
    averageScore: 71,
    criticalFailures: 3,
    scoringVersion: LIVE_LLM_GUARDED_V3_SCORING_VERSION,
    startedAt: '2026-06-10T10:00:00.000Z',
    completedAt: '2026-06-10T10:05:00.000Z',
    createdBy: 'founder',
    summary: 'legacy',
    packType: 'adversarial'
  }

  assert.equal(formatLiveLlmScoringVersionForDisplay(legacyRun), LIVE_LLM_GUARDED_V3_SCORING_VERSION)
})

test('frontend run detail displays persisted v4-firewall scoring version', () => {
  const run: OrbEvaluationRun = {
    id: 'fw-v4-run',
    mode: 'live-llm',
    status: 'completed',
    scenarioCount: 10,
    completedCount: 10,
    passRate: 100,
    averageScore: 95,
    criticalFailures: 0,
    scoringVersion: LIVE_LLM_FIREWALL_SCORING_VERSION,
    startedAt: '2026-06-11T10:00:00.000Z',
    completedAt: '2026-06-11T10:05:00.000Z',
    createdBy: 'founder',
    summary: 'firewall',
    packType: 'adversarial'
  }

  assert.equal(formatLiveLlmScoringVersionForDisplay(run), LIVE_LLM_FIREWALL_SCORING_VERSION)
})

test('missing scoring version does not default to v3', () => {
  const run: OrbEvaluationRun = {
    id: 'missing-version-run',
    mode: 'live-llm',
    status: 'completed',
    scenarioCount: 1,
    completedCount: 1,
    passRate: 0,
    averageScore: 0,
    criticalFailures: 1,
    startedAt: '2026-06-11T10:00:00.000Z',
    completedAt: '2026-06-11T10:05:00.000Z',
    createdBy: 'founder',
    summary: 'unknown',
    packType: 'standard'
  }

  assert.equal(formatLiveLlmScoringVersionForDisplay(run), 'unknown / legacy')
  assert.equal(
    formatResultScoringVersionForDisplay(run, {
      answerSource: 'live-llm'
    }),
    'unknown / legacy'
  )
})
