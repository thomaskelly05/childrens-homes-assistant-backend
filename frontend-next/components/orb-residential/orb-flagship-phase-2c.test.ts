import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 2C deploy verification and flagship completion', () => {
  it('build version marker is phase-2c on shell and visual build', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-2c')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-visual-version=\{ORB_BUILD_VISUAL_VERSION\}/)
  })

  it('single-shell CSS import remains canonical', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Phase 2B identity features still present', () => {
    assert.match(read('components/orb-residential/ui/orb-brand-mark.tsx'), /OrbBrandMark/)
    assert.match(read('components/orb-residential/ui/orb-icon.tsx'), /ORB_ICON_MAP/)
    assert.match(read('components/orb-standalone/orb-care-companion.tsx'), /data-orb-home-safety-line/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /OrbVoiceModeSelector/)
    assert.doesNotMatch(read('components/orb-residential/orb-residential-sidebar.tsx'), /data-orb-sidebar-billing/)
    assert.match(read('components/orb-standalone/orb-standalone-settings-panel.tsx'), /account_billing/)
  })

  it('dictate flagship structure includes progression and capture studio', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(workspace, /data-orb-dictate-progression/)
    assert.match(workspace, /data-orb-dictate-capture-affordances/)
    assert.match(workspace, /data-orb-dictate-capture-panel/)
    assert.match(transcript, /data-orb-dictate-capture-zone/)
    assert.match(topBar, /data-orb-dictate-capture-controls/)
    assert.match(topBar, /OrbIcon/)
  })

  it('ORB Write documentation studio structure with grouped OrbIcon toolbar', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(panel, /GlassOrbMark/)
    assert.match(panel, /specialist care documentation studio/)
    assert.match(toolbar, /data-orb-write-toolbar-group="structure"/)
    assert.match(toolbar, /OrbIcon/)
  })

  it('OrbIcon used beyond sidebar in station controls', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(sidebar, /OrbIcon/)
    assert.match(topBar, /OrbIcon/)
    assert.match(toolbar, /OrbIcon/)
  })

  it('voice mode selector is visible and central', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const selector = read('components/orb-residential/orb-voice-mode-selector.tsx')
    assert.match(voice, /OrbVoiceModeSelector/)
    assert.match(selector, /data-orb-voice-mode-central/)
    assert.match(selector, /data-orb-voice-mode-selection-label/)
  })

  it('communicate support pack output has polished sections and placeholders', () => {
    const pack = read('components/orb-communicate/orb-communicate-support-pack-view.tsx')
    assert.match(pack, /data-orb-communicate-pack-sections/)
    assert.match(pack, /data-orb-communicate-pack-voice-profile/)
    assert.match(pack, /data-orb-communicate-action-placeholder/)
    assert.match(pack, /data-orb-communicate-pack-safeguarding-mode/)
  })

  it('settings profile and billing sections remain complete', () => {
    const profile = read('components/orb-residential/orb-residential-profile-settings-section.tsx')
    const billing = read('components/orb-standalone/orb-billing-settings-section.tsx')
    assert.match(profile, /data-orb-settings-profile-save/)
    assert.match(profile, /data-orb-settings-profile-local-note/)
    assert.match(billing, /data-orb-billing-included/)
    assert.match(billing, /data-orb-billing-plan-card/)
  })

  it('modal no-clip and scroll-safe classes remain', () => {
    const css = read('app/orb/orb-residential-shell.css')
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    assert.match(css, /orb-modal--no-clip/)
    assert.match(help, /orb-modal--scroll-safe/)
  })
})
