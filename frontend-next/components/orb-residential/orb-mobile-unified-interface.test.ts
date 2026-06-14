import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential unified mobile interface pass', () => {
  it('aligns JS mobile breakpoint with orb-mobile.css', () => {
    const hook = read('components/orb-standalone/use-orb-responsive-mode.ts')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(hook, /MOBILE_MAX_WIDTH_PX = 1024/)
    assert.match(mobileCss, /@media \(max-width: 1023px\)/)
  })

  it('marks unified mobile surface on residential shell', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(companion, /data-orb-mobile-surface/)
    assert.match(mobileCss, /\[data-orb-mobile-surface='true'\]/)
  })

  it('hides duplicate ORB header when a workspace station is active', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /residentialSurface && !activeWorkspacePanel/)
    assert.match(companion, /OrbMobileChatHeader/)
  })

  it('saved outputs mobile renders one empty state only', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(saved, /isMobile && items\.length === 0 \? 'hidden'/)
    assert.match(saved, /data-orb-saved-outputs-empty/)
  })

  it('recording library uses flowing list on mobile', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(templates, /divide-y divide-\[var\(--orb-line\)\]/)
    assert.match(mobileCss, /\[data-orb-templates-panel\] \[data-orb-recording-library-section\]/)
  })

  it('station controls remain visible on mobile', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const voiceContent = read('components/orb-standalone/orb-voice-station-content.tsx')
    const write = read('components/orb-write/orb-write-mobile-toolbar.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(dictate, /data-orb-dictate-primary-action/)
    assert.match(voiceContent, /OrbVoiceResponsibilityStrip/)
    assert.match(write, /data-orb-write-approve/)
    assert.match(settings, /reduce-motion/)
    assert.match(billing, /data-orb-billing-refresh/)
  })

  it('plus sheet exposes upload-first actions as compact attachment tiles', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const uploadIndex = tools.indexOf('data-orb-composer-upload-actions')
    const orbIndex = tools.indexOf('data-orb-composer-orb-tools-section')
    assert.ok(uploadIndex >= 0 && orbIndex > uploadIndex)
    assert.match(tools, /ORB_COMPOSER_UPLOAD_PLUS_ACTIONS/)
    assert.match(tools, /take_photo/)
    assert.match(tools, /photo_library/)
    assert.match(tools, /choose_files/)
    assert.match(tools, /orb_dictate/)
    assert.match(tools, /privacy_guidance/)
  })

  it('billing status distinguishes loading and inactive', () => {
    const display = read('lib/orb/orb-billing-display.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(display, /OrbBillingStatusContext/)
    assert.match(display, /Syncing…/)
    assert.match(display, /Status unavailable/)
    assert.match(companion, /accessStatus === 'loading'/)
    assert.match(billing, /loadFailed/)
    assert.match(billing, /data-orb-billing-status-kind/)
  })

  it('settings persistence uses localStorage keys', () => {
    const a11y = read('lib/orb/standalone-accessibility.ts')
    const appearance = read('lib/orb/orb-appearance.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(a11y, /indicare\.orb\.standalone\.a11y\.v1/)
    assert.match(appearance, /orb-appearance-mode/)
    assert.match(companion, /loadStandaloneOrbAccessibility\(\)/)
    assert.match(companion, /saveStandaloneOrbAccessibility/)
    assert.match(companion, /setAppearanceMode/)
  })
})
