import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Company Operating Model V1', () => {
  it('company routes use FounderGuard', () => {
    const routes = [
      'app/founder/company/page.tsx',
      'app/founder/company/departments/page.tsx',
      'app/founder/company/departments/[departmentId]/page.tsx',
      'app/founder/company/scorecard/page.tsx',
      'app/founder/company/cadence/page.tsx',
      'app/founder/company/board-report/page.tsx'
    ]
    for (const route of routes) {
      assert.match(read(route), /FounderGuard/)
    }
  })

  it('live-data-guard exposes required helpers', () => {
    const guard = read('lib/founder/company/live-data-guard.ts')
    assert.match(guard, /export function assertLiveMetric/)
    assert.match(guard, /export function formatUnavailableMetric/)
    assert.match(guard, /export function formatForecastMetric/)
    assert.match(guard, /export function isLiveSourceConnected/)
    assert.match(guard, /export function buildMetricDataBasis/)
  })

  it('live metrics show unavailable when source missing', () => {
    const guard = read('lib/founder/company/live-data-guard.ts')
    const builder = read('lib/founder/company/company-live-kpi-builder.ts')
    assert.match(guard, /sourceStatus: 'unavailable'/)
    assert.match(guard, /Live source not connected/)
    assert.match(builder, /formatUnavailableMetric/)
    assert.match(builder, /No fake numbers/)
  })

  it('no fake MRR/users/ARR in KPI builder', () => {
    const builder = read('lib/founder/company/company-live-kpi-builder.ts')
    assert.match(builder, /formatUnavailableMetric\('Revenue Intelligence'/)
    assert.match(builder, /mrrLive !== null/)
    assert.match(builder, /billingConnected/)
    assert.doesNotMatch(builder, /mrr:\s*1000/)
    assert.match(builder, /No fake numbers/)
  })

  it('department scores conservative when data missing', () => {
    const engine = read('lib/founder/company/company-score-engine.ts')
    assert.match(engine, /Revenue unavailable — finance score cannot be high/)
    assert.match(engine, /No Quality Lab run — score limited/)
    assert.match(engine, /No relationships recorded — commercial score limited/)
    assert.match(engine, /Missing live data lowers confidence/)
  })

  it('board report requires approval before external copy', () => {
    const report = read('lib/founder/company/company-board-report-engine.ts')
    const types = read('lib/founder/approvals/approval-types.ts')
    assert.match(types, /company-board-report/)
    assert.match(report, /createApprovalItem/)
    assert.match(report, /company-board-report/)
    assert.match(report, /boardReportExternalCopyBlocked/)
    assert.match(report, /appendAuditLog/)
  })

  it('ORB Founder does not invent company performance', () => {
    const orb = read('lib/founder/orb-founder/orb-founder-company.ts')
    const engine = read('lib/founder/orb-founder/orb-founder-engine.ts')
    assert.match(orb, /matchesCompanyQuestion/)
    assert.match(orb, /unavailable/)
    assert.match(orb, /Live data only for live claims/)
    assert.match(engine, /answerCompanyQuestion/)
    assert.doesNotMatch(orb, /£10,?000|1000 users/)
  })

  it('cadence generates actions from real inputs', () => {
    const cadence = read('lib/founder/company/company-cadence-engine.ts')
    assert.match(cadence, /getOpenFounderActions/)
    assert.match(cadence, /getPendingApprovals/)
    assert.match(cadence, /getFollowUpRecommendations/)
    assert.match(cadence, /Connect live data sources/)
  })

  it('company page does not create request storm', () => {
    const page = read('components/founder/founder-company-page.tsx')
    assert.doesNotMatch(page, /founderGet|founderPost/)
    assert.doesNotMatch(page, /useEffect/)
    assert.match(page, /buildCompanyOperatingModel/)
  })

  it('no direct browser calls to backend admin routes', () => {
    const components = [
      'components/founder/founder-company-page.tsx',
      'components/founder/founder-company-departments-page.tsx',
      'components/founder/founder-company-department-detail-page.tsx',
      'components/founder/founder-company-scorecard-page.tsx',
      'components/founder/founder-company-cadence-page.tsx',
      'components/founder/founder-company-board-report-page.tsx'
    ]
    for (const file of components) {
      const source = read(file)
      assert.doesNotMatch(source, /fetch\([^)]*['"]\/orb\/admin\//)
      assert.doesNotMatch(source, /authFetchResponse\([^)]*['"]\/api\/providers/)
    }
  })

  it('P&L placeholders do not calculate fake profit', () => {
    const pl = read('lib/founder/company/pl-readiness.ts')
    assert.match(pl, /canCalculateNetProfit: false/)
    assert.match(pl, /canCalculateRunway: false/)
    assert.match(pl, /no fake profit/i)
    assert.match(pl, /formatUnavailableMetric/)
  })

  it('department ownership outputs include KPIs, risks, decisions', () => {
    const base = read('lib/founder/team/founder-staff-agent-base.ts')
    const types = read('lib/founder/team/founder-team-types.ts')
    assert.match(types, /departmentOwnership/)
    assert.match(types, /kpiInterpretation/)
    assert.match(types, /thomasDecisions/)
    assert.match(base, /enrichDepartmentOwnership/)
    assert.match(base, /buildStaffAgent/)
  })

  it('navigation includes company route', () => {
    const nav = read('components/founder/founder-nav-header.tsx')
    assert.match(nav, /\/founder\/company/)
    const dashboard = read('components/founder/founder-dashboard-page.tsx')
    assert.match(dashboard, /Company Operating Model/)
    assert.match(dashboard, /founder-company-operating-model-link/)
  })

  it('intelligence centre integrates company scorecard', () => {
    const sync = read('lib/founder/intelligence-centre/intelligence-sync.ts')
    const types = read('lib/founder/intelligence-centre/intelligence-centre-types.ts')
    assert.match(sync, /buildCompanyOperatingModel/)
    assert.match(types, /FounderIntelligenceCompanySummary/)
    assert.match(read('components/founder/founder-intelligence-page.tsx'), /company operating model/i)
  })
})
