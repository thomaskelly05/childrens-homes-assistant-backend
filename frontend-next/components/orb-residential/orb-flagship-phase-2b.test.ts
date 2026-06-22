import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS } from '../../lib/orb/orb-residential-ui-copy.ts'
import { ORB_LOGIN_CAPABILITY_GROUPS } from '../../lib/orb/orb-login-stations-copy.ts'
import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 2B repair pass', () => {
  it('layout imports only approved ORB CSS', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|phase-2|orb-theme\.css|orb-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('no legacy shell classes reintroduced', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-flagship-shell|orb-chat-shell|orb-residential-app-shell/)
  })

  it('sidebar uses OrbBrandMark and readable new chat label', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(sidebar, /OrbBrandMark/)
    assert.match(sidebar, /data-orb-sidebar-new-chat/)
    assert.match(sidebar, />New chat</)
    assert.match(css, /orb-sidebar-nav-item--primary[\s\S]*span/)
    assert.doesNotMatch(sidebar, /data-orb-sidebar-billing/)
  })

  it('central OrbIcon mapping exists', () => {
    const icon = read('components/orb-residential/ui/orb-icon.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(icon, /ORB_ICON_MAP/)
    assert.match(icon, /data-orb-icon/)
    assert.match(sidebar, /OrbIcon/)
  })

  it('account billing lives in settings with included list', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-settings-section.tsx')
    assert.match(settings, /account_billing/)
    assert.match(billing, /data-orb-billing-included/)
    assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes('Communicate'))
  })

  it('home has ORB identity and no starter chip block', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /data-orb-workspace-starters/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /data-orb-brand-eyebrow|GlassOrbMark/)
  })

  it('login includes capability groups and founder line', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(hero, /ORB_LOGIN_CAPABILITY_GROUPS/)
    assert.match(hero, /data-orb-login-capability-groups/)
    assert.match(hero, /ORB_LOGIN_FOUNDER_LINE/)
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((g) => g.id === 'capture'))
  })

  it('communicate explains support pack output', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /data-orb-communicate-pack-preview/)
    assert.match(flow, /data-orb-communicate-station-layout/)
    assert.match(flow, /Help explain a change of plan/)
  })

  it('voice mode selector visible on all viewports', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /OrbVoiceV2Carousel|ORB_VOICE_V2_PURPOSE_MODES/)
    assert.doesNotMatch(voice, /!isMobileViewport \? \([\s\S]*OrbVoiceModeSelector/s)
  })

  it('dictate has hero strip and capture review flow', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const documentWorkspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.match(workspace, /data-orb-dictate-capture-hero/)
    assert.match(capture, /data-orb-dictate-capture-panel/)
    assert.match(workspace, /data-orb-dictate-review-panel|OrbDictateReviewChecklist/)
    assert.match(documentWorkspace, /ORB_DICTATE_REVIEW_WITH_ORB/)
  })

  it('ORB Write uses care studio framing and grouped toolbar', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(panel, /data-orb-write-studio-guidance/)
    assert.match(panel, /Care documentation studio/)
    assert.match(toolbar, /data-orb-write-toolbar-group="structure"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="export"/)
  })

  it('profile settings include name role avatar save', () => {
    const profile = read('components/orb-residential/orb-residential-profile-settings-section.tsx')
    assert.match(profile, /data-orb-settings-profile-name/)
    assert.match(profile, /data-orb-settings-profile-role/)
    assert.match(profile, /data-orb-settings-profile-avatar-input/)
    assert.match(profile, /data-orb-settings-profile-save/)
    assert.match(profile, /data-orb-settings-profile-local-note/)
  })

  it('help panel uses scroll-safe structure without horizontal clip', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(css, /orb-modal--no-clip/)
  })

  it('records empty state includes Communicate action', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /data-orb-saved-start-communicate/)
  })
})
