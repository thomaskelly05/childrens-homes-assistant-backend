import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Relationship Intelligence V1', () => {
  it('relationship API routes require founder session', () => {
    const api = read('lib/founder/relationships/relationship-api.ts')
    assert.match(api, /requireFounderSession/)
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    assert.match(handler, /segments\[0\] === 'relationships'/)
    assert.match(read('app/api/founder/relationships/route.ts'), /handleRelationshipsListGet/)
  })

  it('non-founder access is gated via founder session', () => {
    const session = read('lib/founder/auth/founder-session.ts')
    assert.match(session, /requireFounderSession/)
    assert.match(read('components/founder/founder-guard.tsx'), /FounderGuard/)
  })

  it('relationship creation persists and writes audit log', () => {
    const store = read('lib/founder/relationships/relationship-store.ts')
    assert.match(store, /relationshipRepository\.create/)
    assert.match(store, /appendAuditLog/)
    assert.match(store, /entityType: 'relationship'/)
  })

  it('interactions and opportunities persist via bundle updates', () => {
    const store = read('lib/founder/relationships/relationship-store.ts')
    assert.match(store, /addRelationshipInteraction/)
    assert.match(store, /createRelationshipOpportunity/)
    assert.match(store, /persistBundle/)
  })

  it('ORB Founder does not invent relationship data', () => {
    const orb = read('lib/founder/orb-founder/orb-founder-relationships.ts')
    assert.match(orb, /No relationship records/)
    assert.match(orb, /will not invent/)
    assert.match(orb, /recorded data only|recorded relationship data|from recorded data/i)
    assert.match(read('lib/founder/orb-founder/orb-founder-engine.ts'), /answerRelationshipQuestion/)
  })

  it('follow-up drafts require approval and use relationship-message type', () => {
    const store = read('lib/founder/relationships/relationship-store.ts')
    assert.match(store, /createApprovalItem/)
    assert.match(store, /type: 'relationship-message'/)
    assert.match(store, /No message will be sent/)
    assert.match(read('lib/founder/approvals/approval-types.ts'), /relationship-message/)
  })

  it('evidence pack recommendation matches relationship type', () => {
    const evidence = read('lib/founder/relationships/relationship-evidence.ts')
    assert.match(evidence, /relationshipType === 'investor'/)
    assert.match(evidence, /openai/)
    assert.match(evidence, /microsoft/)
    assert.match(evidence, /innovate-uk/)
    assert.match(evidence, /local-authority/)
  })

  it('archived relationships excluded from active pipeline', () => {
    const store = read('lib/founder/relationships/relationship-store.ts')
    assert.match(store, /getActiveRelationships/)
    assert.match(store, /status !== 'archived'/)
    const types = read('lib/founder/relationships/relationship-types.ts')
    assert.match(types, /PIPELINE_STATUSES/)
    assert.doesNotMatch(types, /PIPELINE_STATUSES[\s\S]*'archived'/)
  })

  it('content is sanitised and safety-checked', () => {
    const safety = read('lib/founder/relationships/relationship-safety.ts')
    assert.match(safety, /checkFounderOutputSafety/)
    assert.match(safety, /sanitiseText/)
  })

  it('persistence layer includes relationship entity', () => {
    const types = read('lib/founder/persistence/founder-persistence-types.ts')
    assert.match(types, /'relationship'/)
    assert.match(types, /FounderRelationshipRecord/)
    assert.match(read('lib/founder/persistence/founder-api-entities.ts'), /relationships/)
    assert.match(read('lib/founder/api/founder-api-client.ts'), /relationship: 'relationships'/)
  })

  it('relationship routes and nav exist', () => {
    assert.match(read('app/founder/relationships/page.tsx'), /FounderRelationshipsPage/)
    assert.match(read('components/founder/founder-nav-header.tsx'), /\/founder\/relationships/)
    assert.match(read('components/founder/founder-relationships-page.tsx'), /Founder Relationships/)
  })

  it('staff team and operating loop integrate relationships', () => {
    assert.match(read('lib/founder/team/staff-agents.ts'), /getActiveRelationships/)
    assert.match(read('lib/founder/team/staff-agents.ts'), /getRelationshipFollowUpsForBriefing/)
    assert.match(read('lib/founder/operating-loop/founder-operating-loop.ts'), /getFollowUpRecommendations/)
  })
})
