import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

test('quality lab client defaults to live-llm run mode', () => {
  const client = read('lib/founder/quality-lab/quality-lab-client.ts')
  assert.match(client, /run_mode: input\.runMode \?\? 'live-llm'/)
})

test('quality run service does not hardcode template answers', () => {
  const service = read('lib/founder/quality-lab/quality-run-service.ts')
  assert.doesNotMatch(service, /useSampleAnswers:\s*true\s*\n\s*\}\)/)
  assert.match(service, /runMode \?\? 'live-llm'/)
})

test('proposal generator handles live-llm-failure type', () => {
  const generator = read('lib/founder/quality-lab/quality-proposal-generator.ts')
  assert.match(generator, /live-llm-failure/)
})

test('scenario bank includes whistleblowing scenario id', () => {
  const scenarios = readFileSync(
    join(root, '..', 'assistant/knowledge/orb_expert_scenarios.py'),
    'utf8'
  )
  assert.match(scenarios, /GOLD-054-whistleblowing/)
  assert.match(scenarios, /"whistleblowing"/)
})

test('human review store updates pending review counts', () => {
  const store = read('lib/founder/quality-lab/human-review-store.ts')
  assert.match(store, /pendingHumanReviews/)
  assert.match(store, /setQualityRunsCache/)
})

test('retest preserves original run history', () => {
  const service = read('lib/founder/quality-lab/quality-run-service.ts')
  assert.match(service, /retestOfRunId/)
  assert.match(service, /Original result preserved in history/)
})
