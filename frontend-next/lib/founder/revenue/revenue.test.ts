import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Revenue Intelligence V1', () => {
  it('revenue API routes require founder session', () => {
    const api = read('lib/founder/revenue/revenue-api.ts')
    assert.match(api, /requireFounderSession/)
    assert.match(read('app/api/founder/revenue/snapshot/route.ts'), /handleRevenueSnapshotGet/)
    assert.match(read('app/api/founder/revenue/pricing/[pricingId]/route.ts'), /handleRevenuePricingPatch/)
  })

  it('unavailable billing shows unavailable snapshot source in builder', () => {
    const builder = read('lib/founder/revenue/revenue-source-builder.ts')
    assert.match(builder, /Live billing source not connected/)
    assert.match(builder, /source === 'unavailable' \? null/)
    assert.match(builder, /do not invent paid users/)
  })

  it('forecasts are labelled as assumptions', () => {
    const engine = read('lib/founder/revenue/revenue-forecast-engine.ts')
    const types = read('lib/founder/revenue/revenue-types.ts')
    assert.match(engine, /REVENUE_FORECAST_DISCLAIMER/)
    assert.match(types, /Forecasts are modelled assumptions, not live results/)
    assert.match(engine, /Not for external use without founder approval/)
  })

  it('AI cost can calculate without revenue', () => {
    const engine = read('lib/founder/revenue/ai-margin-engine.ts')
    assert.match(engine, /if \(!revenueAvailable\)/)
    assert.match(engine, /Gross margin unavailable/)
    assert.match(engine, /totalAiCost: aiCost/)
  })

  it('margin unavailable when revenue unavailable', () => {
    const engine = read('lib/founder/revenue/ai-margin-engine.ts')
    assert.match(engine, /grossMarginPercent: null/)
    assert.match(engine, /if \(!revenueAvailable\)/)
  })

  it('ORB Founder revenue module does not invent MRR', () => {
    const orbRevenue = read('lib/founder/orb-founder/orb-founder-revenue.ts')
    assert.match(orbRevenue, /cannot state MRR/)
    assert.match(orbRevenue, /REVENUE_FORECAST_DISCLAIMER/)
    assert.match(orbRevenue, /not live traction/)
  })

  it('evidence engine does not include unapproved forecasts as traction', () => {
    const evidence = read('lib/founder/evidence/evidence-source-builder.ts')
    assert.match(evidence, /getApprovedRevenueForecasts/)
    assert.match(evidence, /do not present forecasts as traction/)
  })

  it('revenue claims require approval type', () => {
    assert.match(read('lib/founder/approvals/approval-types.ts'), /revenue-claim/)
    assert.match(read('lib/founder/revenue/revenue-store.ts'), /type: 'revenue-claim'/)
    assert.match(read('lib/founder/approvals/approval-service.ts'), /revenue-claim/)
  })

  it('pricing model changes write audit logs', () => {
    assert.match(read('lib/founder/revenue/revenue-store.ts'), /appendAuditLog/)
    assert.match(read('lib/founder/revenue/revenue-store.ts'), /Pricing model/)
  })

  it('revenue page avoids request storm with single fetch guard', () => {
    const page = read('components/founder/founder-revenue-page.tsx')
    assert.match(page, /fetchedRef/)
    assert.match(page, /fetchedRef\.current/)
    assert.match(read('app/founder/revenue/page.tsx'), /FounderGuard/)
    assert.match(read('app/founder/revenue/forecast/page.tsx'), /FounderGuard/)
  })

  it('forecast engine projects MRR from users and conversion', () => {
    const engine = read('lib/founder/revenue/revenue-forecast-engine.ts')
    assert.match(engine, /projectMrrAtUsers/)
    assert.match(engine, /conversionPercent/)
  })

  it('founder navigation includes revenue route', () => {
    assert.match(read('components/founder/founder-nav-header.tsx'), /\/founder\/revenue/)
  })

  it('non-founder access blocked via founder session on revenue APIs', () => {
    assert.match(read('lib/founder/auth/founder-session.ts'), /status: 403/)
    assert.match(read('lib/founder/auth/founder-session.ts'), /userHasFounderAccessFromProfile/)
  })
})
