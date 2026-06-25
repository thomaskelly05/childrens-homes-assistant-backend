import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('IndiCare Lab shadow review adapter', () => {
  it('exports createShadowReviewEventForOrbOutput and trigger helper', () => {
    const adapter = readSource('lib/indicare-lab/review-events/orb-review-adapter.ts')
    assert.match(adapter, /export function createShadowReviewEventForOrbOutput/)
    assert.match(adapter, /export function triggerShadowReviewForOrbOutput/)
    assert.match(adapter, /never throws/i)
  })

  it('config defaults shadow review off outside development', () => {
    const config = readSource('lib/indicare-lab/review-events/review-event-config.ts')
    assert.match(config, /INDICARE_LAB_SHADOW_REVIEW_ENABLED/)
    assert.match(config, /INDICARE_LAB_STORE_FULL_TEXT/)
    assert.match(config, /INDICARE_LAB_REDACT_NAMES/)
    assert.match(config, /INDICARE_LAB_MAX_REVIEW_TEXT_LENGTH/)
    assert.match(config, /liveBlocking: false/)
    assert.match(config, /liveRewriting: false/)
  })

  it('redaction removes contact details and supports name redaction', () => {
    const redaction = readSource('lib/indicare-lab/review-events/review-event-redaction.ts')
    assert.match(redaction, /\[contact removed\]/)
    assert.match(redaction, /\[name\]/)
    assert.match(redaction, /wasRedacted/)
  })

  it('ORB brain router triggers shadow review without altering response', () => {
    const router = readSource('lib/orb/orb-brain-router.ts')
    assert.match(router, /triggerShadowReviewForOrbOutput/)
    assert.match(router, /return response/)
    assert.match(router, /fire-and-forget/i)
  })

  it('dictate client wires shadow review with TODO for remaining stations', () => {
    const dictate = readSource('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(dictate, /triggerShadowReviewForOrbOutput/)
    assert.match(dictate, /TODO: wire orb-write, orb-communicate, and orb-voice/)
  })

  it('review events UI shows origin and redaction badges', () => {
    const panel = readSource('components/indicare-lab/review-events-panel.tsx')
    assert.match(panel, /REVIEW_ORIGIN_LABELS/)
    assert.match(panel, /Full text not stored/)
    assert.match(panel, /Redacted/)
  })

  it('pattern intelligence panel and repository layer exist for Phase 4', () => {
    const panel = readSource('components/indicare-lab/pattern-intelligence-panel.tsx')
    assert.match(panel, /Pattern intelligence/)
    assert.match(panel, /Create build brief/)
    assert.match(panel, /Add to approval queue/)

    const engine = readSource('lib/indicare-lab/patterns/pattern-detection-engine.ts')
    assert.match(engine, /detectPatternsFromReviewEvents/)
    assert.match(engine, /missing child voice/i)

    const storage = readSource('lib/indicare-lab/review-events/review-event-storage.ts')
    assert.match(storage, /listReviewEventsByPatternInputs/)
    assert.match(storage, /lab-storage/)

    const labStorage = readSource('lib/indicare-lab/storage/lab-storage.ts')
    assert.match(labStorage, /in-memory|memory-fallback/i)

    const shell = readSource('components/indicare-lab/indicare-lab-shell.tsx')
    assert.match(shell, /pattern-intelligence/)
  })
})
