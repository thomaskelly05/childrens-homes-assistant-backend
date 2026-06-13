import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evaluateFixtureDeterministic,
  resolveOrbLiveEvalMode,
  runOrbLiveLlmEval,
  LIVE_LLM_EVAL_GUIDANCE
} from './orb-live-llm-eval.ts'
import { ORB_RESIDENTIAL_LAUNCH_FIXTURES } from './orb-residential-launch-fixtures.ts'

describe('ORB live LLM eval harness', () => {
  it('defaults to deterministic CI mode without API keys', () => {
    const prev = process.env.ORB_LIVE_LLM_EVAL
    const prevKey = process.env.OPENAI_API_KEY
    delete process.env.ORB_LIVE_LLM_EVAL
    delete process.env.OPENAI_API_KEY
    assert.equal(resolveOrbLiveEvalMode(), 'deterministic')
    if (prev !== undefined) process.env.ORB_LIVE_LLM_EVAL = prev
    if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey
  })

  it('deterministic eval passes all launch fixtures', async () => {
    const run = await runOrbLiveLlmEval()
    assert.equal(run.mode, 'deterministic')
    assert.equal(run.fixtureCount, ORB_RESIDENTIAL_LAUNCH_FIXTURES.length)
    assert.equal(run.failed, 0)
    assert.equal(run.passed, run.fixtureCount)
    assert.equal(run.liveEvalRan, false)
  })

  it('scores all required dimensions per fixture', () => {
    const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES[0]!
    const result = evaluateFixtureDeterministic(fixture)
    assert.equal(result.mode, 'deterministic')
    assert.ok(result.scores.child_centredness)
    assert.ok(result.scores.therapeutic_language)
    assert.ok(result.scores.orb_write_readiness)
    assert.equal(result.traceSummary?.adultReviewRequired, true)
  })

  it('documents live eval guidance', () => {
    assert.match(LIVE_LLM_EVAL_GUIDANCE, /ORB_LIVE_LLM_EVAL/)
    assert.match(LIVE_LLM_EVAL_GUIDANCE, /Never use real child data/)
  })

  it('live mode marks manual review when not configured', async () => {
    const prev = process.env.ORB_LIVE_LLM_EVAL
    process.env.ORB_LIVE_LLM_EVAL = '1'
    delete process.env.OPENAI_API_KEY
    const fixture = ORB_RESIDENTIAL_LAUNCH_FIXTURES[0]!
    const { evaluateFixtureLive } = await import('./orb-live-llm-eval.ts')
    const result = await evaluateFixtureLive(fixture)
    assert.equal(result.requiresManualReview, true)
    if (prev !== undefined) process.env.ORB_LIVE_LLM_EVAL = prev
    else delete process.env.ORB_LIVE_LLM_EVAL
  })
})
