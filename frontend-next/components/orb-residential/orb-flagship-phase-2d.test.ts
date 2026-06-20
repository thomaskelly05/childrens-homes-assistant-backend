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

describe('ORB Residential Phase 2H flagship UX convergence', () => {
  it('build version marker is phase-3b on shell and visual build', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3i-calm-composer')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-visual-version=\{ORB_BUILD_VISUAL_VERSION\}/)
  })

  it('single-shell CSS import remains canonical', () => {
    const layout = read('app/orb/layout.tsx')
    const cssImports = [...layout.matchAll(/import ['"]\.\/([^'"]+\.css)['"]/g)].map((match) => match[1])
    assert.deepEqual(cssImports, ['orb-residential-shell.css'])
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Login has premium product entrance structure', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const shell = read('components/orb-residential/orb-login-screen.tsx')
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    const copy = read('lib/orb/orb-login-stations-copy.ts')
    assert.match(hero, /data-orb-login-entrance/)
    assert.match(hero, /data-orb-login-luminous-orb/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUBHEADLINE/)
    assert.match(hero, /ORB_LOGIN_ENTERPRISE_SUPPORTING/)
    assert.match(copy, /ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE/)
    assert.match(copy, /ORB_LOGIN_FOUNDER_LINE/)
    assert.match(hero, /data-orb-login-capability-groups/)
    for (const label of ['Think', 'Capture', 'Evidence']) {
      assert.match(hero + copy, new RegExp(label))
    }
    assert.match(shell, /data-orb-login-auth-connected/)
    assert.match(auth, /data-orb-login-demo-visible/)
    assert.doesNotMatch(hero, /data-orb-login-stations-scroll/)
  })

  it('ORB identity has explicit square circular geometry and is reused across core surfaces', () => {
    const css = read('app/orb/orb-residential-shell.css')
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    assert.match(presence, /data-orb-presence/)
    assert.match(css, /\.orb-presence\s*\{[\s\S]*aspect-ratio:\s*1/)
    assert.match(css, /\.orb-presence \.orb-living-sphere[\s\S]*border-radius:\s*50%/)
    assert.match(css, /\.orb-presence::after[\s\S]*radial-gradient/)
    assert.match(read('components/orb-residential/orb-login-desktop-hero.tsx'), /variant="hero"/)
    assert.match(read('components/orb-residential/orb-user-avatar.tsx'), /GlassOrbMark/)
  })

  it('sidebar identity, readable new chat action and billing placement remain correct', () => {
    const brand = read('components/orb-residential/ui/orb-brand-mark.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(brand, /OrbBrandMark/)
    assert.match(brand, /ORB Residential/)
    assert.match(brand, /Powered by IndiCare Intelligence|ORB_RESIDENTIAL_TAGLINE/)
    assert.match(read('components/orb-residential/ui/orb-icon.tsx'), /ORB_ICON_MAP/)
    assert.match(sidebar, /data-orb-sidebar-new-chat/)
    assert.match(sidebar, /orb-sidebar-new-chat-label">New chat/)
    assert.match(sidebar, /OrbIcon name="new_chat"[^>]+text-white/)
    assert.doesNotMatch(sidebar, /data-orb-sidebar-billing/)
    assert.doesNotMatch(sidebar, /label:\s*['"]Billing['"]/)
    assert.doesNotMatch(read('components/orb-residential/orb-account-menu.tsx'), /testId="billing"/)
    assert.match(sidebar, /hasVisibleProjects \|\| projectEditorOpen \? \(/)
    assert.match(sidebar, /meaningfulRecentChats\.length \? \(/)
    assert.match(settings, /id: 'account_billing', label: 'Account & Billing'/)
  })

  it('profile editing includes name, role, avatar, save state and explicit local fallback', () => {
    const profile = read('components/orb-residential/orb-residential-profile-settings-section.tsx')
    assert.match(profile, /data-orb-settings-profile-name/)
    assert.match(profile, /data-orb-settings-profile-role/)
    assert.match(profile, /data-orb-settings-profile-avatar-input/)
    assert.match(profile, /data-orb-settings-profile-orb-fallback/)
    assert.match(profile, /data-orb-settings-profile-save/)
    assert.match(profile, /data-orb-settings-profile-saved/)
    assert.match(profile, /Saved on this device until account sync is available/)
    assert.match(profile, /TODO: Sync these fields/)
  })

  it('home keeps the central composer uncluttered and retains compact safety copy', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const copy = read('lib/orb/orb-residential-shell-copy.ts')
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(copy, /professional judgement/)
    assert.match(companion, /\{!residentialSurface \? \([\s\S]*data-orb-empty-starter-chips/)
    assert.doesNotMatch(companion, /data-orb-home-demo-strip/)
  })

  it('dictate flagship structure uses studio header, capture canvas and ORB Review without developer progression', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    assert.match(workspace, /data-orb-dictate-journey="Capture → Transcript → ORB Review → Safer Draft → ORB Write"/)
    assert.match(workspace, /data-orb-dictate-capture-affordances/)
    assert.match(workspace, /data-orb-dictate-capture-panel/)
    assert.match(workspace, /data-orb-dictate-review-panel/)
    assert.match(workspace, /data-orb-dictate-designed-workflow/)
    for (const label of ['Capture', 'Transcript', 'ORB Review', 'Output']) {
      assert.match(workspace, new RegExp(label))
    }
    assert.match(workspace, /data-orb-dictate-stage-interface/)
    assert.match(workspace, /data-orb-dictate-paste-notes-control/)
    assert.match(workspace, /data-orb-dictate-output-stage/)
    assert.match(workspace, /Create safer draft/)
    assert.match(topBar, /Create safer draft/)
    assert.match(topBar, /Send to ORB Write/)
    assert.match(transcript, /data-orb-dictate-capture-zone/)
    assert.match(topBar, /data-orb-dictate-capture-controls/)
    assert.match(topBar, /OrbIcon/)
    assert.match(read('lib/orb/orb-user-facing-names.ts'), /Record, paste or upload what happened\. ORB helps turn rough information into a safer draft for adult review\./)
    assert.match(read('components/orb/dictate/OrbDictateBrainPanel.tsx'), /What may be missing/)
  })

  it('ORB Write documentation studio structure with grouped OrbIcon toolbar', () => {
    const panel = read('components/orb-write/orb-write-station.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(panel, /GlassOrbMark/)
    assert.match(panel, /IndiCare Intelligence&apos;s care documentation studio/)
    assert.match(panel, /Draft, review and finalise adult-led records in one calm workspace\./)
    assert.match(panel, /data-orb-write-integrated-studio-surface/)
    assert.match(panel, /data-orb-write-full-width-studio/)
    assert.match(panel, /data-orb-write-layout="studio-wide"/)
    assert.match(panel, /data-orb-write-create-final-draft/)
    assert.match(read('components/orb-write/orb-write-ai-panel.tsx'), /data-orb-write-review-structure-panel/)
    for (const group of ['structure', 'format', 'review', 'export']) {
      assert.match(toolbar, new RegExp(`data-orb-write-toolbar-group="${group}"`))
    }
    assert.match(read('components/orb-write/orb-write-ai-panel.tsx'), /observation, interpretation, child&apos;s voice, adult response, outcome, follow-up and oversight/)
    assert.match(read('components/orb-write/orb-write-editor.tsx'), /Review required/)
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
    assert.match(read('components/orb-standalone/orb-voice-hero-stage.tsx'), /data-orb-voice-main-mode-controls/)
    assert.match(selector, /data-orb-voice-mode-central/)
    assert.match(selector, /data-orb-voice-mode-selection-label/)
    assert.match(selector, /data-orb-voice-style-controls/)
    assert.match(selector, /data-orb-voice-reasoning-controls/)
    assert.match(selector, /data-orb-voice-mode-summary/)
    assert.match(voice, /data-orb-voice-controls-main-screen/)
    assert.match(voice, /data-orb-voice-controls-not-settings/)
    assert.match(voice, /Audio is not stored\. Review any transcript before use\./)
    assert.match(read('lib/orb/voice/orb-voice-ui-state.ts'), /return 'Push to talk'/)
    assert.match(read('lib/orb/voice/orb-voice-ui-state.ts'), /return 'Ready to talk'/)
    const modes = read('lib/orb/orb-voice-mode-carousel.ts')
    for (const label of ['Calm', 'Warm', 'Direct', 'Reflective', 'Talk it through', 'Safeguarding thinking', 'Supervision prep', 'Clear summary']) {
      assert.match(modes, new RegExp(label))
    }
  })

  it('communicate explains its purpose and renders a premium support pack', () => {
    const create = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    const pack = read('components/orb-communicate/orb-communicate-support-pack-view.tsx')
    assert.match(create, /Describe the communication need/)
    assert.match(create, /Create accessible explanations, visual supports, social story sections/)
    assert.match(create, /ORB_COMMUNICATE_CREATOR_HEADLINE/)
    assert.match(create, /What does the person need to understand, say, choose or prepare for/)
    assert.match(create, /ORB_COMMUNICATE_PACK_PREVIEW/)
    assert.match(create, /data-orb-communicate-output-type/)
    assert.match(create, /data-orb-communicate-prompt-input/)
    assert.match(create, /data-orb-communicate-natural-language-input/)
    assert.match(create, /data-orb-communicate-support-pack-preview/)
    assert.match(create, /data-orb-communicate-placeholder-visual-cards/)
    assert.match(create, /data-orb-communicate-original-placeholder-visuals/)
    assert.match(create, /consistent accessible visuals that can be personalised around the way each person communicates/)
    assert.match(create, /OrbCommunicateGuidePanel/)
    assert.match(create, /OrbCommunicateAdvancedTools/)
    assert.match(read('components/orb-communicate/orb-communicate-hub.tsx'), /data-orb-communicate-advanced-tools/)
    assert.match(pack, /data-orb-communicate-pack-sections/)
    assert.match(pack, /data-orb-communicate-pack-voice-profile/)
    assert.match(pack, /data-orb-communicate-action-placeholder/)
    assert.match(pack, /data-orb-communicate-pack-safeguarding-mode/)
  })

  it('settings profile and billing sections remain complete', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const profile = read('components/orb-residential/orb-residential-profile-settings-section.tsx')
    const billing = read('components/orb-standalone/orb-billing-settings-section.tsx')
    assert.match(settings, /className="orb-settings-layout/)
    assert.match(settings, /data-orb-settings-nav/)
    assert.match(settings, /data-orb-settings-brand/)
    assert.match(settings, /data-orb-settings-scroll/)
    assert.doesNotMatch(settings, /orb-studio-shell[^\n]+orb-modal/)
    assert.match(profile, /data-orb-settings-profile-save/)
    assert.match(profile, /data-orb-settings-profile-local-note/)
    assert.match(billing, /data-orb-billing-included/)
    assert.match(billing, /data-orb-billing-plan-card/)
    assert.match(billing, /data-orb-billing-usage/)
    assert.match(billing, /data-orb-billing-provider/)
    assert.match(billing, /data-orb-billing-trust/)
    assert.match(read('lib/orb/orb-residential-ui-copy.ts'), /'Communicate'/)
  })

  it('account quick actions keep billing exclusively inside Settings', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    assert.doesNotMatch(account, /Manage billing/)
    assert.doesNotMatch(account, /data-orb-account-billing/)
    assert.doesNotMatch(account, /data-orb-account-subscribe/)
    assert.match(read('components/orb-standalone/orb-standalone-settings-panel.tsx'), /account_billing/)
  })

  it('help, settings and account overlays remain scroll-safe and viewport-bound', () => {
    const css = read('app/orb/orb-residential-shell.css')
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const account = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(css, /orb-modal--no-clip/)
    assert.match(css, /max-height: min\(760px, calc\(100dvh - 48px\)\)/)
    assert.match(help, /orb-modal--scroll-safe/)
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(account, /max-h-\[min\(21rem,calc\(100dvh/)
    assert.match(account, /overflow-y-auto/)
  })

  it('records empty state includes Communicate and all three creation routes', () => {
    const records = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const names = read('lib/orb/orb-user-facing-names.ts')
    assert.match(names, /Saved adult-reviewed outputs from Chat, Dictate, Voice, Communicate and ORB Write appear here\./)
    assert.match(records, /Start in Dictate/)
    assert.match(records, /Start in Communicate/)
    assert.match(records, /Create in ORB Write/)
  })

  it('does not reintroduce legacy shell classes into the active render tree', () => {
    const active = [
      read('app/orb/layout.tsx'),
      read('components/orb-standalone/orb-care-companion.tsx'),
      read('components/orb-residential/orb-residential-sidebar.tsx')
    ].join('\n')
    for (const legacyClass of [
      'orb-flagship-shell',
      'orb-full-viewport-shell',
      'orb-residential-app-shell',
      'orb-flagship-phase-',
      'orb-full-viewport-phase-',
      'orb-convergence-phase-',
      'orb-showstopper-',
      'orb-theme-lock-'
    ]) {
      assert.doesNotMatch(active, new RegExp(legacyClass))
    }
  })
})
