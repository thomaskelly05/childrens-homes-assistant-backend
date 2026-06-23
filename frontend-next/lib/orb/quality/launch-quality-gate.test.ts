import assert from 'node:assert/strict'
import test from 'node:test'

import { computeOrbLaunchQualityGate } from './launch-quality-gate.ts'
import type { QualityRun } from '../../founder/quality-lab/quality-lab-types.ts'

function makeRun(partial: Partial<QualityRun>): QualityRun {
  return {
    id: 'run-1',
    title: 'Test run',
    type: 'gold-pack',
    status: 'complete',
    runMode: 'live-llm',
    startedAt: new Date().toISOString(),
    passCount: 1,
    failCount: 0,
    totalCount: 1,
    passRate: 100,
    results: [],
    dataSource: 'live',
    limitations: [],
    triggeredBy: 'test',
    ...partial
  }
}

test('launch gate recommends not-ready when live run missing', () => {
  const gate = computeOrbLaunchQualityGate({ runs: [] })
  assert.equal(gate.recommendation, 'not-ready')
  assert.match(gate.blockers.join(' '), /No completed live-llm/)
})

test('critical failures block public launch', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [
      makeRun({
        criticalFailures: 2,
        results: [
          {
            scenarioId: 'GOLD-001',
            scenarioTitle: 'Test',
            family: 'missing_from_care',
            role: 'support_worker',
            riskLevel: 'critical',
            passed: false,
            score: 20,
            missingMarkers: [],
            unsafePhrases: ['unsafe'],
            overclaims: [],
            notes: [],
            answerSource: 'live-llm',
            criticalFailure: true
          }
        ]
      })
    ],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  })
  assert.equal(gate.recommendation, 'not-ready')
  assert.ok(gate.blockers.some((b) => b.includes('critical failure')))
})

test('pending human reviews block public launch', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [
      makeRun({
        pendingHumanReviews: 1,
        results: [
          {
            scenarioId: 'GOLD-054-whistleblowing',
            scenarioTitle: 'Whistleblowing',
            family: 'whistleblowing',
            role: 'support_worker',
            riskLevel: 'high',
            passed: true,
            score: 85,
            missingMarkers: [],
            unsafePhrases: [],
            overclaims: [],
            notes: [],
            answerSource: 'live-llm',
            requiresHumanReview: true,
            humanReview: { reviewStatus: 'pending-human-review' }
          }
        ]
      })
    ],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  })
  assert.equal(gate.recommendation, 'not-ready')
  assert.ok(gate.blockers.some((b) => b.includes('pending human review')))
})

test('red team critical failures block public launch', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [makeRun({ results: [], criticalFailures: 0 })],
    evaluationRuns: [
      {
        id: 'eval-1',
        mode: 'live-llm',
        status: 'completed',
        scenarioCount: 10,
        completedCount: 10,
        passRate: 80,
        averageScore: 75,
        criticalFailures: 1,
        startedAt: new Date().toISOString(),
        createdBy: 'test',
        summary: 'test',
        packType: 'high-risk'
      }
    ],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  })
  assert.equal(gate.recommendation, 'not-ready')
  assert.ok((gate.redTeamCriticalFailures ?? 0) > 0)
})

test('missing internal-brain high-risk run blocks closed pilot', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [
      makeRun({
        results: [],
        criticalFailures: 0
      })
    ],
    evaluationRuns: [],
    whistleblowingCovered: true,
    privacyRetentionReviewed: false
  })
  assert.equal(gate.recommendation, 'not-ready')
  assert.ok(gate.blockers.some((b) => b.includes('internal-brain high-risk')))
})

test('internal-brain alone does not unlock public launch', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [],
    evaluationRuns: [
      {
        id: 'ib-only',
        mode: 'internal-brain',
        status: 'completed',
        scenarioCount: 10,
        completedCount: 10,
        passRate: 100,
        averageScore: 95,
        criticalFailures: 0,
        startedAt: new Date().toISOString(),
        createdBy: 'test',
        summary: 'internal only',
        packType: 'high-risk'
      }
    ],
    whistleblowingCovered: true,
    privacyRetentionReviewed: true
  })
  assert.equal(gate.recommendation, 'not-ready')
})

test('missing whistleblowing coverage blocks public launch', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [makeRun({ results: [] })],
    whistleblowingCovered: false,
    privacyRetentionReviewed: true
  })
  assert.equal(gate.whistleblowingCovered, false)
  assert.equal(gate.recommendation, 'not-ready')
})

test('missing privacy retention review blocks public launch', () => {
  const gate = computeOrbLaunchQualityGate({
    runs: [
      makeRun({
        results: [
          {
            scenarioId: 'GOLD-054-whistleblowing',
            scenarioTitle: 'Whistleblowing',
            family: 'whistleblowing',
            role: 'support_worker',
            riskLevel: 'high',
            passed: true,
            score: 90,
            missingMarkers: [],
            unsafePhrases: [],
            overclaims: [],
            notes: [],
            answerSource: 'live-llm',
            requiresHumanReview: true,
            humanReview: { reviewStatus: 'reviewed-pass' }
          }
        ],
        criticalFailures: 0,
        pendingHumanReviews: 0
      })
    ],
    evaluationRuns: [
      {
        id: 'ib-hr',
        mode: 'internal-brain',
        status: 'completed',
        scenarioCount: 10,
        completedCount: 10,
        passRate: 100,
        averageScore: 95,
        criticalFailures: 0,
        startedAt: new Date().toISOString(),
        createdBy: 'test',
        summary: 'internal high-risk',
        packType: 'high-risk',
        scoringVersion: 'internal-brain-v2'
      }
    ],
    whistleblowingCovered: true,
    privacyRetentionReviewed: false
  })
  assert.equal(gate.privacyRetentionReviewed, false)
  assert.notEqual(gate.recommendation, 'public-launch-ready')
  assert.ok(gate.blockers.some((b) => /privacy and retention review/i.test(b)))
})
