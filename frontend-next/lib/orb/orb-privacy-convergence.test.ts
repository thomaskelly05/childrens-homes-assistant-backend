import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_APP_PERMISSIONS,
  orbAppPermissionStatusLabel
} from './orb-app-permissions.ts'
import {
  ORB_NO_CHILD_MEMORY_CLAIM,
  ORB_PERSONAL_CONTEXT_RULES
} from './orb-personal-context.ts'
import { ORB_SEARCH_SURFACES } from './orb-search-registry.ts'
import {
  ORB_PRIVACY_CAPABILITY_EVIDENCE,
  findForbiddenEncryptionClaims,
  validatePrivacyCapabilityTruthfulness
} from './orb-privacy-capability-evidence.ts'
import { ORB_ADULT_REVIEW_REQUIRED_COPY, ORB_MINIMAL_IDENTIFIABLE_INFO_COPY } from './orb-residential-safety-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('ORB privacy convergence', () => {
  it('privacy framework file has core principles', () => {
    const framework = read('lib/orb/orb-privacy-framework.ts')
    assert.match(framework, /ORB_PRIVACY_PRINCIPLES/)
    assert.match(framework, /authorised_use/)
    assert.match(framework, /adult_review/)
    assert.match(framework, /safeguarding_boundary/)
    assert.match(framework, /data_minimisation/)
  })

  it('adult review and safeguarding copy remain in safety constants', () => {
    assert.match(ORB_ADULT_REVIEW_REQUIRED_COPY, /Adult review/)
    assert.match(ORB_MINIMAL_IDENTIFIABLE_INFO_COPY, /minimal/)
  })

  it('no public E2EE claim in capability evidence', () => {
    assert.deepEqual(validatePrivacyCapabilityTruthfulness(), [])
    const e2ee = ORB_PRIVACY_CAPABILITY_EVIDENCE.find((item) => item.id === 'end_to_end_encryption')
    assert.ok(e2ee)
    assert.equal(e2ee!.safeToClaimPublicly, false)
    assert.ok(['roadmap', 'missing'].includes(e2ee!.status))
  })

  it('forbidden encryption marketing phrases are detectable', () => {
    assert.ok(findForbiddenEncryptionClaims('End-to-end encrypted chat').length > 0)
    assert.equal(findForbiddenEncryptionClaims('Protected in transit and governed by privacy controls').length, 0)
  })

  it('app permissions registry covers required surfaces', () => {
    const ids = ORB_APP_PERMISSIONS.map((p) => p.id)
    for (const required of [
      'microphone',
      'camera',
      'photos_files',
      'voice',
      'dictate',
      'personal_context',
      'search'
    ]) {
      assert.ok(ids.includes(required), `missing permission ${required}`)
    }
  })

  it('browser-controlled permissions are not fake toggles in settings UI', () => {
    const settings = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    assert.match(settings, /browser_controlled/)
    assert.match(settings, /orbAppPermissionStatusLabel/)
    assert.doesNotMatch(settings, /type="checkbox"[\s\S]*microphone/i)
  })

  it('personal context model exists without child-memory claim', () => {
    assert.ok(ORB_PERSONAL_CONTEXT_RULES.length >= 5)
    assert.match(ORB_NO_CHILD_MEMORY_CLAIM, /does not create automatic child profiles/)
    const uploads = ORB_PERSONAL_CONTEXT_RULES.find((r) => r.id === 'uploaded_documents')
    assert.ok(uploads?.requiresUserAction.includes('upload'))
  })

  it('search registry covers key surfaces', () => {
    const ids = ORB_SEARCH_SURFACES.map((s) => s.id)
    for (const required of ['chats', 'saved_outputs', 'record_types', 'documents_guidance']) {
      assert.ok(ids.includes(required), `missing search surface ${required}`)
    }
    const sensitive = ORB_SEARCH_SURFACES.filter((s) => s.privacySensitivity === 'high')
    assert.ok(sensitive.length >= 3)
  })

  it('privacy guidance sheet has back and close controls', () => {
    const sheet = read('components/orb-residential/orb-privacy-guidance-sheet.tsx')
    assert.match(sheet, /data-orb-privacy-guidance-back/)
    assert.match(sheet, /data-orb-privacy-guidance-close/)
    assert.match(sheet, /data-orb-privacy-guidance-done/)
    assert.match(sheet, /createPortal/)
    assert.match(sheet, /Privacy & responsibility/)
  })

  it('composer tracks privacy return origin', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /privacyReturnOrigin/)
    assert.match(composer, /returnOrigin=\{privacyReturnOrigin\}/)
  })

  it('settings Privacy & data lists app permissions', () => {
    const settings = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    assert.match(settings, /data-orb-privacy-data-section/)
    assert.match(settings, /App permissions/)
    assert.match(settings, /Data & privacy/)
    assert.match(settings, /Security/)
    assert.match(settings, /Responsibilities/)
  })

  it('plus menu privacy action still wired', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(tools, /privacy_guidance/)
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
  })

  it('close labels are context-aware in framework', () => {
    const framework = read('lib/orb/orb-privacy-framework.ts')
    assert.match(framework, /Back to ORB/)
    assert.match(framework, /Back to settings/)
    assert.equal(orbAppPermissionStatusLabel('browser_controlled'), 'Browser controlled')
  })

  it('privacy detail sheet has back control for settings rows', () => {
    const detail = read('components/orb-residential/orb-privacy-detail-sheet.tsx')
    assert.match(detail, /data-orb-privacy-detail-back/)
    assert.match(detail, /data-orb-privacy-detail-close/)
  })
})
