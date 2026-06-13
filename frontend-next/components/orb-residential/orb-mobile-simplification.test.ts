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
  it('mobile home hides visible privacy link and uses composer shield trigger', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const privacy = read('components/orb-residential/orb-privacy-guidance-sheet.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.equal(copy.match(/ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 2/)?.[0], 'ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 2')
    assert.match(composer, /mobileViewport/)
    assert.match(composer, /chatHasMessages/)
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(composer, /data-orb-composer-tools-trigger/)
    assert.match(composer, /data-orb-composer-attach/)
    assert.match(privacy, /data-orb-privacy-guidance-sheet/)
    assert.match(mobileCss, /\[data-orb-composer-privacy-zone\] \[data-orb-privacy-guidance-link\]/)
  })

  it('mobile home uses horizontal suggestion cards with More card', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-starter-pills-grid/)
    assert.match(companion, /data-orb-starter-suggestion-card/)
    assert.match(companion, /data-orb-more-examples/)
    assert.match(companion, /data-orb-more-examples-sheet/)
    assert.match(companion, />\s*More\s*</)
    assert.match(companion, /ORB_RESIDENTIAL_STARTER_GROUPS\.map/)
    assert.match(companion, /data-orb-starter-group=/)
  })

  it('mobile header hides tagline and brand clutter on phone home', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(layout, /showTagline/)
    assert.match(companion, /showTagline=\{false\}/)
    assert.match(companion, /hidden text-\[11px\].*data-orb-empty-brand-line/s)
    assert.match(companion, /hidden max-w-lg text-sm.*data-orb-empty-subline/s)
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

  it('dictate mobile uses collapsible privacy, compact capture orb, and no idle generate panel', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const boundary = read('components/orb-standalone/orb-dictate-boundary-copy.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(dictate, /data-orb-dictate-capture-idle/)
    assert.match(dictate, /data-orb-dictate-title-spacing/)
    assert.match(dictate, /collapsible/)
    assert.match(dictate, /data-orb-dictate-options-chip/)
    assert.match(dictate, /data-orb-dictate-capture-orb/)
    assert.match(dictate, /GlassOrbMark/)
    assert.doesNotMatch(dictate, /data-orb-dictate-recording-options-toggle/)
    assert.doesNotMatch(dictate, /data-orb-dictate-generate-idle/)
    assert.match(boundary, /data-orb-dictate-boundary-disclosure/)
    assert.match(mobileCss, /\[data-orb-dictate-title-spacing\]/)
  })

  it('voice mobile uses compact safety disclosure', () => {
    const voice = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    assert.match(voice, /data-orb-voice-safety-disclosure/)
    assert.match(voice, /Not for emergencies/)
  })

  it('write mobile uses notepad surface and Review Approve More toolbar', () => {
    const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const mobileBody = read('lib/orb/write/orb-write-mobile-body.ts')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(toolbar, /data-orb-write-mobile-tab="review"/)
    assert.match(toolbar, /data-orb-write-approve/)
    assert.match(toolbar, /data-orb-write-mobile-tab="more"/)
    assert.match(toolbar, /data-orb-write-mobile-format-entry/)
    assert.match(toolbar, /data-orb-write-mobile-source-entry/)
    assert.match(toolbar, /data-orb-write-mobile-guidance-entry/)
    assert.match(editor, /data-orb-write-notepad/)
    assert.match(editor, /data-orb-write-notepad-body/)
    assert.match(editor, /orbWriteBodyToMobileNotepadHtml/)
    assert.match(editor, /onOpenSource/)
    assert.match(panel, /onOpenSource=\{\(\) => setSourcePanelOpen\(true\)\}/)
    assert.match(mobileBody, /data-orb-write-placeholder/)
    assert.match(panel, /data-orb-write-safety-disclosure/)
    assert.match(panel, /Adult approval required/)
    assert.match(mobileCss, /\[data-orb-write-notepad='true'\]/)
    assert.match(mobileCss, /\[data-orb-write-studio-header\] \[data-orb-write-source-toggle\]/)
  })
})
