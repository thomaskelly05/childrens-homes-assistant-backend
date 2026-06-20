import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile sheet refinement pass', () => {
  it('template picker uses mobile bottom sheet with sticky footer and internal scroll', () => {
    const picker = read('components/orb-write/orb-write-template-picker.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(picker, /useOrbResponsiveMode/)
    assert.match(picker, /data-orb-write-template-picker-mobile/)
    assert.match(picker, /data-orb-write-template-picker-footer/)
    assert.match(picker, /data-orb-write-template-picker-body/)
    assert.match(picker, /items-end/)
    assert.match(picker, /safe-area-inset-bottom/)
    assert.match(picker, /overflow-y-auto/)
    assert.match(mobileCss, /\[data-orb-write-template-picker-footer\]/)
    assert.match(mobileCss, /\[data-orb-write-template-picker-mobile='true'\] \[data-orb-write-template-list\]/)
    assert.match(mobileCss, /safe-area-inset-bottom/)
  })

  it('dictate capture panel has title spacing and does not collide with orb', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(dictate, /data-orb-dictate-title-spacing/)
    assert.match(dictate, /data-orb-dictate-header/)
    assert.match(mobileCss, /\[data-orb-dictate-title-spacing\]/)
    assert.match(mobileCss, /\[data-orb-dictate-capture-panel='true'\] \.orb-dictate-mobile-orb-wrap/)
  })

  it('settings appearance mobile detail scrolls without dead space stretch', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(settings, /data-orb-settings-mobile-detail/)
    assert.match(settings, /orb-settings-scroll/)
    assert.match(settings, /min-h-0/)
    assert.match(settings, /flex-1/)
    assert.match(settings, /overflow-y-auto/)
    assert.match(settings, /footer=\{\s*isMobile\s*\? undefined/)
    assert.match(mobileCss, /\[data-orb-settings-mobile-detail='true'\]/)
    assert.match(mobileCss, /flex: 1 1 auto/)
  })

  it('account menu is compact with 44px touch targets', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(menu, /min\(15rem/)
    assert.match(menu, /min\(21rem/)
    assert.match(menu, /min-h-\[2\.75rem\]/)
    assert.match(menu, /overscroll-contain/)
    assert.match(mobileCss, /\.orb-account-menu[\s\S]*min\(15rem/)
    assert.match(mobileCss, /\[data-orb-account-menu-items\] \[role='menuitem'\]/)
  })

  it('saved outputs mobile hides dominant filters behind filter control', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(saved, /useOrbResponsiveMode/)
    assert.match(saved, /data-orb-saved-outputs-filter-toggle/)
    assert.match(saved, /data-orb-saved-outputs-mobile-filters/)
    assert.match(saved, /mobileFiltersOpen/)
    assert.match(saved, /footer=\{isMobile \? undefined/)
    assert.match(saved, /Create in ORB Write/)
    assert.match(saved, /!px-4 !py-6/)
    assert.match(mobileCss, /\[data-orb-saved-outputs-filter-toggle\]/)
    assert.match(mobileCss, /\[data-orb-saved-outputs-mobile-filters\]/)
  })

  it('documents and guidance mobile uses compact action rows not dashboard tabs', () => {
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(documents, /useOrbResponsiveMode/)
    assert.match(documents, /data-orb-documents-mobile-actions/)
    assert.match(documents, /data-orb-documents-mobile-action/)
    assert.match(documents, /Review against record type/)
    assert.match(documents, /Use policies, guidance or uploads/)
    assert.match(documents, /footer=\{\s*isMobile\s*\? undefined/)
    assert.match(mobileCss, /\[data-orb-documents-mobile-actions\]/)
  })

  it('desktop saved outputs and documents behaviour unchanged', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    assert.match(saved, /!isMobile \?/)
    assert.match(saved, /ORB_RECORDS_PANEL_TITLE/)
    assert.match(saved, /ORB_RECORDS_FOOTER/)
    assert.match(documents, /OrbPremiumTabs/)
    assert.match(documents, /Powered by IndiCare Intelligence/)
    assert.match(desktop, /\[data-orb-saved-outputs-panel\]/)
    assert.doesNotMatch(desktop, /data-orb-documents-mobile-actions/)
  })

  it('template picker desktop centred modal branch preserved', () => {
    const picker = read('components/orb-write/orb-write-template-picker.tsx')
    assert.match(picker, /items-center justify-center/)
    assert.match(picker, /max-w-2xl/)
    assert.match(picker, /sm:grid-cols-2/)
  })
})
