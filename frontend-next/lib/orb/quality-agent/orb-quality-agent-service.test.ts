import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  analyzeOrbEvaluationRun,
  findLatestFailedRun,
  getFailedResults,
  resolveRunType
} from './orb-quality-agent-service.ts'
import type { OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'

function makeRun(overrides: Partial<OrbEvaluationRun> = {}): OrbEvaluationRun {
  return {
    id: 'run-test-1',
    mode: 'live-llm',
    status: 'completed',
    scenarioCount: 2,
    completedCount: 2,
    passRate: 50,
    averageScore: 60,
    criticalFailures: 1,
    startedAt: new Date().toISOString(),
    createdBy: 'test',
    summary: 'test run',
    packType: 'high-risk',
    results: [
      {
        id: 'res-pass',
        runId: 'run-test-1',
        scenarioId: 'ok-scenario',
        question: 'Q',
        orbAnswer: 'A',
        scores: {
          safeguarding: 80,
          escalation: 80,
          localPolicyCaveat: 80,
          therapeuticTone: 80,
          childCentredLanguage: 80,
          childVoice: 80,
          ofstedAlignment: 80,
          practicalUsefulness: 80,
          evidenceQuality: 80,
          hallucinationRisk: 10,
          dataProtection: 80,
          completeness: 80,
          overall: 80
        },
        pass: true,
        criticalFailure: false,
        issues: [],
        redTeamFindings: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'res-fail',
        runId: 'run-test-1',
        scenarioId: 'self-harm-1',
        question: 'Q',
        orbAnswer: 'Weak answer',
        scores: {
          safeguarding: 40,
          escalation: 40,
          localPolicyCaveat: 40,
          therapeuticTone: 40,
          childCentredLanguage: 40,
          childVoice: 40,
          ofstedAlignment: 40,
          practicalUsefulness: 40,
          evidenceQuality: 40,
          hallucinationRisk: 30,
          dataProtection: 40,
          completeness: 40,
          overall: 40
        },
        pass: false,
        criticalFailure: true,
        issues: ['missing cannot be kept secret'],
        redTeamFindings: [],
        createdAt: new Date().toISOString(),
        liveGuardrail: {
          passed: false,
          missingSafeguards: ['cannot be kept secret'],
          repairAttempted: false,
          fallbackUsed: false,
          scaffoldCategory: 'self-harm',
          answerSource: 'raw',
          failReasons: ['missing cannot be kept secret']
        },
        safetyScaffoldCategory: 'self-harm'
      }
    ],
    ...overrides
  }
}

describe('ORB Quality Agent service', () => {
  it('resolves run type from mode and pack', () => {
    assert.equal(resolveRunType(makeRun()), 'live-llm high-risk')
    assert.equal(resolveRunType(makeRun({ title: 'GOLD pack run' })), 'live-llm GOLD')
  })

  it('identifies failed results', () => {
    const failed = getFailedResults(makeRun())
    assert.equal(failed.length, 1)
    assert.equal(failed[0]!.scenarioId, 'self-harm-1')
  })

  it('analyzes run and groups failures', () => {
    const analysis = analyzeOrbEvaluationRun(makeRun())
    assert.equal(analysis.failedResults.length, 1)
    assert.ok(analysis.failureGroups.length >= 1)
    assert.equal(analysis.approvalRequired, true)
    assert.ok(analysis.disclaimer.includes('does not approve'))
  })

  it('finds latest failed run', () => {
    const older = makeRun({ id: 'older', startedAt: '2020-01-01T00:00:00Z' })
    const newer = makeRun({ id: 'newer', startedAt: '2026-01-01T00:00:00Z' })
    const found = findLatestFailedRun([older, newer])
    assert.equal(found?.id, 'newer')
  })
})
