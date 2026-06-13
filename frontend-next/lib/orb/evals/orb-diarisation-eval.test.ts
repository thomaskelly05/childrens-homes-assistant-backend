import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evaluateDiarisationFixture,
  ORB_DIARISATION_EVAL_FIXTURES,
  runAllDiarisationEvals
} from './orb-diarisation-eval.ts'

describe('ORB diarisation eval placeholder', () => {
  it('includes required diarisation scenarios', () => {
    const ids = new Set(ORB_DIARISATION_EVAL_FIXTURES.map((f) => f.id))
    assert.ok(ids.has('two_speakers'))
    assert.ok(ids.has('three_speakers'))
    assert.ok(ids.has('low_confidence_turn'))
    assert.ok(ids.has('overlapping_unclear'))
    assert.ok(ids.has('unconfirmed_speaker_label'))
    assert.ok(ids.has('confirmed_speaker_role'))
  })

  it('ORB consumes provider diarisation when present', () => {
    const fixture = ORB_DIARISATION_EVAL_FIXTURES.find((f) => f.id === 'two_speakers')!
    const result = evaluateDiarisationFixture(fixture)
    assert.equal(result.passed, true)
    assert.equal(result.hasProviderDiarisation, true)
    assert.equal(result.segmentCount, 2)
  })

  it('low confidence warnings appear', () => {
    const fixture = ORB_DIARISATION_EVAL_FIXTURES.find((f) => f.id === 'low_confidence_turn')!
    const result = evaluateDiarisationFixture(fixture)
    assert.equal(result.passed, true)
    assert.ok(result.mappingWarnings.some((w) => w.includes('Low confidence')))
  })

  it('adult confirmation required for generic speaker labels', () => {
    const fixture = ORB_DIARISATION_EVAL_FIXTURES.find((f) => f.id === 'unconfirmed_speaker_label')!
    const result = evaluateDiarisationFixture(fixture)
    assert.equal(result.passed, true)
  })

  it('all diarisation fixtures pass evaluation', () => {
    const results = runAllDiarisationEvals()
    const failed = results.filter((r) => !r.passed)
    assert.equal(failed.length, 0, failed.map((f) => `${f.fixtureId}: ${f.failures.join(', ')}`).join('\n'))
  })
})
