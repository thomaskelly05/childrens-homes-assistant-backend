import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder OS performance budget', () => {
  it('/founder dashboard uses bootstrap-backed refresh not live probe storm', () => {
    const intelligence = read('lib/founder/intelligence-service.ts')
    assert.match(intelligence, /seedLiveMetricsFromBootstrap/)
    assert.match(intelligence, /loadFounderBootstrap/)
    assert.match(read('lib/founder/bootstrap/founder-bootstrap-metrics.ts'), /buildLiveMetricsFromBootstrap/)
    assert.doesNotMatch(intelligence, /probeFounderDataSources/)
  })

  it('bootstrap client dedupes in-flight requests', () => {
    const client = read('lib/founder/bootstrap/founder-bootstrap-client.ts')
    assert.match(client, /loadPromise/)
    assert.match(client, /SESSION_CACHE_TTL_MS/)
    assert.match(client, /emptyBootstrap/)
  })

  it('bootstrap tolerates optional live source failures', () => {
    const proxy = read('lib/founder/live/founder-live-proxy.ts')
    assert.match(proxy, /FOUNDER_OPTIONAL_LIVE_SECTIONS/)
    assert.match(proxy, /sectionErrors/)
    assert.match(proxy, /treat404AsEmpty/)
  })

  it('telemetry page does not re-fetch live adapters on load', () => {
    const page = read('components/founder/founder-telemetry-page.tsx')
    assert.doesNotMatch(page, /hydrateFounderTelemetryFromLiveData/)
    assert.doesNotMatch(page, /refreshFounderTelemetrySummary/)
    assert.match(page, /refreshFounderDashboardData/)
  })

  it('team and operating loop pages avoid telemetry live storm', () => {
    const team = read('components/founder/founder-team-page.tsx')
    const loop = read('components/founder/founder-operating-loop-page.tsx')
    assert.doesNotMatch(team, /hydrateFounderTelemetryFromLiveData/)
    assert.doesNotMatch(loop, /hydrateFounderTelemetryFromLiveData/)
  })

  it('layout uses single persistence hydrator', () => {
    const layout = read('app/founder/layout.tsx')
    const hydrator = read('components/founder/founder-persistence-hydrator.tsx')
    assert.match(layout, /FounderPersistenceHydrator/)
    assert.match(hydrator, /hydrateAllFounderPersistence/)
    assert.match(hydrator, /FounderDegradedBanner/)
  })

  it('founder API client blocks direct admin paths', () => {
    const api = read('lib/founder/api/founder-api-client.ts')
    assert.match(api, /BLOCKED_BROWSER_PATH_PREFIXES/)
    assert.match(api, /\/orb\/admin\//)
  })
})
