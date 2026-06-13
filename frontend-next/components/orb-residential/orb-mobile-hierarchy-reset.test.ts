import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile hierarchy reset', () => {
  it('mobile home uses two suggestion cards, compact orb, and optional subline', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.equal(
      copy.match(/ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 2/)?.[0],
      'ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTER_COUNT = 2'
    )
    assert.match(copy, /ORB_RESIDENTIAL_MOBILE_EMPTY_SUBLINE/)
    assert.match(companion, /variant=\{isMobileViewport \? 'compact' : 'hero'\}/)
    assert.match(companion, /data-orb-starter-suggestion-card/)
    assert.match(companion, /ORB_RESIDENTIAL_MOBILE_EMPTY_SUBLINE/)
    assert.match(mobileCss, /\[data-orb-empty-subline-mobile\]/)
  })

  it('composer tools sheet replaces visible dictate/voice row on mobile', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(composer, /data-orb-composer-tools-trigger/)
    assert.match(composer, /data-orb-composer-attach/)
    assert.doesNotMatch(composer, /OrbResidentialPrivacyGuidanceIcon/)
    assert.match(tools, /data-orb-composer-tools-sheet/)
    assert.match(tools, /orb_dictate/)
    assert.match(tools, /orb_voice/)
    assert.match(tools, /orb_write/)
    assert.match(tools, /use_template/)
    assert.match(tools, /privacy_guidance/)
    assert.match(mobileCss, /\[data-orb-composer-quick-actions\]/)
    assert.match(mobileCss, /\[data-orb-composer-tools-trigger\]/)
  })

  it('dictate mobile idle removes decorative orb clutter', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(dictate, /data-orb-dictate-capture-idle/)
    assert.match(dictate, /data-orb-dictate-capture-panel/)
    assert.match(dictate, /data-orb-dictate-idle-shell/)
    assert.doesNotMatch(dictate, /orb-dictate-mobile-orb/)
    assert.match(mobileCss, /\[data-orb-dictate-capture-panel='true'\]/)
  })

  it('voice mobile uses smaller hero stage sizing', () => {
    const voiceContent = read('components/orb-standalone/orb-voice-station-content.tsx')
    const voiceHero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const voiceStation = read('components/orb-standalone/orb-voice-station.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(voiceContent, /heroStageId=\{isMobileViewport \? 'mobile' : 'desktop'\}/)
    assert.match(voiceContent, /data-orb-voice-mobile-action-dock/)
    assert.match(voiceHero, /mobile-preview/)
    assert.match(voiceStation, /ORB_VOICE_PANEL_MOBILE_SUBTITLE/)
    assert.match(mobileCss, /\[data-orb-voice-mobile-hero-stage\]/)
    assert.match(mobileCss, /\[data-orb-workspace-panel='voice'\]/)
  })

  it('templates mobile hides duplicate hero and recording library header', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(templates, /useOrbMobileViewport/)
    assert.match(templates, /!isMobileViewport \?/)
    assert.match(templates, /data-orb-recording-library-filters-mobile/)
    assert.match(templates, /data-orb-templates-mobile-header/)
    assert.match(templates, /data-orb-templates-mobile-record-list/)
  })

  it('billing mobile hides duplicate account card while keeping compact layout', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-mobile-layout="compact"/)
    assert.match(billing, /hidden flex-col gap-3 sm:flex/)
    assert.match(billing, /data-orb-billing-collapsible/)
  })

  it('account menu stays compact without blur orb background', () => {
    const account = read('components/orb-residential/orb-account-menu.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(account, /min-h-\[2\.75rem\]/)
    assert.doesNotMatch(account, /backdrop-blur/)
    assert.match(mobileCss, /\.orb-account-menu[\s\S]*backdrop-filter:\s*none/)
  })
})
