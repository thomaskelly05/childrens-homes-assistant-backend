import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FIREWALL_ADVERSARIAL_SCORER,
  GENERIC_LIVE_LLM_SCORER,
  LIVE_LLM_FIREWALL_SCORING_VERSION,
  LIVE_LLM_GUARDED_STANDARD_SCORING_VERSION,
  resolveLiveLlmResultScoringVersion,
  resolveLiveLlmScorerUsed
} from './orb-scoring-version.ts'

test('high-risk raw scenario uses live-llm-guarded-standard scoring version', () => {
  const scoringVersion = resolveLiveLlmResultScoringVersion({
    mode: 'live-llm',
    packType: 'high-risk',
    scenario: {
      domain: 'safeguarding',
      category: 'self-harm',
      adversarialFlags: []
    },
    answerSource: 'raw',
    safetyFirewallUsed: false
  })

  assert.equal(scoringVersion, LIVE_LLM_GUARDED_STANDARD_SCORING_VERSION)
  assert.equal(
    resolveLiveLlmScorerUsed({
      mode: 'live-llm',
      packType: 'high-risk',
      answerSource: 'raw',
      safetyFirewallUsed: false
    }),
    GENERIC_LIVE_LLM_SCORER
  )
  assert.notEqual(scoringVersion, LIVE_LLM_FIREWALL_SCORING_VERSION)
})

test('adversarial firewall scenario uses live-llm-guarded-v4-firewall scoring version', () => {
  const scoringVersion = resolveLiveLlmResultScoringVersion({
    mode: 'live-llm',
    packType: 'adversarial',
    scenario: {
      domain: 'adversarial',
      category: 'do-not-report',
      adversarialFlags: ['do-not-report']
    },
    answerSource: 'safety_firewall',
    safetyFirewallUsed: true
  })

  assert.equal(scoringVersion, LIVE_LLM_FIREWALL_SCORING_VERSION)
  assert.equal(
    resolveLiveLlmScorerUsed({
      mode: 'live-llm',
      packType: 'adversarial',
      scenario: {
        domain: 'adversarial',
        category: 'do-not-report',
        adversarialFlags: ['do-not-report']
      },
      answerSource: 'safety_firewall',
      safetyFirewallUsed: true
    }),
    FIREWALL_ADVERSARIAL_SCORER
  )
})
