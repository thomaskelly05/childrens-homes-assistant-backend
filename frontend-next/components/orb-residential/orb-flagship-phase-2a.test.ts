import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS } from '../../lib/orb/orb-residential-ui-copy.ts'
import { ORB_LOGIN_CAPABILITY_GROUPS } from '../../lib/orb/orb-login-stations-copy.ts'
import { ORB_RECORDS_EMPTY_SUBTITLE } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 2A identity and station maturity', () => {
  it('billing is removed from sidebar nav and lives in settings', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(sidebar, /data-orb-sidebar-billing/)
    assert.match(settings, /account_billing/)
    assert.match(settings, /Account & Billing/)
    assert.match(companion, /openSettingsPanel\('account_billing'\)/)
  })

  it('sidebar brand includes ORB identity mark', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const brand = read('components/orb-residential/ui/orb-brand-mark.tsx')
    assert.match(sidebar, /OrbBrandMark/)
    assert.match(brand, /data-orb-sidebar-brand/)
    assert.match(brand, /ORB_RESIDENTIAL_TAGLINE/)
  })

  it('new chat button is primary with accessible label', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(sidebar, /data-orb-sidebar-new-chat/)
    assert.match(sidebar, /aria-label="New chat"/)
    assert.match(sidebar, /orb-sidebar-nav-item--primary/)
    assert.match(css, /orb-sidebar-nav-item--primary/)
  })

  it('home no longer renders starter chip block beneath composer', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /data-orb-workspace-starters/)
    assert.match(companion, /data-orb-home-safety-line/)
  })

  it('communicate hero explains purpose and outputs', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /data-orb-communicate-subtitle/)
    assert.match(flow, /social story sections/)
    assert.match(flow, /data-orb-communicate-supporting-line/)
    assert.match(flow, /data-orb-communicate-outputs/)
    assert.match(flow, /Explain that contact has changed/)
  })

  it('login page includes capability groups and Communicate in product copy', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(hero, /data-orb-login-capability-groups/)
    assert.match(hero, /ORB_LOGIN_CAPABILITY_GROUPS/)
    assert.match(hero, /GlassOrbMark/)
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((group) => group.id === 'evidence'))
  })

  it('help and safety modal has scroll-safe layout', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(help, /orb-modal--scroll-safe/)
    assert.match(css, /max-height: min\(760px, calc\(100dvh - 48px\)\)/)
  })

  it('profile editing UI exists for name, role and avatar', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const profile = read('components/orb-residential/orb-residential-profile-settings-section.tsx')
    assert.match(settings, /OrbResidentialProfileSettingsSection/)
    assert.match(settings, /id: 'profile'/)
    assert.match(profile, /data-orb-settings-profile-name/)
    assert.match(profile, /data-orb-settings-profile-role/)
    assert.match(profile, /data-orb-settings-profile-avatar-input/)
    assert.match(profile, /data-orb-settings-profile-save/)
  })

  it('ORB Write exposes core word processor controls', () => {
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(toolbar, /data-orb-write-undo/)
    assert.match(toolbar, /data-orb-write-bold/)
    assert.match(toolbar, /data-orb-write-table/)
    assert.match(toolbar, /data-orb-write-export-pdf/)
    assert.match(toolbar, /data-orb-write-toolbar/)
  })

  it('voice mode selector exists and is accessible', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const selector = read('components/orb-residential/orb-voice-mode-selector.tsx')
    assert.match(voice, /OrbVoiceModeSelector/)
    assert.match(selector, /data-orb-voice-mode-selector/)
    assert.match(selector, /role="radio"/)
    assert.match(selector, /data-orb-voice-style-controls/)
    assert.match(selector, /data-orb-voice-reasoning-option/)
  })

  it('dictate exposes capture, review and draft flow', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /data-orb-dictate-capture-panel/)
    assert.match(workspace, /data-orb-dictate-review-panel/)
    assert.match(workspace, /OrbDictateReviewChecklist/)
    assert.match(workspace, /OrbDictateBrainPanel/)
    assert.match(workspace, /OrbDictateSaferDraftPanel/)
  })

  it('records empty state includes Communicate', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Communicate/)
    assert.match(panel, /data-orb-saved-start-communicate/)
  })

  it('billing included list contains Communicate', () => {
    assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes('Communicate'))
  })

  it('single CSS shell contract remains valid', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-minimal-canvas-phase|orb-personality-phase/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('no legacy shell classes reintroduced in companion', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-flagship-shell|orb-chat-shell|orb-composer-v2/)
  })
})
