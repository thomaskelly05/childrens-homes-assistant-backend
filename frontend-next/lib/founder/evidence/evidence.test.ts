import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Evidence Engine V1', () => {
  it('evidence API routes require founder session', () => {
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    assert.match(handler, /handleEvidenceListGet/)
    assert.match(handler, /requireFounderSession/)
    assert.match(handler, /segments\[0\] === 'evidence'/)
  })

  it('evidence generator does not invent live data in source builder', () => {
    const builder = read('lib/founder/evidence/evidence-source-builder.ts')
    assert.match(builder, /Live data not yet available/)
    assert.match(builder, /do not invent provider counts/)
    assert.match(builder, /do not quote MRR or revenue/)
  })

  it('missing telemetry produces limitations', () => {
    const builder = read('lib/founder/evidence/evidence-source-builder.ts')
    assert.match(builder, /telemetry\.totalEvents > 0/)
    assert.match(builder, /limitations\.push\(LIVE_DATA_UNAVAILABLE\)/)
    assert.match(builder, /LIVE_DATA_UNAVAILABLE/)
  })

  it('pack creation writes audit log', () => {
    const store = read('lib/founder/evidence/evidence-store.ts')
    assert.match(store, /appendAuditLog/)
    assert.match(store, /entityType: 'evidence_pack'/)
    assert.match(store, /evidencePackRepository\.create/)
  })

  it('external use requires approval', () => {
    const store = read('lib/founder/evidence/evidence-store.ts')
    assert.match(store, /createApprovalItem/)
    assert.match(store, /type: 'evidence-pack'/)
    assert.match(store, /canCopyEvidencePack/)
    assert.match(store, /pack\.status === 'approved'/)
  })

  it('unsafe identifiers are checked via founder output safety', () => {
    const generator = read('lib/founder/evidence/evidence-pack-generator.ts')
    assert.match(generator, /checkFounderOutputSafety/)
    const safety = read('lib/founder/safety/founder-output-safety.ts')
    assert.match(safety, /child-identifiable/)
    assert.match(safety, /provider-identifiable/)
  })

  it('ORB Founder includes limitations when generating pack', () => {
    const orb = read('lib/founder/orb-founder/orb-founder-evidence.ts')
    assert.match(orb, /Limitations:/)
    assert.match(orb, /approval is required before external use/)
    assert.match(orb, /answerCurrentLimitations/)
  })

  it('approved pack can be copied; rejected remains traceable', () => {
    const store = read('lib/founder/evidence/evidence-store.ts')
    assert.match(store, /syncPackOnApprovalDecision/)
    const detail = read('components/founder/founder-evidence-detail-page.tsx')
    assert.match(detail, /canCopyEvidencePack/)
    assert.match(detail, /Copy Pack Text/)
  })

  it('evidence route and nav exist', () => {
    assert.match(read('app/founder/evidence/page.tsx'), /FounderEvidencePage/)
    assert.match(read('components/founder/founder-nav-header.tsx'), /\/founder\/evidence/)
    assert.match(read('components/founder/founder-evidence-page.tsx'), /Founder Evidence Engine/)
  })

  it('persistence layer includes evidence_pack entity', () => {
    const types = read('lib/founder/persistence/founder-persistence-types.ts')
    assert.match(types, /evidence_pack/)
    assert.match(types, /FounderEvidencePackRecord/)
    const entities = read('lib/founder/persistence/founder-api-entities.ts')
    assert.match(entities, /evidence-packs/)
    const apiClient = read('lib/founder/api/founder-api-client.ts')
    assert.match(apiClient, /evidence_pack: 'evidence-packs'/)
  })

  it('evidence page does not create a founder request storm on load', () => {
    const page = read('components/founder/founder-evidence-page.tsx')
    assert.doesNotMatch(page, /founderGet/)
    assert.match(page, /hydrateEvidencePacksFromPersistence/)
    assert.match(page, /getEvidencePacks\(\)/)
  })

  it('evidence page uses bootstrap persistence cache', () => {
    const page = read('components/founder/founder-evidence-page.tsx')
    const sync = read('lib/founder/persistence/founder-persistence-sync.ts')
    const store = read('lib/founder/evidence/evidence-store.ts')
    assert.match(sync, /hydrateEvidencePacksFromPersistence/)
    assert.match(store, /evidencePackRepository\.list/)
    assert.match(page, /buildEvidenceSources/)
  })

  it('approval service syncs evidence pack decisions', () => {
    const service = read('lib/founder/approvals/approval-service.ts')
    assert.match(service, /syncPackOnApprovalDecision/)
    assert.match(service, /evidence-pack/)
  })
})
