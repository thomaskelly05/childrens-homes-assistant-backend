import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  getOrbClassificationForInput,
  getOrbDataClassificationGuidance,
  getOrbDataClassificationNotice
} from './orb-data-classification.ts'
import { sanitiseOrbPrivacyRequestSummary } from './orb-privacy-sanitize.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB privacy UX V1', () => {
  it('/orb/privacy page route exists with required sections', () => {
    const page = read('app/orb/privacy/page.tsx')
    assert.match(page, /data-orb-privacy-page/)
    assert.match(page, /data-orb-privacy-classification-section/)
    assert.match(page, /data-orb-privacy-closed-pilot/)
    assert.match(page, /OrbRetentionStatusCard/)
  })

  it('Green/Amber/Red classification guidance renders', () => {
    const guidance = getOrbDataClassificationGuidance()
    assert.match(guidance.green.label, /Green/)
    assert.match(guidance.amber.label, /Amber/)
    assert.match(guidance.red.label, /Red/)
    assert.ok(guidance.green.examples.length > 0)
    assert.ok(guidance.red.examples.some((item) => /NHS number/i.test(item)))
  })

  it('privacy content does not overpromise deletion or retention', () => {
    const content = read('lib/orb/privacy/orb-privacy-content.ts')
    assert.match(content, /not yet self-service|manual review/i)
    assert.match(content, /Retention controls are being finalised/i)
    assert.match(content, /No automated account erasure/i)
  })

  it('surface notices are present in key ORB components', () => {
    assert.match(read('components/orb-standalone/orb-standalone-composer.tsx'), /OrbPrivacyNotice surface="chat"/)
    assert.match(read('components/orb-standalone/orb-voice-hero-stage.tsx'), /OrbPrivacyNotice surface="voice"/)
    assert.match(read('components/orb/dictate/OrbDictatePrivacyStrip.tsx'), /DICTATE_NOTICE|getOrbDataClassificationNotice\('dictate'\)/)
    assert.match(read('components/orb-write/orb-write-standalone-panel.tsx'), /OrbPrivacyNotice surface="write"/)
    assert.match(read('components/orb-standalone/orb-saved-output-detail-actions.tsx'), /OrbPrivacyNotice surface="export"/)
    assert.match(read('components/orb-standalone/orb-output-save-actions.tsx'), /OrbPrivacyNotice surface="export"/)
  })

  it('behaviour is communication wording appears', () => {
    const guidance = getOrbDataClassificationGuidance()
    assert.match(guidance.behaviourIsCommunication, /Behaviour is communication/i)
    assert.match(guidance.childVoiceCentral, /child/i)
    assert.match(getOrbDataClassificationNotice('write'), /child's voice central/i)
  })

  it('clear RED data pattern triggers warning guidance', () => {
    const assessment = getOrbClassificationForInput('Please review NHS number 943 476 5919 in this record')
    assert.equal(assessment.level, 'red')
    assert.equal(assessment.shouldWarn, true)
    assert.ok(assessment.warnings.length > 0)
  })

  it('privacy request sanitises unsafe narrative', () => {
    const rejected = sanitiseOrbPrivacyRequestSummary(
      'A young person disclosed abuse and gave their full chronology from the care record.'
    )
    assert.equal(rejected.rejected, true)
    assert.match(rejected.reason ?? '', /safeguarding|identifying/i)

    const accepted = sanitiseOrbPrivacyRequestSummary('Please delete my saved outputs and account metadata.')
    assert.equal(accepted.rejected, false)
    assert.match(accepted.sanitised, /delete my saved outputs/i)
  })

  it('privacy requests page requires auth messaging when storing account-linked requests', () => {
    const page = read('app/orb/privacy/requests/page.tsx')
    const form = read('components/orb/privacy/orb-privacy-requests-form.tsx')
    assert.match(page, /OrbPrivacyRequestsForm/)
    assert.match(form, /data-orb-privacy-requests-auth-required/)
    assert.match(form, /Sign in to submit/)
  })

  it('unauthenticated privacy page is publicly reachable via routing config', () => {
    const middleware = read('middleware.ts')
    const routing = read('lib/orb/orb-front-door-routing.ts')
    assert.match(middleware, /isOrbPrivacyPublicPath/)
    assert.match(routing, /\/orb\/privacy/)
  })

  it('founder admin privacy request route exists without exposing unsafe content helpers', () => {
    const route = read('app/api/founder/orb/privacy-requests/route.ts')
    const db = readFileSync(join(root, '../db/orb_privacy_requests_db.py'), 'utf8')
    assert.match(route, /privacy', 'requests'/)
    assert.match(db, /_redact_admin_summary/)
    assert.match(db, /sanitise_privacy_request_summary/)
  })

  it('legal links point to ORB privacy page', () => {
    const links = read('components/orb-residential/orb-legal-links.tsx')
    assert.match(links, /privacy: '\/orb\/privacy'/)
  })
})
