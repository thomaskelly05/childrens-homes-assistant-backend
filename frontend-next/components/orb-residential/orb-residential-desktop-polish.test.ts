import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential desktop polish', () => {
  it('desktop sidebar has brand, new chat, search, grouped sections, and pinned account footer', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const layout = readComponent('components/orb/orb-layout.tsx')

    assert.match(sidebar, /data-orb-sidebar-brand/)
    assert.match(sidebar, /data-orb-sidebar-new-chat/)
    assert.match(sidebar, /data-orb-sidebar-search/)
    assert.match(sidebar, /data-orb-sidebar-desktop-nav/)
    assert.match(sidebar, /data-orb-sidebar-section="core"/)
    assert.match(sidebar, /data-orb-sidebar-section="intelligence"/)
    assert.match(sidebar, /data-orb-sidebar-section="workspace"/)
    assert.match(sidebar, /data-orb-sidebar-account-footer/)
    assert.doesNotMatch(sidebar, /data-orb-sidebar-section="profiles"/)
    assert.match(sidebar, /Recent chats/)
    assert.match(layout, /orb-chat-sidebar/)
    assert.match(layout, /lg:static/)
  })

  it('desktop shortcuts cover Dictate, Voice, Documents, Saved Outputs, and intelligence modes', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const copy = readComponent('lib/orb/orb-residential-copy.ts')

    for (const label of [
      'Dictate',
      'Voice',
      'Documents',
      'Saved Outputs',
      'Safeguarding Thinking',
      'Record This Properly'
    ]) {
      assert.match(sidebar, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
    assert.match(sidebar, /Ofsted Lens|Inspection Readiness/)
    assert.match(sidebar, /onSelectMode/)
    assert.match(copy, /ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP = 'What do you need help with\?'/)
  })

  it('empty state, composer, and layout markers exist without OS route coupling', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    const desktopCss = readComponent('app/orb/orb-desktop.css')

    assert.match(companion, /data-orb-empty-heading-desktop/)
    assert.match(companion, /data-orb-residential-empty/)
    assert.match(companion, /orb-composer-dock--empty/)
    assert.match(composer, /data-orb-standalone-composer/)
    assert.match(composer, /data-orb-composer-send/)
    assert.match(desktopCss, /orb-composer-dock--empty/)
    assert.match(desktopCss, /data-orb-empty-heading-desktop/)
    assert.doesNotMatch(companion, /OsSidebar|operational-orb-page/)
  })

  it('right contextual panel slot is structured for future panels', () => {
    const layout = readComponent('components/orb/orb-layout.tsx')
    const theme = readComponent('lib/orb/orb-theme.ts')
    const desktopCss = readComponent('app/orb/orb-desktop.css')

    assert.match(layout, /data-orb-context-panel-slot/)
    assert.match(layout, /orb-context-panel-inner/)
    assert.match(layout, /aria-label="ORB contextual panel"/)
    assert.match(theme, /contextPanelWidth/)
    assert.match(desktopCss, /orb-chat-context-panel/)
  })

  it('residential desktop hides duplicate top header row', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /residentialSurface \? 'hidden' : ''/)
  })

  it('mobile quick nav and viewport guard remain intact', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /useOrbMobileViewport/)
    assert.match(sidebar, /data-orb-sidebar-mobile-quick-nav/)
    assert.match(sidebar, /data-orb-sidebar-magic-notes/)
  })
})
