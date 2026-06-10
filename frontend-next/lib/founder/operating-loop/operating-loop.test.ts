import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { checkFounderOutputSafety } from '../safety/founder-output-safety.ts'
import {
  agentsForPlan,
  BRAND_OPERATING_LOOP_PLAN,
  FULL_OPERATING_LOOP_PLAN,
  QUALITY_OPERATING_LOOP_PLAN,
  TECHNICAL_OPERATING_LOOP_PLAN
} from './operating-loop-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Operating Loop V1', () => {
  it('API handler requires founder for operating loop routes', () => {
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    assert.match(handler, /operating-loop/)
    assert.match(handler, /handleOperatingLoopRunPost/)
    assert.match(handler, /requireFounderSession/)
    assert.match(read('lib/founder/auth/founder-session.ts'), /status: 403/)
  })

  it('operating loop orchestrator persists runs and audit logs', () => {
    const loop = read('lib/founder/operating-loop/founder-operating-loop.ts')
    assert.match(loop, /operatingLoopRepository\.persistResult/)
    assert.match(loop, /appendAuditLog/)
    assert.match(loop, /persistStaffTeamRun/)
    assert.match(loop, /checkFounderOutputSafety/)
  })

  it('continues remaining agents when one agent fails', () => {
    const loop = read('lib/founder/operating-loop/founder-operating-loop.ts')
    assert.match(loop, /status: 'failed'/)
    assert.match(loop, /completed_with_warnings/)
    assert.match(loop, /errors\.push/)
  })

  it('external-facing drafts route through approvals', () => {
    const loop = read('lib/founder/operating-loop/founder-operating-loop.ts')
    assert.match(loop, /generateLinkedInDraft/)
    const content = read('lib/founder/content/brand-ambassador-agent.ts')
    assert.match(content, /createApprovalItem/)
  })

  it('ORB Founder does not call runFounderOperatingLoop directly', () => {
    const engine = read('lib/founder/orb-founder/orb-founder-engine.ts')
    assert.doesNotMatch(engine, /runFounderOperatingLoop\(/)
    const page = read('components/founder/orb-founder/founder-orb-page.tsx')
    assert.match(page, /isExplicitOperatingLoopRequest/)
    assert.match(page, /postOperatingLoopRun/)
  })

  it('ORB Founder only treats explicit phrases as loop run requests', () => {
    const guard = read('lib/founder/orb-founder/orb-founder-operating-loop.ts')
    assert.match(guard, /isExplicitOperatingLoopRequest/)
    assert.match(guard, /run my operating loop/)
    assert.match(guard, /quality loop/)
    const engine = read('lib/founder/orb-founder/orb-founder-engine.ts')
    assert.match(engine, /last operating loop/)
    assert.doesNotMatch(engine, /runFounderOperatingLoop\(/)
  })

  it('full loop runs all staff agents in contract order', () => {
    const agents = agentsForPlan(FULL_OPERATING_LOOP_PLAN)
    assert.equal(agents.length, 11)
    assert.equal(agents[0]?.id, 'chief-of-staff')
    assert.equal(agents.some((agent) => agent.id === 'orb-quality'), true)
  })

  it('preset loops select focused agent subsets', () => {
    assert.equal(agentsForPlan(QUALITY_OPERATING_LOOP_PLAN).some((a) => a.id === 'orb-quality'), true)
    assert.equal(agentsForPlan(BRAND_OPERATING_LOOP_PLAN).some((a) => a.id === 'brand-ambassador'), true)
    assert.equal(agentsForPlan(TECHNICAL_OPERATING_LOOP_PLAN).some((a) => a.id === 'cto'), true)
  })

  it('output safety strips identifiable child, staff and provider fields', () => {
    const unsafe =
      'Review child name James and staff name Sarah at Provider Oakwood Care Ltd before posting.'
    const safety = checkFounderOutputSafety(unsafe)
    assert.equal(safety.safe, false)
    assert.ok(safety.issues.some((issue) => issue.code === 'child-identifiable'))
    assert.ok(safety.issues.some((issue) => issue.code === 'staff-identifiable'))
    assert.ok(safety.issues.some((issue) => issue.code === 'provider-identifiable'))
    assert.doesNotMatch(safety.redactedContent, /Oakwood Care Ltd/)
    assert.match(safety.redactedContent, /redacted/)
  })

  it('operating loop UI and navigation routes exist', () => {
    assert.match(read('app/founder/operating-loop/page.tsx'), /FounderOperatingLoopPage/)
    assert.match(read('app/founder/operating-loop/[runId]/page.tsx'), /FounderOperatingLoopDetailPage/)
    assert.match(read('components/founder/founder-nav-header.tsx'), /\/founder\/operating-loop/)
    assert.match(read('components/founder/founder-team-page.tsx'), /Run Operating Loop/)
  })
})
