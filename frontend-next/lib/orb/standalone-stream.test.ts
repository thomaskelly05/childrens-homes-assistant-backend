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

  it('preserves leading spaces in token deltas', () => {
    const hello = parseStandaloneOrbSseBlock('event: token\ndata: {"delta":" Hello"}\n')
    const world = parseStandaloneOrbSseBlock('event: token\ndata: {"delta":" world"}\n')
    assert.equal(hello?.event, 'token')
    assert.equal(world?.event, 'token')
    if (hello?.event === 'token' && world?.event === 'token') {
      assert.equal(hello.delta, ' Hello')
      assert.equal(world.delta, ' world')
      assert.equal(`${hello.delta}${world.delta}`, ' Hello world')
    }
  })

  it('preserves heading spacing and newlines in token deltas', () => {
    const heading = parseStandaloneOrbSseBlock(
      'event: token\ndata: {"delta":"\\n\\n### Practical Answer"}\n'
    )
    const list = parseStandaloneOrbSseBlock('event: token\ndata: {"delta":" Date and time"}\n')
    assert.equal(heading?.event, 'token')
    assert.equal(list?.event, 'token')
    if (heading?.event === 'token' && list?.event === 'token') {
      assert.equal(heading.delta, '\n\n### Practical Answer')
      assert.equal(list.delta, ' Date and time')
    }
  })

  it('accepts whitespace-only token deltas', () => {
    const space = parseStandaloneOrbSseBlock('event: token\ndata: {"delta":" "}\n')
    assert.equal(space?.event, 'token')
    if (space?.event === 'token') {
      assert.equal(space.delta, ' ')
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
