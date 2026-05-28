import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseStandaloneOrbSseBlock } from './standalone-sse-parser.ts'

describe('standalone ORB SSE parser', () => {
  it('parses token events', () => {
    const event = parseStandaloneOrbSseBlock('event: token\ndata: {"delta":"Hi"}\n')
    assert.equal(event?.event, 'token')
    if (event?.event === 'token') {
      assert.equal(event.delta, 'Hi')
    }
  })

  it('parses metadata, done and error events', () => {
    const metadata = parseStandaloneOrbSseBlock(
      'event: metadata\ndata: {"ok":true,"answer":"Done","standalone":true}\n'
    )
    assert.equal(metadata?.event, 'metadata')

    const done = parseStandaloneOrbSseBlock('event: done\ndata: {"ok":true}\n')
    assert.equal(done?.event, 'done')

    const error = parseStandaloneOrbSseBlock('event: error\ndata: {"error":"provider_unavailable"}\n')
    assert.equal(error?.event, 'error')
    if (error?.event === 'error') {
      assert.equal(error.error, 'provider_unavailable')
    }
  })
})
