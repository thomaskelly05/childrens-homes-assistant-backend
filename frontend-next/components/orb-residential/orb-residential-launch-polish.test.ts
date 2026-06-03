import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential launch polish', () => {
  it('mobile home starter cards use premium dark glass not white blocks', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(mobileCss, /html\[data-orb-residential='1'\] \[data-orb-starter-card\]/)
    assert.match(mobileCss, /--orb-premium-glass/)
    assert.doesNotMatch(
      mobileCss,
      /html\[data-orb-residential='1'\] \[data-orb-starter-card\][\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\)/
    )
    assert.doesNotMatch(
      mobileCss,
      /html\[data-orb-residential='1'\] \[data-orb-starter-card\][\s\S]*background:\s*#ffffff/
    )
  })

  it('care companion renders one main composer when workspace panel closed', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /composer=\{activeWorkspacePanel \? null : composer\}/)
    assert.match(companion, /data-orb-composer="main"/)
    assert.match(composer, /data-orb-standalone-composer/)
  })

  it('mobile shell prevents horizontal overflow on residential', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(theme, /overflow-x-hidden/)
    assert.match(mobileCss, /overflow-x:\s*hidden/)
    assert.match(mobileCss, /html\[data-orb-residential='1'\] \.orb-chat-shell > \.orb-chat-main/)
  })

  it('workspace panels use dark mobile tokens on residential', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const frame = readComponent('components/orb-standalone/orb-workspace-frame.tsx')
    assert.match(frame, /--orb-mobile-ws-panel/)
    assert.match(frame, /data-orb-workspace-header/)
    assert.match(mobileCss, /\.orb-chat-layout--residential \.orb-main-workspace/)
    assert.match(mobileCss, /--orb-mobile-ws-card/)
  })

  it('billing and account modals use dark workspace cards', () => {
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    const account = readComponent('components/orb-standalone/orb-account-modal.tsx')
    assert.match(billing, /orb-billing-card/)
    assert.match(billing, /--orb-mobile-ws-card/)
    assert.doesNotMatch(billing, /bg-white/)
    assert.match(account, /orb-mobile-workspace-card/)
    assert.match(readComponent('app/orb/orb-mobile.css'), /\[data-orb-billing-modal\] \.orb-billing-card/)
    assert.match(readComponent('app/orb/orb-mobile.css'), /\[data-orb-account-modal\]/)
  })

  it('desktop shell stays dark locked for residential', () => {
    const desktop = readComponent('app/orb/orb-desktop.css')
    const premium = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(desktop, /\.orb-chat-layout--residential[\s\S]*color-scheme:\s*dark/)
    assert.match(premium, /ORB Residential launch lock/)
    assert.match(premium, /color-scheme:\s*dark !important/)
    assert.doesNotMatch(premium, /--orb-mobile-bg:\s*#f5f9ff/)
  })

  it('mobile sidebar drawer does not reserve layout width on main column', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const layout = readComponent('components/orb/orb-layout.tsx')
    assert.match(layout, /-translate-x-full/)
    assert.match(layout, /fixed inset-y-0 left-0/)
    assert.match(mobileCss, /\.orb-chat-layout--residential \.orb-chat-shell > \.orb-chat-main/)
    assert.match(mobileCss, /flex:\s*1 1 100%/)
  })

  it('residential launch lock keeps dark surfaces when orb-theme-light is present', () => {
    const premium = readComponent('app/orb/orb-premium-tokens.css')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(premium, /\.orb-chat-layout--residential\.orb-theme-light[\s\S]*--orb-premium-bg-deep:\s*#05070d/)
    assert.match(mobileCss, /\.orb-chat-layout--residential\.orb-theme-light \.orb-main-workspace/)
    assert.doesNotMatch(
      mobileCss,
      /\.orb-chat-layout--residential\.orb-theme-light \.orb-main-workspace[\s\S]*#f7fbff/
    )
  })

  it('billing CTA bar uses flexible wrap without overflow', () => {
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(billing, /data-orb-billing-cta-bar/)
    assert.match(billing, /min-h-11/)
    assert.match(billing, /min-w-0/)
    assert.match(mobileCss, /\[data-orb-billing-cta-bar\] button/)
  })

  it('workspace headers share mobile chrome markers', () => {
    const frame = readComponent('components/orb-standalone/orb-workspace-frame.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(frame, /data-orb-workspace-back/)
    assert.match(frame, /data-orb-panel-close/)
    assert.match(mobileCss, /data-orb-workspace-header|\.orb-workspace-header/)
  })

  it('sidebar search has residential contrast hook', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(sidebar, /data-orb-sidebar-search/)
    assert.match(sidebar, /data-orb-sidebar-search-wrap/)
    assert.match(mobileCss, /\.orb-sidebar-search/)
  })
})
