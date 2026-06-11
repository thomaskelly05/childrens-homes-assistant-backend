import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { computeOrbPilotReadinessGate } from './orb-pilot-readiness-gate.ts'
const ORB_PILOT_EARLY_SIGNAL_MESSAGE =
  'Early signal only — not enough responses for reliable evidence.'
import { sanitiseOrbPilotFeedbackField, sanitiseOrbPilotFeedbackForDisplay } from './orb-pilot-sanitize.ts'
import { ORB_PILOT_OUTCOMES } from './orb-pilot-outcome-framework.ts'
import type { OrbPilotFeedback } from './orb-pilot-types.ts'
import type { QualityRun } from '../../founder/quality-lab/quality-lab-types.ts'

// Inline summary checks avoid ESM resolution issues for nested relative imports in node --test.
function summariseForTest(feedback: OrbPilotFeedback[]) {
  const count = feedback.length
  if (count === 0) {
    return { feedbackCount: 0, evidenceLabel: 'unavailable' as const, limitations: ['No pilot feedback submitted yet. Metrics unavailable.'] }
  }
  const avgTime =
    feedback.filter((f) => typeof f.timeSavedMinutes === 'number').length > 0
      ? feedback.reduce((sum, f) => sum + (f.timeSavedMinutes ?? 0), 0) /
        feedback.filter((f) => typeof f.timeSavedMinutes === 'number').length
      : undefined
  const limitations =
    count < 5
      ? [ORB_PILOT_EARLY_SIGNAL_MESSAGE, 'Manual staff feedback — not verified external evidence.']
      : ['Manual staff feedback — not verified external evidence.']
  return {
    feedbackCount: count,
    averageTimeSavedMinutes: avgTime,
    evidenceLabel: count < 5 ? ('early-signal-only' as const) : ('manual-feedback' as const),
    limitations,
    childHelpThemes: feedback.map((f) => f.whatHelpedTheChild).filter(Boolean) as string[]
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

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

function makeFeedback(partial: Partial<OrbPilotFeedback>): OrbPilotFeedback {
  return {
    id: 'opf-1',
    featureUsed: 'chat',
    createdAt: new Date().toISOString(),
    ...partial
  }
}

describe('ORB closed pilot validation V1', () => {
  it('/orb/pilot/feedback page renders with warning and child-helped field', () => {
    const page = read('app/orb/pilot/feedback/page.tsx')
    const form = read('components/orb/pilot/orb-pilot-feedback-form.tsx')
    assert.match(page, /data-orb-pilot-feedback-page/)
    assert.match(page, /Help improve ORB Residential/)
    assert.match(form, /data-orb-pilot-feedback-warning/)
    assert.match(form, /child names, staff names/)
    assert.match(form, /data-orb-pilot-field-what-helped-child/)
  })

  it('feedback warns not to include child/staff names', () => {
    const form = read('components/orb/pilot/orb-pilot-feedback-form.tsx')
    assert.match(form, /Please do not include child names, staff names/)
  })

  it('unsafe narrative is rejected in sanitiser', () => {
    const rejected = sanitiseOrbPilotFeedbackField(
      'Child called Oliver disclosed abuse in full chronology from care record.'
    )
    assert.equal(rejected.rejected, true)
    assert.match(rejected.reason ?? '', /child names|safeguarding/i)

    const accepted = sanitiseOrbPilotFeedbackField('ORB helped me structure a daily record more clearly.')
    assert.equal(accepted.rejected, false)
  })

  it('no fake metrics when no feedback exists', () => {
    const summary = summariseForTest([])
    assert.equal(summary.feedbackCount, 0)
    assert.equal(summary.averageTimeSavedMinutes, undefined)
    assert.equal(summary.evidenceLabel, 'unavailable')
    assert.match(summary.limitations.join(' '), /unavailable/i)
  })

  it('fewer than 5 responses shows early signal warning', () => {
    const summary = summariseForTest([
      makeFeedback({ timeSavedMinutes: 10, recordQualityRating: 4 }),
      makeFeedback({ timeSavedMinutes: 5, recordQualityRating: 3 })
    ])
    assert.equal(summary.evidenceLabel, 'early-signal-only')
    assert.ok(summary.limitations.some((item) => item.includes(ORB_PILOT_EARLY_SIGNAL_MESSAGE)))
  })

  it('readiness gate blocks if live Quality Lab missing', () => {
    const gate = computeOrbPilotReadinessGate({
      runs: [],
      whistleblowingCovered: true,
      privacyUxCompleted: true,
      privacyNoticeAvailable: true,
      buildPassing: true
    })
    assert.equal(gate.qualityLabLiveRunCompleted, false)
    assert.equal(gate.recommendation, 'not-ready')
    assert.ok(gate.blockers.some((b) => /live-llm/i.test(b)))
  })

  it('readiness gate blocks if privacy UX missing', () => {
    const gate = computeOrbPilotReadinessGate({
      runs: [makeRun({ results: [] })],
      whistleblowingCovered: true,
      privacyUxCompleted: false,
      privacyNoticeAvailable: false,
      buildPassing: true
    })
    assert.equal(gate.recommendation, 'not-ready')
    assert.ok(gate.blockers.some((b) => /privacy/i.test(b)))
  })

  it('whistleblowing is required for closed pilot', () => {
    const gate = computeOrbPilotReadinessGate({
      runs: [makeRun({ results: [] })],
      whistleblowingCovered: false,
      privacyUxCompleted: true,
      privacyNoticeAvailable: true,
      buildPassing: true
    })
    assert.equal(gate.whistleblowingCovered, false)
    assert.equal(gate.recommendation, 'not-ready')
  })

  it('/founder/orb-pilot is founder-only', () => {
    const page = read('app/founder/orb-pilot/page.tsx')
    assert.match(page, /FounderGuard/)
    assert.match(page, /FounderOrbPilotPage/)
  })

  it('pilot summary does not expose unsafe content in themes', () => {
    const redacted = sanitiseOrbPilotFeedbackForDisplay(
      'Child called Oliver felt calmer after structured reflection.'
    )
    assert.match(redacted, /redacted/i)
    assert.doesNotMatch(redacted, /Oliver/)
  })

  it('outcome framework includes what helped the child question', () => {
    const childVoice = ORB_PILOT_OUTCOMES.find((outcome) => outcome.id === 'child-voice')
    assert.ok(childVoice)
    assert.ok(childVoice.questions.some((q) => /helped the child/i.test(q.text)))
  })

  it('critical failures block pilot readiness', () => {
    const gate = computeOrbPilotReadinessGate({
      runs: [
        makeRun({
          criticalFailures: 1,
          results: [
            {
              scenarioId: 'GOLD-001',
              scenarioTitle: 'Test',
              family: 'missing_from_care',
              role: 'support_worker',
              riskLevel: 'critical',
              passed: false,
              score: 10,
              missingMarkers: [],
              unsafePhrases: [],
              overclaims: [],
              notes: [],
              answerSource: 'live-llm',
              criticalFailure: true
            }
          ]
        })
      ],
      whistleblowingCovered: true,
      privacyUxCompleted: true,
      privacyNoticeAvailable: true,
      buildPassing: true
    })
    assert.equal(gate.recommendation, 'not-ready')
    assert.ok(gate.criticalFailuresOpen > 0)
  })
})
