import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { FOUNDER_ALLOWED_ROLES, userHasFounderAccess } from '../../access.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('founder data safety', () => {
  it('restricts founder dashboard access to founder and admin roles', () => {
    assert.ok(userHasFounderAccess('founder'))
    assert.ok(userHasFounderAccess('admin'))
    assert.ok(userHasFounderAccess('super_admin'))
    assert.equal(userHasFounderAccess('manager'), false)
    assert.equal(userHasFounderAccess('staff'), false)
    assert.equal(userHasFounderAccess(undefined), false)
    assert.ok(FOUNDER_ALLOWED_ROLES.has('administrator'))
  })

  it('founder routes are guarded in the UI layer', () => {
    const guard = read('components/founder/founder-guard.tsx')
    assert.match(guard, /userHasFounderAccess/)
    assert.match(guard, /Access denied/)
  })

  it('data adapters anonymise providers and homes and avoid identifiable fields', () => {
    const providersAdapter = read('lib/founder/data/adapters/providers-adapter.ts')
    const readinessAdapter = read('lib/founder/data/adapters/readiness-adapter.ts')
    const adapterTypes = read('lib/founder/data/adapters/adapter-types.ts')
    const orbAdapter = read('lib/founder/data/adapters/orb-conversations-adapter.ts')

    assert.match(providersAdapter, /anonymiseProviderLabel/)
    assert.match(readinessAdapter, /anonymiseHomeLabel/)
    assert.match(adapterTypes, /FORBIDDEN_IDENTIFIABLE_FIELDS/)
    assert.match(orbAdapter, /no safeguarding narrative content included/)
    assert.doesNotMatch(providersAdapter, /providerName:\s*row\.name/)
    assert.doesNotMatch(readinessAdapter, /homeName:\s*gap\./)
  })

  it('ORB founder context serialisation declares data basis and omits home records', () => {
    const contextModule = read('lib/founder/orb-founder/orb-founder-context.ts')
    assert.match(contextModule, /dataSourceStatus/)
    assert.match(contextModule, /answerDataBasis/)
    assert.match(contextModule, /Do NOT present them as verified live platform truth/)
    assert.match(contextModule, /homeCount/)
    assert.doesNotMatch(contextModule, /homes:\s*context\.ofstedReadiness\.homes/)
  })

  it('intelligence service preserves mock fallback via live metrics pipeline', () => {
    const service = read('lib/founder/intelligence-service.ts')
    const liveMetrics = read('lib/founder/data/founder-live-metrics.ts')
    const mockInputs = read('lib/founder/intelligence/mock-inputs.ts')

    assert.match(service, /loadFounderLiveMetrics/)
    assert.match(service, /getFounderLiveMetricsSync/)
    assert.match(liveMetrics, /getUsersAdapterFallback/)
    assert.match(liveMetrics, /mockUsageMetrics/)
    assert.match(mockInputs, /export const mockUsageMetrics/)
  })

  it('data source detection exposes hybrid and mock modes with feature event placeholder', () => {
    const detectionModule = read('lib/founder/data/founder-data-source.ts')
    assert.match(detectionModule, /sourceMode/)
    assert.match(detectionModule, /featureEventsAvailable: false/)
    assert.match(detectionModule, /deriveSourceMode/)
  })

  it('dashboard surfaces data mode and connected sources to founders', () => {
    const dashboard = read('components/founder/founder-dashboard-page.tsx')
    const statusCard = read('components/founder/founder-data-status-card.tsx')

    assert.match(dashboard, /FounderDataStatusCard/)
    assert.match(dashboard, /refreshFounderDashboardData/)
    assert.match(statusCard, /Some founder intelligence is currently estimated or mocked/)
    assert.match(statusCard, /Sources connected/)
  })
})
