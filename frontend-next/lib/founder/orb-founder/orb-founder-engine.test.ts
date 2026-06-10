import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Founder stabilisation regression', () => {
  it('revenue module does not invent MRR when billing missing', () => {
    const revenue = read('lib/founder/orb-founder/orb-founder-revenue.ts')
    assert.match(revenue, /noBillingAnswer/)
    assert.match(revenue, /cannot state MRR/)
    assert.match(revenue, /REVENUE_FORECAST_DISCLAIMER/)
  })

  it('relationship answers do not invent investor or provider interest', () => {
    const relationships = read('lib/founder/orb-founder/orb-founder-relationships.ts')
    assert.match(relationships, /noRelationshipDataAnswer/)
    assert.match(relationships, /will not invent/)
    assert.match(relationships, /approval before any external/)
  })

  it('evidence answers require approval and state limitations', () => {
    const evidence = read('lib/founder/orb-founder/orb-founder-evidence.ts')
    assert.match(evidence, /approval is required before external use/)
    assert.match(evidence, /No live provider evidence yet/)
  })

  it('engine blocks external post and send requests', () => {
    const engine = read('lib/founder/orb-founder/orb-founder-engine.ts')
    assert.match(engine, /answerExternalPostBlocked/)
    assert.match(engine, /post to linkedin/)
    assert.match(engine, /cannot post, send, publish/)
    assert.match(engine, /I will never auto-post/)
  })

  it('launch readiness uses intelligence centre conservatively', () => {
    const intelligence = read('lib/founder/orb-founder/orb-founder-intelligence.ts')
    assert.match(intelligence, /conservative/)
    assert.match(intelligence, /will not invent/)
    assert.match(intelligence, /founder readiness score/)
  })

  it('focus today routes through intelligence centre', () => {
    const intelligence = read('lib/founder/orb-founder/orb-founder-intelligence.ts')
    assert.match(intelligence, /answerFocusToday/)
    assert.match(intelligence, /No priorities generated from current data/)
  })

  it('ORB usage answer does not hardcode percentage growth', () => {
    const engine = read('lib/founder/orb-founder/orb-founder-engine.ts')
    assert.doesNotMatch(engine, /up 18%/i)
    assert.match(engine, /ORB recorded/)
  })

  it('live guard returns honest no-data answer', () => {
    const guard = read('lib/founder/orb-founder/orb-founder-live-guard.ts')
    assert.match(guard, /I do not have live data for that yet/)
  })
})
