import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile workspace dark surfaces', () => {
  it('defines shared mobile workspace tokens in theme source', () => {
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(theme, /ORB_THEME_MOBILE_WORKSPACE/)
    for (const token of [
      '--orb-mobile-ws-panel',
      '--orb-mobile-ws-card',
      '--orb-mobile-ws-card-border',
      '--orb-mobile-ws-text',
      '--orb-mobile-ws-muted',
      '--orb-mobile-ws-input',
      '--orb-mobile-ws-footer'
    ]) {
      assert.match(theme, new RegExp(token))
    }
  })

  it('mobile CSS avoids white card backgrounds in dark workspace panels', () => {
    const mobileCss = readComponent('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(mobileCss, /html\[data-orb-theme='dark'\] \.orb-main-workspace \.orb-mobile-workspace-card/)
    assert.match(mobileCss, /html\[data-orb-theme='dark'\] \.orb-main-workspace \.orb-doc-glass-card/)
    assert.match(mobileCss, /html\[data-orb-theme='dark'\] \.orb-main-workspace \.orb-station-empty-state/)
    assert.match(mobileCss, /\.orb-chat-layout--residential \.orb-main-workspace \.orb-mobile-workspace-card/)
    assert.doesNotMatch(
      mobileCss,
      /html\[data-orb-theme='dark'\][\s\S]*\.orb-main-workspace[\s\S]*background:\s*#fff(?:fff)?\b/i
    )
  })

  it('billing uses readable product modal cards and sticky footer tokens', () => {
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    const shellCss = readComponent('app/orb/orb-residential-shell.css')
    assert.match(billing, /orb-billing-card/)
    assert.match(billing, /data-orb-modal="product"/)
    assert.match(billing, /data-orb-billing-cta-bar/)
    assert.match(shellCss, /\[data-orb-billing-modal\]/)
    assert.match(billing, /safe-area-inset-bottom/)
  })

  it('saved outputs empty state uses dark mobile workspace card class', () => {
    const states = readComponent('components/orb-standalone/orb-station-panel-states.tsx')
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(states, /orb-mobile-workspace-card/)
    assert.match(saved, /OrbStationEmptyState/)
    assert.match(saved, /data-orb-saved-outputs-list/)
    assert.match(saved, /--orb-mobile-ws-text/)
    assert.doesNotMatch(saved, /bg-white\/\[0\.04\]/)
  })

  it('mobile panel body has safe-area bottom padding', () => {
    const frame = readComponent('components/orb-standalone/orb-workspace-frame.tsx')
    const mobileCss = readComponent('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(frame, /orb-mobile-workspace-body/)
    assert.match(frame, /safe-area-inset-bottom/)
    assert.match(mobileCss, /\.orb-main-workspace \.orb-workspace-body/)
    assert.match(mobileCss, /padding-bottom:\s*max\(1rem,\s*env\(safe-area-inset-bottom/)
  })

  it('settings mobile nav uses stacked list without horizontal overflow', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const mobileCss = readComponent('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(settings, /data-orb-settings-nav-mobile/)
    assert.match(settings, /flex-col/)
    assert.doesNotMatch(settings, /data-orb-settings-nav-mobile[\s\S]*overflow-x-auto/)
    assert.match(mobileCss, /\[data-orb-settings-nav-mobile\][\s\S]*overflow-x:\s*hidden/)
  })

  it('light-layer-fix does not target residential ORB', () => {
    const lightFix = readComponent('app/orb/_legacy-ui-archive/orb-light-layer-fix.css')
    assert.match(lightFix, /:not\(\.orb-chat-layout--residential\)/)
    assert.doesNotMatch(lightFix, /html\[data-orb-residential='1'\]/)
    assert.doesNotMatch(lightFix, /\.orb-chat-layout--residential\.orb-theme-light/)
  })
})
