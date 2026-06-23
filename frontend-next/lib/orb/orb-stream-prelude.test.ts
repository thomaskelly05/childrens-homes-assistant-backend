import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  mergePreludeWithAnswer,
  stripDuplicatePreludeFromAnswer
} from './orb-stream-prelude.ts'

const here = dirname(fileURLToPath(import.meta.url))

test('stripDuplicatePreludeFromAnswer removes repeated instant line', () => {
  const prelude = 'Here is a simple daily record draft.'
  const answer = `${prelude}\n\n${prelude}\n\nBreakfast was calm.`
  const body = stripDuplicatePreludeFromAnswer(answer, prelude)
  assert.equal(body.includes(prelude), false)
  assert.match(body, /Breakfast was calm/)
})

test('mergePreludeWithAnswer keeps prelude once', () => {
  const prelude = 'Immediate safety comes first.'
  const merged = mergePreludeWithAnswer(prelude, `${prelude}\n\nEscalate to manager.`)
  assert.equal(merged.split(prelude).length - 1, 1)
})

test('standalone SSE parser supports prelude events', () => {
  const parserPath = join(here, 'standalone-sse-parser.ts')
  const source = readFileSync(parserPath, 'utf8')
  assert.match(source, /event: 'prelude'/)
  assert.match(source, /StandaloneOrbStreamPrelude/)
})

test('orb-chat-latency exports first_visible_assistant_ms', () => {
  const latencyPath = join(here, 'orb-chat-latency.ts')
  const source = readFileSync(latencyPath, 'utf8')
  assert.match(source, /first_visible_assistant/)
  assert.match(source, /instant_line_visible/)
})
