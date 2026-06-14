import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_APP_PERMISSIONS } from './orb-app-permissions.ts'
import {
  ORB_COMPOSER_UPLOAD_PLUS_ACTIONS,
  ORB_FOUNDATION_CAPABILITY_IDS,
  ORB_FOUNDATION_CAPABILITIES,
  getOrbFoundationCapability,
  mapBrowserPermissionToAppPermission,
  orbFoundationCapabilitiesForSurface,
  validateOrbFoundationCapabilityRegistry
} from './orb-foundation-capabilities.ts'
import { ORB_NATURAL_LANGUAGE_DOCUMENT_EDITING_COPY } from './orb-document-intelligence-roadmap.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('orb-foundation-capabilities', () => {
  it('registry includes all required capabilities', () => {
    assert.deepEqual(
      ORB_FOUNDATION_CAPABILITIES.map((c) => c.id).sort(),
      [...ORB_FOUNDATION_CAPABILITY_IDS].sort()
    )
    for (const id of [
      'camera_capture',
      'photo_upload',
      'file_upload',
      'document_scan_ocr',
      'natural_language_document_editing',
      'local_first_drafts',
      'private_compute',
      'personal_context',
      'app_permissions',
      'search',
      'voice_input',
      'dictate_audio_input',
      'orb_write_finalisation'
    ]) {
      assert.ok(getOrbFoundationCapability(id), `missing ${id}`)
    }
  })

  it('no capability falsely claims E2EE or Apple Private Cloud Compute publicly', () => {
    assert.deepEqual(validateOrbFoundationCapabilityRegistry(), [])
    const privateCompute = getOrbFoundationCapability('private_compute')!
    assert.equal(privateCompute.safePublicClaim, false)
    assert.ok(privateCompute.currentLimitations.some((line) => line.includes('end-to-end')))
    const audit = getOrbFoundationCapability('audit_evidence_readiness')!
    assert.equal(audit.safePublicClaim, false)
    for (const capability of ORB_FOUNDATION_CAPABILITIES) {
      if (capability.safePublicClaim) {
        assert.doesNotMatch(capability.shortDescription, /end-to-end encryption/i)
        assert.doesNotMatch(capability.label, /Apple Private Cloud/i)
      }
    }
  })

  it('high privacy capabilities require adult control notes', () => {
    const high = ORB_FOUNDATION_CAPABILITIES.filter((c) =>
      ['high', 'very_high'].includes(c.privacyLevel)
    )
    assert.ok(high.length >= 8)
    for (const capability of high) {
      assert.ok(capability.adultControlRequirement.trim().length > 10, capability.id)
    }
  })

  it('camera, microphone and file capabilities map to app permissions', () => {
    for (const id of ['camera_capture', 'photo_upload', 'file_upload', 'voice_input', 'dictate_audio_input']) {
      const capability = getOrbFoundationCapability(id)!
      assert.ok(capability.requiresBrowserPermission)
      const permissionId =
        capability.appPermissionId ??
        mapBrowserPermissionToAppPermission(capability.requiresBrowserPermission!)
      assert.ok(permissionId)
      assert.ok(ORB_APP_PERMISSIONS.some((p) => p.id === permissionId), `${id} -> ${permissionId}`)
    }
  })

  it('each capability lists at least one surface or limitation', () => {
    for (const capability of ORB_FOUNDATION_CAPABILITIES) {
      assert.ok(
        capability.surfaces.length > 0 || capability.currentLimitations.length > 0,
        capability.id
      )
    }
  })

  it('camera, photos and files are cross-app not mobile-only', () => {
    for (const id of ['camera_capture', 'photo_upload', 'file_upload']) {
      const capability = getOrbFoundationCapability(id)!
      assert.ok(capability.surfaces.includes('mobile'))
      assert.ok(capability.surfaces.includes('desktop'))
    }
  })

  it('natural language document editing is partial with review copy', () => {
    const editing = getOrbFoundationCapability('natural_language_document_editing')!
    assert.equal(editing.availability, 'partial')
    assert.equal(editing.safePublicClaim, false)
    assert.equal(editing.shortDescription, ORB_NATURAL_LANGUAGE_DOCUMENT_EDITING_COPY)
  })

  it('shared composer upload actions align mobile and desktop labels', () => {
    assert.deepEqual(
      ORB_COMPOSER_UPLOAD_PLUS_ACTIONS.map((a) => a.label),
      ['Camera', 'Photos', 'Files']
    )
  })

  it('desktop and mobile surfaces represented for search and personal context', () => {
    const search = getOrbFoundationCapability('search')!
    assert.ok(search.surfaces.includes('mobile'))
    assert.ok(search.surfaces.includes('desktop'))
    const personal = getOrbFoundationCapability('personal_context')!
    assert.ok(personal.surfaces.includes('settings'))
    assert.ok(orbFoundationCapabilitiesForSurface('settings').some((c) => c.id === 'personal_context'))
  })
})

describe('orb foundation build guard', () => {
  it('orb-composer-inline-voice-fallback module resolves', () => {
    assert.ok(existsSync(join(root, 'lib/orb/orb-composer-inline-voice-fallback.ts')))
  })

  it('companion imports voice fallback from lib/orb', () => {
    const companion = join(root, 'components/orb-standalone/orb-care-companion.tsx')
    const source = readFileSync(companion, 'utf8')
    assert.match(source, /@\/lib\/orb\/orb-composer-inline-voice-fallback/)
    assert.match(source, /ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE/)
  })

  it('desktop plus menu exposes upload and ORB tool actions', () => {
    const menu = readFileSync(join(root, 'components/orb-standalone/orb-composer-plus-menu.tsx'), 'utf8')
    const composer = readFileSync(join(root, 'components/orb-standalone/orb-standalone-composer.tsx'), 'utf8')
    assert.match(menu, /ORB_COMPOSER_UPLOAD_PLUS_ACTIONS/)
    assert.match(menu, /take_photo/)
    assert.match(menu, /photo_library/)
    assert.match(menu, /choose_files/)
    assert.match(menu, /privacy_guidance/)
    assert.match(menu, /orb_write/)
    assert.match(composer, /handleComposerToolSelect/)
    assert.match(composer, /OrbComposerPlusMenu/)
  })
})
