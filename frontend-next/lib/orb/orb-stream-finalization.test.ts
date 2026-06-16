import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveOrbStreamedAnswer } from './orb-fast-opening.ts'

describe('ORB stream final answer resolution', () => {
  const rawStream =
    'Daily Record\n\nChild A watched television Child A accepted the toast and appeared calmer.'
  const repairedMetadata =
    'Daily Record\n\nChild A watched television. Child A accepted the toast and appeared calmer before bedtime.'

  it('prefers repaired metadata answer over longer raw stream partial', () => {
    const resolved = resolveOrbStreamedAnswer(repairedMetadata, rawStream, {
      answerRepaired: true
    })
    assert.equal(resolved, repairedMetadata)
    assert.doesNotMatch(resolved, /watched television Child A/)
  })

  it('prefers metadata when stream completed without error even without explicit flag', () => {
    const resolved = resolveOrbStreamedAnswer(repairedMetadata, rawStream)
    assert.equal(resolved, repairedMetadata)
  })

  it('falls back to partial only when metadata is absent', () => {
    const resolved = resolveOrbStreamedAnswer(undefined, rawStream, {
      errorDetail: 'stream_incomplete'
    })
    assert.equal(resolved, rawStream)
  })

  it('prefers repaired metadata on stream error when repair flag set', () => {
    const resolved = resolveOrbStreamedAnswer(repairedMetadata, rawStream, {
      errorDetail: 'stream_interrupted',
      answerRepaired: true
    })
    assert.equal(resolved, repairedMetadata)
  })
})
