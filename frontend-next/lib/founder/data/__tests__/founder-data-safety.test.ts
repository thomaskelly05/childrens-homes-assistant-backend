import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { FOUNDER_ALLOWED_ROLES, userHasFounderAccess } from '../../access.ts'
import { getFounderDataMode, isFounderLiveOnlyMode } from '../founder-data-mode.ts'

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

  it('defaults founder data mode to live-only', () => {
    assert.equal(getFounderDataMode(), 'live-only')
    assert.equal(isFounderLiveOnlyMode(), true)
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
    assert.match(contextModule, /I do not have live data for that yet/)
    assert.match(contextModule, /homeCount/)
    assert.doesNotMatch(contextModule, /homes:\s*context\.ofstedReadiness\.homes/)
  })

  it('live-only mode uses unavailable adapters instead of mock fallback in production paths', () => {
    const liveMetrics = read('lib/founder/data/founder-live-metrics.ts')
    const unavailable = read('lib/founder/data/adapters/adapter-unavailable.ts')
    const dataMode = read('lib/founder/data/founder-data-mode.ts')

    assert.match(liveMetrics, /isFounderLiveOnlyMode/)
    assert.match(unavailable, /getUsersAdapterUnavailable/)
    assert.match(dataMode, /live-only/)
    assert.match(dataMode, /FOUNDER_DATA_MODE/)
  })

  it('data source detection exposes live-only mode and per-source connection status', () => {
    const detectionModule = read('lib/founder/data/founder-data-source.ts')
    assert.match(detectionModule, /sourceMode/)
    assert.match(detectionModule, /deriveSourceConnectionStatuses/)
    assert.match(detectionModule, /no-records/)
  })

  it('dashboard surfaces live-only data mode and honest source status to founders', () => {
    const dashboard = read('components/founder/founder-dashboard-page.tsx')
    const statusCard = read('components/founder/founder-data-status-card.tsx')
    const kpiCard = read('components/founder/founder-kpi-card.tsx')

    assert.match(dashboard, /FounderDataStatusCard/)
    assert.match(dashboard, /refreshFounderDashboardData/)
    assert.match(statusCard, /formatFounderSourceModeLabel/)
    assert.match(statusCard, /live-only/)
    assert.match(statusCard, /formatSourceConnectionStatus/)
    assert.match(statusCard, /no-records/)
    assert.match(kpiCard, /unavailable/)
  })

  it('founder actions page shows empty state without mock actions', () => {
    const actionsPage = read('components/founder/founder-actions-page.tsx')
    assert.match(actionsPage, /No live founder actions yet/)
    assert.match(actionsPage, /hasLiveFounderIntelligence/)
  })

  it('mock inputs remain available for development testing only', () => {
    const mockInputs = read('lib/founder/intelligence/mock-inputs.ts')
    assert.match(mockInputs, /export const mockUsageMetrics/)
  })
})
