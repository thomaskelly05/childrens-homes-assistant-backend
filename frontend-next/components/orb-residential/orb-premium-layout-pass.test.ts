import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential premium layout pass', () => {
  it('primary chat starters are capped at six visible pills', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(copy, /ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT = 6/)
    assert.match(copy, /ORB_RESIDENTIAL_MORE_STARTERS/)
    assert.match(companion, /slice\(0, ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT\)/)
    assert.match(companion, /data-orb-starter-count=\{emptyStarters\.length\}/)
    for (const label of [
      'Review written practice',
      'Create a handover',
      'Think through a safeguarding concern',
      'Record this properly',
      'Prepare for inspection',
      'Build an action plan'
    ]) {
      assert.match(copy, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('shell uses 100dvh viewport lock without page scroll', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(layout, /orb-shell\.css/)
    assert.match(css, /100dvh/)
    assert.match(css, /overflow:\s*hidden/)
    assert.match(companion, /h-\[100dvh\]/)
    assert.match(css, /\.orb-chat-layout--residential[\s\S]*overflow:\s*hidden/)
    assert.match(css, /\[data-orb-workspace-panel\] \.orb-workspace-body/)
  })

  it('station panels scroll internally inside one viewport', () => {
    const css = read('app/orb/orb-premium-layout-pass.css')
    const page = read('components/orb/premium/orb-premium-page.tsx')
    assert.match(css, /\[data-orb-knowledge-library-body\]/)
    assert.match(css, /\[data-orb-template-list-scroll\]/)
    assert.match(css, /\[data-orb-saved-outputs-list\]/)
    assert.match(css, /\[data-orb-workspace-panel='documents'\] \.orb-workspace-body[\s\S]*overflow:\s*hidden/)
    assert.match(page, /data-orb-knowledge-library-body/)
    assert.match(page, /data-orb-template-list-scroll/)
  })

  it('Documents & Guidance header stays visible above scroll body', () => {
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(documents, /data-orb-documents-station-header/)
    assert.match(documents, /data-orb-knowledge-library-tabs/)
    assert.match(documents, /compactChrome:\s*true/)
    assert.match(css, /\[data-orb-documents-station-header\][\s\S]*position:\s*sticky/)
    assert.match(css, /\[data-orb-documents-content-scroll\]/)
  })

  it('login hero sphere is sized to avoid clipping', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-login.css')
    const passCss = read('app/orb/orb-premium-layout-pass.css')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_LOGIN_VERSION = 'front-door-v5'/)
    assert.match(login, /data-orb-login-version=\{ORB_LOGIN_VERSION\}/)
    assert.match(login, /orb-login-hero-sphere-wrap/)
    assert.match(login, /scale-\[0\.52\]/)
    assert.match(css, /max-width:\s*7\.5rem/)
    assert.match(css, /max-height:\s*min\(6\.75rem,\s*14vh\)/)
    assert.match(passCss, /orb-login-hero[\s\S]*max-height:\s*100dvh/)
  })

  it('chat home uses prompt pills and more examples drawer', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(companion, /data-orb-starter-pills/)
    assert.match(companion, /data-orb-starter-pill/)
    assert.match(companion, /ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT/)
    assert.match(companion, /ORB_RESIDENTIAL_MORE_STARTERS/)
    assert.match(companion, /data-orb-more-examples/)
    assert.match(css, /\[data-orb-starter-pills\]/)
    assert.match(css, /orb-v2-atmosphere[\s\S]*opacity:\s*0\.42/)
  })

  it('Dictate studio keeps recorder bar and transcript as primary surface', () => {
    const dictate = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const topBar = read('components/orb/dictate/OrbDictateTopBar.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(dictate, /OrbDictateTopBar/)
    assert.match(topBar, /data-orb-dictate-top-bar/)
    assert.match(transcript, /data-orb-dictate-transcript-panel/)
    assert.match(brain, /data-orb-dictate-brain-collapse-toggle/)
    assert.match(css, /\[data-orb-dictate-transcript-panel\]/)
  })

  it('ORB Write has central document canvas and collapsible side panels', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(panel, /data-orb-write-layout/)
    assert.match(panel, /data-orb-write-source-open/)
    assert.match(panel, /data-orb-write-guidance-open/)
    assert.match(panel, /data-orb-write-compact-height/)
    assert.match(panel, /data-orb-write-panel-toggle/)
    assert.match(editor, /data-orb-write-document-canvas/)
    assert.match(css, /\.orb-write-studio-grid/)
    assert.match(css, /data-orb-write-compact-height/)
  })

  it('template cards tuck therapeutic guidance into expandable detail', () => {
    const cards = read('components/orb/recording/OrbRecordingLibraryCards.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(cards, /data-orb-recording-writing-detail/)
    assert.match(cards, /Writing guidance & therapeutic prompts/)
    assert.match(css, /\[data-orb-recording-writing-detail\]/)
  })

  it('Voice keeps existing controls with unified residential station layout', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const css = read('components/orb-residential/orb-voice.css')
    assert.match(voice, /data-orb-voice-station/)
    assert.match(voice, /OrbVoiceStationContent/)
    assert.match(voice, /OrbVoiceActions/)
    assert.match(voice, /OrbVoiceDebugVisualShowcase/)
    assert.match(css, /\[data-orb-voice-state='listening'\]/)
    assert.match(css, /\[data-orb-voice-state='speaking'\]/)
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')
    assert.match(studio, /data-orb-voice-state-panel/)
    assert.match(studio, /data-orb-voice-mobile-preview/)
  })

  it('account, settings and billing open as overlays', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const accountMenu = read('components/orb-residential/orb-account-menu.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(companion, /OrbAccountMenu/)
    assert.match(companion, /OrbBillingModal/)
    assert.match(accountMenu, /data-orb-account-menu/)
    assert.match(billing, /data-orb-billing-modal/)
    assert.match(billing, /data-orb-billing-sticky-footer/)
    assert.match(settings, /data-orb-settings-panel/)
    assert.match(settings, /orb-settings-row/)
    assert.doesNotMatch(companion, /router\.push\('\/orb\/billing'\)/)
  })

  it('auth gate and product bootstrap remain untouched', () => {
    const shell = read('components/orb/orb-shell.tsx')
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(shell, /OrbAuthGate/)
    assert.match(gate, /OrbLoginScreen/)
    assert.doesNotMatch(read('app/orb/orb-premium-layout-pass.css'), /OrbAuthGate/)
  })
})
