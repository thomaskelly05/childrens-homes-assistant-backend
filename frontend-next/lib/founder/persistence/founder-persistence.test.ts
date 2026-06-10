import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder persistence V1', () => {
  it('production mode does not enable dev fallback by default', () => {
    const config = read('lib/founder/persistence/persistence-config.ts')
    assert.match(config, /NODE_ENV === 'production'/)
    assert.match(config, /FOUNDER_PERSISTENCE_DEV_FALLBACK/)
  })

  it('API handler rejects non-founder access', () => {
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    assert.match(handler, /userHasFounderAccess/)
    assert.match(handler, /status: 403/)
    assert.match(handler, /founder-os\/persistence/)
  })

  it('next.config keeps /api/founder on the Next.js proxy', () => {
    const config = read('next.config.ts')
    assert.match(config, /\/api\/\(\(\?!founder/)
  })

  it('sanitise strips identifiable fields from payloads', () => {
    const safety = read('lib/founder/persistence/persistence-safety.ts')
    assert.match(safety, /child_name/)
    assert.match(safety, /staffName/)
    assert.match(safety, /sanitiseFounderPayload/)
  })

  it('content drafts cannot be marked posted unless approved', () => {
    const service = read('lib/founder/content/content-approval-service.ts')
    assert.match(service, /Only approved content can be marked as posted/)
    assert.match(service, /draft\?\.status !== 'approved'/)
  })

  it('audit trail route and nav exist', () => {
    assert.match(read('app/founder/audit/page.tsx'), /FounderAuditPage/)
    assert.match(read('components/founder/founder-nav-header.tsx'), /\/founder\/audit/)
    assert.match(read('components/founder/founder-audit-page.tsx'), /Founder Audit Trail/)
  })

  it('repository layer files exist for all entity types', () => {
    const repos = read('lib/founder/persistence/index.ts')
    assert.match(repos, /actionRepository/)
    assert.match(repos, /approvalRepository/)
    assert.match(repos, /qualityRunRepository/)
    assert.match(repos, /expertReviewRepository/)
    assert.match(repos, /evidencePackRepository/)
    assert.match(repos, /appendAuditLog/)
  })

  it('quality proposals require approval before implemented status in types', () => {
    const types = read('lib/founder/quality-lab/quality-lab-types.ts')
    assert.match(types, /QualityProposalStatus/)
    assert.match(types, /approved/)
    assert.match(types, /implemented/)
  })

  it('build brief status changes write audit logs via repository', () => {
    const repo = read('lib/founder/persistence/repositories/build-brief-repository.ts')
    assert.match(repo, /appendAuditLog/)
    assert.match(repo, /changeStatus/)
  })

  it('operating loop persists agent outputs safely', () => {
    const loop = read('lib/founder/operating-loop/founder-operating-loop.ts')
    assert.match(loop, /persistStaffTeamRun/)
    assert.match(loop, /operatingLoopRepository/)
    assert.match(loop, /appendAuditLog/)
    assert.match(read('lib/founder/operating-loop/operating-loop-api.ts'), /requireFounderSession/)
    const staff = read('lib/founder/team/staff-team-run-service.ts')
    assert.match(staff, /checkFounderOutputSafety/)
    assert.match(staff, /safetyReviewRepository/)
  })

  it('approval decisions persist and write audit log', () => {
    const service = read('lib/founder/approvals/approval-service.ts')
    assert.match(service, /approvalRepository\.decide/)
    assert.match(service, /appendAuditLog/)
  })

  it('quality lab run persists via persistence bridge', () => {
    const bridge = read('lib/founder/quality-lab/persistence-bridge.ts')
    assert.match(bridge, /persistQualityRun/)
    assert.match(bridge, /qualityRunRepository/)
    assert.match(bridge, /persistQualityProposal/)
    assert.match(bridge, /persistExpertReview/)
  })
})
