import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile pilot readiness pass', () => {
  it('drawer closes after station selection from mobile quick nav', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /onClose\?\.\(\)/)
    assert.match(sidebar, /data-orb-sidebar-mobile-quick-nav/)
    assert.match(sidebar, /handleVisibleNavClick\(item\.id\)/)
  })

  it('only one nav item active — home and chat are not cross-highlighted', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(sidebar, /navId === 'home' && activeNavId === 'chat'/)
    assert.doesNotMatch(sidebar, /navId === 'chat' && activeNavId === 'home'/)
    assert.match(companion, /showEmptyState\) return 'home'/)
    assert.match(companion, /activePanel === null\) return 'chat'/)
  })

  it('no horizontal overflow markers and shell constraints', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /data-orb-no-horizontal-overflow/)
    assert.match(companion, /data-orb-no-horizontal-overflow/)
    assert.match(css, /max-width:\s*100vw/)
    assert.match(css, /overflow-x:\s*hidden/)
  })

  it('mobile drawer uses min(90vw, 360px) width and open-state attribute', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /min\(90vw,360px\)/)
    assert.match(layout, /data-orb-sidebar-drawer-open/)
    assert.match(layout, /data-orb-mobile-drawer-backdrop/)
    assert.match(css, /min\(90vw,\s*360px\)/)
    assert.match(css, /data-orb-sidebar-drawer-open='true'/)
    assert.doesNotMatch(css, /data-orb-sidebar-state='expanded'\][\s\S]*transform:\s*translateX\(0\)/)
  })

  it('drawer backdrop, escape, and body scroll lock', () => {
    const layout = read('components/orb/orb-layout.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(layout, /event\.key === 'Escape'/)
    assert.match(layout, /document\.body\.style\.overflow = 'hidden'/)
    assert.match(sidebar, /data-orb-mobile-drawer-close/)
  })

  it('Records mobile list/detail mode with back navigation', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(saved, /recordsMobileListMode/)
    assert.match(saved, /recordsMobileDetailMode/)
    assert.match(saved, /data-orb-records-mobile-mode/)
    assert.match(saved, /data-orb-records-mobile-back/)
    assert.match(css, /data-orb-records-mobile-mode/)
  })

  it('Help & Safety mobile sheet scrolls full-screen', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(help, /mobileMode="full"/)
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(css, /data-orb-help-panel-scroll/)
  })

  it('Settings mobile sheet scrolls full-screen', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(settings, /mobileMode: 'full'/)
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(css, /data-orb-settings-scroll/)
  })

  it('Chat composer safe-area padding on mobile', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /data-orb-composer-safe-area/)
    assert.match(companion, /orb-mobile-composer-dock/)
    assert.match(css, /data-orb-composer-safe-area/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('ORB Write opens from mobile drawer without drawer remaining over workspace', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('components/orb/orb-layout.tsx')
    assert.match(companion, /setSidebarOpen\(false\)/)
    assert.match(companion, /openOrbWritePanel/)
    assert.match(layout, /pointer-events-none lg:pointer-events-auto/)
    assert.match(layout, /aria-hidden=\{mobileDrawerOpen/)
  })

  it('login screen has mobile safe-area padding', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(login, /safe-area-inset-top/)
    assert.match(login, /safe-area-inset-bottom/)
    assert.match(css, /\.orb-login-root\.orb-mobile-viewport/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('account/workspace section stays compact and does not push nav off-screen', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(sidebar, /data-orb-sidebar-account-footer/)
    assert.match(sidebar, /title="Account"/)
    assert.match(sidebar, /overscroll-contain/)
    assert.match(css, /orb-sidebar-footer\[data-orb-sidebar-account-footer\]/)
    assert.match(css, /max-height:\s*40dvh/)
  })
})
