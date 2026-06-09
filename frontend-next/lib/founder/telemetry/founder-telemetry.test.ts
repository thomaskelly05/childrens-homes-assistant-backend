import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder telemetry V1', () => {
  it('redaction module blocks identifiable metadata keys', () => {
    const redaction = read('lib/founder/telemetry/founder-telemetry-redaction.ts')
    assert.match(redaction, /childName/)
    assert.match(redaction, /promptBody/)
    assert.match(redaction, /redactTelemetryMetadata/)
    assert.match(redaction, /findBlockedTelemetryKeys/)
  })

  it('telemetry client posts events and fetches founder-only summary', () => {
    const client = read('lib/founder/telemetry/founder-telemetry-client.ts')
    assert.match(client, /postFounderTelemetryEvent/)
    assert.match(client, /fetchFounderTelemetrySummary/)
    assert.match(client, /\/api\/founder\/telemetry/)
  })

  it('API handler allows authenticated submit and founder-only summary read', () => {
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    assert.match(handler, /proxyToBackendTelemetry/)
    assert.match(handler, /telemetry/)
    assert.match(handler, /'authenticated'/)
    assert.match(handler, /'founder'/)
  })

  it('summary type includes required founder dashboard fields', () => {
    const types = read('lib/founder/telemetry/founder-telemetry-types.ts')
    assert.match(types, /totalEvents/)
    assert.match(types, /eventsToday/)
    assert.match(types, /orbConversations/)
    assert.match(types, /estimatedAiCost/)
    assert.match(types, /feedbackCount/)
    assert.match(types, /lastUpdated/)
  })

  it('instrumentation hooks exist for ORB, dictate, auth and exports', () => {
    const instrumentation = read('lib/founder/telemetry/founder-telemetry-instrumentation.ts')
    assert.match(instrumentation, /instrumentOrbChatSubmitted/)
    assert.match(instrumentation, /instrumentDictateCompleted/)
    assert.match(instrumentation, /instrumentUserLogin/)
    assert.match(instrumentation, /instrumentPdfExport/)
    assert.match(instrumentation, /instrumentFeedbackSubmitted/)
  })

  it('founder pages consume telemetry summary', () => {
    assert.match(read('components/founder/founder-telemetry-page.tsx'), /refreshFounderTelemetrySummary/)
    assert.match(read('components/founder/founder-dashboard-page.tsx'), /getFounderTelemetrySummaryForDashboard/)
    assert.match(read('components/founder/founder-briefing-page.tsx'), /getFounderTelemetrySummaryForDashboard/)
    assert.match(read('components/founder/founder-team-page.tsx'), /getFounderTelemetrySummary/)
    assert.match(read('components/founder/orb-founder/founder-orb-page.tsx'), /getFounderTelemetrySummary/)
  })
})
