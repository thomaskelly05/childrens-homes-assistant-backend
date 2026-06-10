import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Intelligence Centre V1', () => {
  it('intelligence API routes require founder session', () => {
    const api = read('lib/founder/intelligence-centre/intelligence-api.ts')
    assert.match(api, /requireFounderSession/)
    assert.match(read('app/api/founder/intelligence/snapshot/route.ts'), /handleIntelligenceSnapshotGet/)
    assert.match(read('app/api/founder/intelligence/briefings/route.ts'), /handleIntelligenceBriefingsGet/)
  })

  it('snapshot does not invent revenue when billing unavailable', () => {
    const builder = read('lib/founder/intelligence-centre/intelligence-source-builder.ts')
    assert.match(builder, /Revenue unavailable/)
    const score = read('lib/founder/intelligence-centre/founder-score-engine.ts')
    assert.match(score, /Live billing not connected/)
    assert.match(score, /scored conservatively/)
  })

  it('missing data creates limitations', () => {
    const builder = read('lib/founder/intelligence-centre/intelligence-source-builder.ts')
    assert.match(builder, /Live telemetry not available/)
    assert.match(builder, /No evidence packs generated yet/)
    assert.match(builder, /do not invent/)
  })

  it('score is conservative when data is missing', () => {
    const score = read('lib/founder/intelligence-centre/founder-score-engine.ts')
    assert.match(score, /conservative/)
    assert.match(score, /Quality Lab not run/)
    assert.match(score, /clamp/)
  })

  it('priorities are based on real persisted data paths', () => {
    const source = read('lib/founder/intelligence-centre/founder-priority-engine.ts')
    assert.match(source, /getFollowUpRecommendations/)
    assert.match(source, /getPacksNeedingApproval/)
    assert.match(source, /snapshot\.source === 'unavailable'/)
    assert.match(source, /\.slice\(0, 7\)/)
  })

  it('external briefings require approval', () => {
    const types = read('lib/founder/intelligence-centre/intelligence-centre-types.ts')
    assert.match(types, /EXTERNAL_BRIEFING_TYPES/)
    const generator = read('lib/founder/intelligence-centre/founder-briefing-generator.ts')
    assert.match(generator, /createApprovalItem/)
    assert.match(generator, /type: 'founder-briefing'/)
    assert.match(generator, /needs-review/)
  })

  it('ORB Founder uses intelligence centre and does not invent missing facts', () => {
    const orb = read('lib/founder/orb-founder/orb-founder-intelligence.ts')
    assert.match(orb, /generateFounderIntelligenceSnapshotSync/)
    assert.match(orb, /will not invent/)
    assert.match(orb, /limitations/)
    const engine = read('lib/founder/orb-founder/orb-founder-engine.ts')
    assert.match(engine, /orb-founder-intelligence/)
  })

  it('operating loop can generate intelligence snapshot', () => {
    const loop = read('lib/founder/operating-loop/founder-operating-loop.ts')
    assert.match(loop, /generateFounderIntelligenceSnapshot/)
    assert.match(loop, /generateIntelligenceSnapshot/)
    const types = read('lib/founder/operating-loop/operating-loop-types.ts')
    assert.match(types, /generateIntelligenceSnapshot/)
  })

  it('intelligence page uses single bootstrap API pattern', () => {
    const page = read('components/founder/founder-intelligence-page.tsx')
    assert.match(page, /founderGet/)
    assert.doesNotMatch(page, /fetch\(['"]\/api\/providers/)
    assert.match(page, /data-testid="founder-intelligence-page"/)
    assert.match(read('components/founder/founder-nav-header.tsx'), /\/founder\/intelligence/)
  })

  it('strategic alignment respects deferred objectives', () => {
    const engine = read('lib/founder/intelligence-centre/strategic-alignment-engine.ts')
    assert.match(engine, /deferredObjectives/)
    assert.match(engine, /isDeferred/)
    assert.match(engine, /Deferred in Founder Memory/)
  })

  it('narrative external copy requires approval', () => {
    const detail = read('components/founder/founder-intelligence-briefing-detail-page.tsx')
    assert.match(detail, /external copy requires approval/i)
    const store = read('lib/founder/intelligence-centre/intelligence-store.ts')
    assert.match(store, /queueNarrativeForApproval/)
    assert.match(store, /founder-narrative/)
  })

  it('audit logs written for generated snapshots and briefings', () => {
    const store = read('lib/founder/intelligence-centre/intelligence-store.ts')
    assert.match(store, /appendAuditLog/)
    assert.match(store, /Founder intelligence snapshot generated/)
    assert.match(store, /briefing generated/)
  })

  it('non-founder cannot access intelligence APIs via session gate', () => {
    const api = read('lib/founder/intelligence-centre/intelligence-api.ts')
    assert.match(api, /if \(!session\.ok\) return session\.response/)
    assert.match(read('lib/founder/auth/founder-session.ts'), /founder/)
  })
})
