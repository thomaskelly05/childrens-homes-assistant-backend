import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential desktop final UX regressions', () => {
  it('desktop calm shell CSS is lg+ scoped under html[data-orb-residential]', () => {
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const mobile = read('app/orb/_legacy-ui-archive/orb-mobile.css')

    assert.match(desktop, /ORB Residential — desktop calm shell \(lg\+ only/)
    assert.match(desktop, /\[data-orb-sidebar-scroll\][\s\S]*overflow-y:\s*auto/)
    assert.match(desktop, /\.orb-composer-dock[\s\S]*visibility:\s*visible/)
    assert.match(desktop, /\[data-orb-saved-outputs-empty='true'\]/)
    assert.doesNotMatch(mobile, /desktop calm shell/)
  })

  it('desktop home composer is mounted and visible on empty chat', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')

    assert.match(companion, /data-orb-composer="main"/)
    assert.match(companion, /data-orb-composer-mounted="true"/)
    assert.match(companion, /composer=\{activeWorkspacePanel \? null : composer\}/)
    assert.match(composer, /orb-composer-zone/)
  })

  it('sidebar scroll container and account footer hooks exist', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')

    assert.match(layout, /data-orb-sidebar-scroll-container/)
    assert.match(sidebar, /data-orb-sidebar-scroll/)
    assert.match(sidebar, /data-orb-sidebar-account-footer/)
  })

  it('desktop layout audit checks composer, sidebar scroll, account footer, and theme', () => {
    const audit = read('components/orb-standalone/orb-ui-audit.ts')

    assert.match(audit, /composerVisibleOnHomeChat/)
    assert.match(audit, /sidebarScrollContainerExists/)
    assert.match(audit, /accountFooterReachable/)
    assert.match(audit, /horizontalOverflow/)
    assert.match(audit, /activeContentFitsViewport/)
    assert.match(audit, /themeMismatchCount/)
    assert.match(audit, /composer not visible on home\/chat/)
  })

  it('home orb overlap guard and capped hero size on desktop', () => {
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')

    assert.match(desktop, /\[data-orb-residential-empty\][\s\S]*--orb-presence-size:\s*clamp\(9\.5rem/)
    assert.match(companion, /data-orb-empty-heading-desktop/)
    assert.match(companion, /GlassOrbMark/)
    assert.doesNotMatch(companion, /orb-brand\.png/)
  })

  it('settings desktop width capped and appearance segmented control limited', () => {
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')

    assert.match(desktop, /\[data-orb-settings-panel\][\s\S]*--orb-desktop-settings-max/)
    assert.match(desktop, /\.orb-appearance-segmented[\s\S]*--orb-desktop-segmented-max/)
    assert.match(settings, /data-orb-settings-panel/)
  })

  it('workspace pages use capped content containers on desktop', () => {
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(desktop, /\[data-orb-document-panel\],[\s\S]*--orb-desktop-page-max/)
    assert.match(desktop, /\[data-orb-workspace-panel\][\s\S]*max-width:\s*var\(--orb-desktop-page-max/)
    assert.match(desktop, /\[data-orb-voice-station-content\]/)
    assert.match(desktop, /\[data-orb-dictate-station\]\[data-orb-dictate-layout='desktop-runtime'\]/)
  })

  it('billing and account modals fit viewport with internal scroll on desktop', () => {
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')

    assert.match(desktop, /\[data-orb-billing-modal\][\s\S]*max-height/)
    assert.match(desktop, /\[data-orb-billing-modal\] \[data-orb-billing-cta-bar\][\s\S]*position:\s*static/)
    assert.match(billing, /data-orb-billing-sticky-footer/)
    assert.match(desktop, /\[data-orb-account-modal\][\s\S]*max-height/)
    assert.match(account, /data-orb-account-modal/)
    assert.match(billing, /data-orb-billing-modal/)
    assert.match(billing, /data-orb-billing-cta-bar/)
  })

  it('mobile layout rules do not use desktop-only max-width tokens', () => {
    const mobile = read('app/orb/_legacy-ui-archive/orb-mobile.css')

    assert.doesNotMatch(mobile, /--orb-desktop-page-max/)
    assert.doesNotMatch(mobile, /desktop calm shell/)
  })

  it('saved outputs empty state avoids desktop split admin table', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(saved, /data-orb-saved-outputs-empty/)
    assert.match(desktop, /\[data-orb-saved-outputs-empty='true'\][\s\S]*saved-output-detail/)
  })
})
