import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile simplification pass', () => {
  it('mobile home shows three primary starters and privacy guidance link', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const privacy = read('components/orb-residential/orb-privacy-guidance-sheet.tsx')
    assert.equal(copy.match(/ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 3/)?.[0], 'ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 3')
    assert.match(composer, /mobileViewport/)
    assert.match(composer, /chatHasMessages/)
    assert.match(composer, /OrbResidentialPrivacyGuidanceLink/)
    assert.match(privacy, /data-orb-privacy-guidance-link/)
    assert.match(privacy, /data-orb-privacy-guidance-sheet/)
  })

  it('more examples opens grouped residential bottom sheet', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-more-examples-sheet/)
    assert.match(companion, /ORB_RESIDENTIAL_STARTER_GROUPS\.map/)
    assert.match(companion, /data-orb-starter-group=/)
  })

  it('billing uses collapsible sections and avoids duplicate mobile CTAs', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-collapsible/)
    assert.match(billing, /data-orb-billing-included-summary/)
    assert.match(billing, /hidden sm:flex/)
    assert.match(billing, /data-orb-billing-sticky-footer/)
  })

  it('settings mobile detail avoids duplicate appearance headings', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /suppressHeader=\{showMobileDetail\}/)
    assert.match(settings, /Theme, text size and motion/)
    assert.match(settings, /isMobile\s*\?\s*undefined/)
  })

  it('dictate mobile uses collapsible privacy and compact orb', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const boundary = read('components/orb-standalone/orb-dictate-boundary-copy.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(dictate, /data-orb-dictate-capture-idle/)
    assert.match(dictate, /collapsible/)
    assert.match(boundary, /data-orb-dictate-boundary-disclosure/)
    assert.match(mobileCss, /orb-dictate-mobile-orb--compact/)
  })

  it('voice mobile uses compact safety disclosure', () => {
    const voice = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    assert.match(voice, /data-orb-voice-safety-disclosure/)
    assert.match(voice, /Not for emergencies/)
  })

  it('write mobile ask orb uses icon fab and compact safety disclosure', () => {
    const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(toolbar, /aria-label="Ask ORB about this document"/)
    assert.match(toolbar, /MessageCircle/)
    assert.match(panel, /data-orb-write-safety-disclosure/)
    assert.match(panel, /Adult approval required/)
  })
})
