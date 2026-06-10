import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  FOUNDER_PERSISTENCE_ENTITY_SLUGS,
  isKnownPersistenceEntitySlug,
  unknownPersistenceEntityMessage
} from './founder-api-entities.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function routeExists(relativePath: string) {
  try {
    read(relativePath)
    return true
  } catch {
    return false
  }
}

const REQUIRED_GET_ROUTES = [
  '/api/founder/persistence/actions',
  '/api/founder/persistence/approvals',
  '/api/founder/persistence/content',
  '/api/founder/persistence/build-briefs',
  '/api/founder/persistence/quality-runs',
  '/api/founder/persistence/quality-proposals',
  '/api/founder/persistence/expert-reviews',
  '/api/founder/persistence/memories',
  '/api/founder/persistence/evidence-packs',
  '/api/founder/persistence/operating-loop-runs',
  '/api/founder/telemetry/summary?days=30',
  '/api/founder/operating-loop/runs',
  '/api/founder/live/providers',
  '/api/founder/live/homes',
  '/api/founder/live/inspection-readiness',
  '/api/founder/live/orb-feedback-summary?days=30',
  '/api/founder/live/orb-billing-usage?days=30',
  '/api/founder/session'
] as const

const REQUIRED_POST_ROUTES = [
  '/api/founder/persistence/memories',
  '/api/founder/persistence/approvals',
  '/api/founder/operating-loop/run'
] as const

describe('Founder API route smoke contract', () => {
  it('next.config excludes /api/founder from backend rewrite', () => {
    const config = read('next.config.ts')
    assert.match(config, /\/api\/\(\(\?!founder/)
    assert.doesNotMatch(config, /source: '\/api\/:path\*',\s*\n\s*destination: `\$\{backendOrigin\}\/api\/:path\*`/)
  })

  it('persistence entity slugs cover production stores', () => {
    for (const slug of [
      'actions',
      'approvals',
      'content',
      'build-briefs',
      'quality-runs',
      'quality-proposals',
      'expert-reviews',
      'memories',
      'operating-loop-runs',
      'staff-team-runs',
      'agent-runs',
      'safety-reviews',
      'audit-log'
    ]) {
      assert.equal(isKnownPersistenceEntitySlug(slug), true, slug)
    }
    assert.equal(FOUNDER_PERSISTENCE_ENTITY_SLUGS.length >= 14, true)
  })

  it('unknown entity helper is explicit', () => {
    assert.match(unknownPersistenceEntityMessage('not-real'), /Unknown founder persistence entity/)
  })

  it('explicit App Router proxies exist for persistence, telemetry and operating loop', () => {
    assert.equal(routeExists('app/api/founder/persistence/[entity]/route.ts'), true)
    assert.equal(routeExists('app/api/founder/persistence/[entity]/[id]/route.ts'), true)
    assert.equal(routeExists('app/api/founder/persistence/approvals/[id]/decision/route.ts'), true)
    assert.equal(routeExists('app/api/founder/telemetry/summary/route.ts'), true)
    assert.equal(routeExists('app/api/founder/operating-loop/run/route.ts'), true)
    assert.equal(routeExists('app/api/founder/operating-loop/runs/route.ts'), true)
    assert.equal(routeExists('app/api/founder/operating-loop/runs/[id]/route.ts'), true)
    assert.equal(routeExists('app/api/founder/[[...path]]/route.ts'), true)
  })

  it('handler proxies to /founder-os backend namespace', () => {
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    const session = read('lib/founder/auth/founder-session.ts')
    assert.match(handler, /founder-os\/persistence/)
    assert.match(handler, /founder-os\/telemetry/)
    assert.match(session, /Founder access required/)
    assert.match(session, /body\.user/)
    assert.match(handler, /items: \[\], count: 0/)
  })

  it('live data proxies exist and adapters use /api/founder/live', () => {
    assert.equal(routeExists('app/api/founder/live/[target]/route.ts'), true)
    assert.equal(routeExists('app/api/founder/session/route.ts'), true)
    const providers = read('lib/founder/data/adapters/providers-adapter.ts')
    assert.match(providers, /fetchFounderLiveJson<.*>\('providers'\)/)
    const billing = read('lib/founder/data/adapters/billing-adapter.ts')
    assert.match(billing, /orb-billing-usage/)
    const orb = read('lib/founder/data/adapters/orb-conversations-adapter.ts')
    assert.doesNotMatch(orb, /\/orb\/admin\//)
  })

  it('operating loop client uses founder API proxy for POST', () => {
    const client = read('lib/founder/operating-loop/operating-loop-client.ts')
    const apiClient = read('lib/founder/api/founder-api-client.ts')
    assert.match(client, /founderPost/)
    assert.match(apiClient, /x-csrf-token/)
  })

  it('documents required GET smoke endpoints', () => {
    for (const route of REQUIRED_GET_ROUTES) {
      assert.match(route, /^\/api\/founder\//)
    }
  })

  it('documents required POST smoke endpoints', () => {
    for (const route of REQUIRED_POST_ROUTES) {
      assert.match(route, /^\/api\/founder\//)
    }
  })
})
