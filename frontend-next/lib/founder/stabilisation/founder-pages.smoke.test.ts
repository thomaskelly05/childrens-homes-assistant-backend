import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const FOUNDER_PAGES = [
  { route: '/founder', page: 'app/founder/page.tsx', component: 'components/founder/founder-dashboard-page.tsx' },
  { route: '/founder/orb', page: 'app/founder/orb/page.tsx', component: 'components/founder/orb-founder/founder-orb-page.tsx' },
  { route: '/founder/team', page: 'app/founder/team/page.tsx', component: 'components/founder/founder-team-page.tsx' },
  {
    route: '/founder/operating-loop',
    page: 'app/founder/operating-loop/page.tsx',
    component: 'components/founder/founder-operating-loop-page.tsx'
  },
  {
    route: '/founder/intelligence',
    page: 'app/founder/intelligence/page.tsx',
    component: 'components/founder/founder-intelligence-page.tsx'
  },
  { route: '/founder/memory', page: 'app/founder/memory/page.tsx', component: 'components/founder/founder-memory-page.tsx' },
  { route: '/founder/evidence', page: 'app/founder/evidence/page.tsx', component: 'components/founder/founder-evidence-page.tsx' },
  {
    route: '/founder/relationships',
    page: 'app/founder/relationships/page.tsx',
    component: 'components/founder/founder-relationships-page.tsx'
  },
  { route: '/founder/revenue', page: 'app/founder/revenue/page.tsx', component: 'components/founder/founder-revenue-page.tsx' },
  {
    route: '/founder/quality-lab',
    page: 'app/founder/quality-lab/page.tsx',
    component: 'components/founder/founder-quality-lab-page.tsx'
  },
  {
    route: '/founder/orb-pilot',
    page: 'app/founder/orb-pilot/page.tsx',
    component: 'components/founder/founder-orb-pilot-page.tsx'
  },
  { route: '/founder/actions', page: 'app/founder/actions/page.tsx', component: 'components/founder/founder-actions-page.tsx' },
  {
    route: '/founder/approvals',
    page: 'app/founder/approvals/page.tsx',
    component: 'components/founder/founder-approvals-page.tsx'
  },
  { route: '/founder/content', page: 'app/founder/content/page.tsx', component: 'components/founder/founder-content-page.tsx' },
  {
    route: '/founder/build-briefs',
    page: 'app/founder/build-briefs/page.tsx',
    component: 'components/founder/founder-build-briefs-page.tsx'
  },
  {
    route: '/founder/telemetry',
    page: 'app/founder/telemetry/page.tsx',
    component: 'components/founder/founder-telemetry-page.tsx'
  },
  { route: '/founder/audit', page: 'app/founder/audit/page.tsx', component: 'components/founder/founder-audit-page.tsx' },
  { route: '/founder/company', page: 'app/founder/company/page.tsx', component: 'components/founder/founder-company-page.tsx' },
  {
    route: '/founder/company/departments',
    page: 'app/founder/company/departments/page.tsx',
    component: 'components/founder/founder-company-departments-page.tsx'
  },
  {
    route: '/founder/company/scorecard',
    page: 'app/founder/company/scorecard/page.tsx',
    component: 'components/founder/founder-company-scorecard-page.tsx'
  },
  {
    route: '/founder/company/cadence',
    page: 'app/founder/company/cadence/page.tsx',
    component: 'components/founder/founder-company-cadence-page.tsx'
  },
  {
    route: '/founder/company/board-report',
    page: 'app/founder/company/board-report/page.tsx',
    component: 'components/founder/founder-company-board-report-page.tsx'
  }
] as const

const BLOCKED_BROWSER_PATTERNS = [
  /authFetchResponse\([^)]*['"]\/orb\/admin\//,
  /fetch\([^)]*['"]\/api\/providers/,
  /fetch\([^)]*['"]\/api\/homes/,
  /fetch\([^)]*['"]\/api\/inspection-readiness/
]

describe('Founder OS page smoke suite', () => {
  it('layout hydrates persistence via bootstrap', () => {
    const layout = read('app/founder/layout.tsx')
    assert.match(layout, /FounderPersistenceHydrator/)
    assert.match(layout, /founder-dashboard\.css/)
  })

  it('founder nav header exposes core routes', () => {
    const nav = read('components/founder/founder-nav-header.tsx')
    for (const { route } of FOUNDER_PAGES) {
      const slug =
        route.startsWith('/founder/company/') ? '/founder/company' : route === '/founder/audit' ? '/founder/audit' : route
      assert.match(nav, new RegExp(slug.replace(/\//g, '\\/')))
    }
  })

  for (const { route, page, component } of FOUNDER_PAGES) {
    it(`${route} renders with founder guard and nav`, () => {
      const pageSource = read(page)
      const dashboardSource = read(component)

      assert.match(pageSource, /FounderGuard/)
      if (route === '/founder/orb') {
        assert.match(pageSource, /FounderOrbPage/)
        assert.match(dashboardSource, /founder-dashboard/)
        assert.match(dashboardSource, /Founder-only|founder-only|Lock/)
      } else {
        assert.match(dashboardSource, /FounderNavHeader/)
        assert.match(
          dashboardSource,
          /founder-dashboard|founder-page|className="space-y-8"/,
          `${route} should use founder layout shell classes`
        )
      }
    })
  }

  for (const { route, component } of FOUNDER_PAGES) {
    it(`${route} avoids direct backend admin browser calls`, () => {
      const source = read(component)
      for (const pattern of BLOCKED_BROWSER_PATTERNS) {
        assert.doesNotMatch(source, pattern, `${route} must not call backend admin routes directly`)
      }
    })
  }

  it('quality lab client uses founder API proxy', () => {
    const client = read('lib/founder/quality-lab/quality-lab-client.ts')
    assert.match(client, /founderGet/)
    assert.match(client, /\/quality-lab\/overview/)
    assert.doesNotMatch(client, /\/orb\/admin\//)
  })
})
