import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile refinement pass', () => {
  it('mobile home does not duplicate intro copy', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /data-orb-empty-heading-mobile/)
    assert.match(companion, /data-orb-empty-subline-mobile/)
    assert.match(companion, /residentialSurface && !isMobileViewport/)
    assert.match(companion, /ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING/)
    assert.match(companion, /isMobileViewport \? \(/)
    assert.match(companion, /\{ORB_RESIDENTIAL_MOBILE_EMPTY_SUBLINE\}/)
    assert.match(companion, /residentialSurface && !isMobileViewport \? \(/)
    assert.match(css, /\[data-orb-empty-subline-desktop\]/)
  })

  it('mobile home composer is present and not hidden', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /data-orb-composer-safe-area/)
    assert.match(companion, /orb-mobile-composer-dock/)
    assert.match(companion, /data-orb-home-mobile-compact/)
    assert.match(css, /\[data-orb-composer-safe-area='true'\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('mobile home quick actions use compact two-by-two grid', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /data-orb-home-quick-actions-mobile/)
    assert.match(companion, /grid-cols-2/)
    assert.match(css, /\[data-orb-home-quick-actions-mobile='true'\]/)
    assert.match(css, /grid-template-columns:\s*repeat\(2/)
  })

  it('ORB Write has no horizontal overflow and stacks controls on mobile', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(write, /data-orb-write-mobile-layout/)
    assert.match(write, /data-orb-write-mobile-controls/)
    assert.match(write, /data-orb-write-record-type-row/)
    assert.match(css, /\[data-orb-write-mobile-controls='stacked'\]/)
    assert.match(css, /overflow-x:\s*hidden/)
  })

  it('Voice card uses compact mobile layout', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(voice, /data-orb-voice-mobile-action-dock/)
    assert.match(voice, /safe-area-inset-bottom/)
    assert.match(css, /\[data-orb-voice-mobile-action-dock\]/)
    assert.match(css, /min-height:\s*clamp\(10rem,\s*28vh,\s*14rem\)/)
  })

  it('Records uses list to detail mobile flow with legacy handling', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const actions = read('components/orb-standalone/orb-saved-output-detail-actions.tsx')
    const local = read('lib/orb/orb-saved-outputs-local.ts')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(saved, /recordsMobileListMode/)
    assert.match(saved, /recordsMobileDetailMode/)
    assert.match(saved, /data-orb-records-mobile-back/)
    assert.match(saved, /data-orb-records-legacy-toggle/)
    assert.match(saved, /isLegacyLocalSavedOutput/)
    assert.match(actions, /data-orb-saved-output-open-write/)
    assert.match(actions, /mobileStacked/)
    assert.match(local, /isLegacyLocalSavedOutput/)
    assert.match(css, /\[data-orb-records-mobile-mode='detail'\]/)
  })

  it('Help & Safety has bottom safe-area padding', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(help, /mobileMode="full"/)
    assert.match(css, /\[data-orb-help-panel-scroll\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('Settings has bottom safe-area padding', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(settings, /mobileMode: 'full'/)
    assert.match(css, /\[data-orb-settings-scroll\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('Account menu uses mobile sheet behaviour', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(menu, /useOrbResponsiveMode/)
    assert.match(menu, /data-orb-account-menu-mobile-sheet/)
    assert.match(menu, /data-orb-account-menu-close/)
    assert.match(menu, /data-orb-account-menu-backdrop/)
    assert.match(menu, /safe-area-inset-bottom/)
    assert.match(css, /\.orb-account-menu--mobile-sheet/)
  })

  it('no station renders wider than viewport', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /data-orb-no-horizontal-overflow/)
    assert.match(companion, /data-orb-no-horizontal-overflow/)
    assert.match(css, /max-width:\s*100vw/)
    assert.match(css, /overflow-x:\s*hidden/)
  })

  it('drawer still closes on station selection', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(sidebar, /onClose\?\.\(\)/)
    assert.match(sidebar, /handleVisibleNavClick\(item\.id\)/)
    assert.match(companion, /setSidebarOpen\(false\)/)
  })
})
