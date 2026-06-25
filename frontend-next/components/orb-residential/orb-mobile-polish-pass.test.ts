import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile polish pass', () => {
  const css = read('app/orb/orb-residential-shell.css')
  const companion = read('components/orb-standalone/orb-care-companion.tsx')
  const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
  const write = read('components/orb-write/orb-write-standalone-panel.tsx')
  const writeEditor = read('components/orb-write/orb-write-editor.tsx')
  const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
  const toolbar = read('components/orb/premium/orb-premium-toolbar.tsx')
  const help = read('components/orb-standalone/orb-help-panel.tsx')
  const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
  const account = read('components/orb-residential/orb-account-menu.tsx')
  const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
  const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
  const voice = read('components/orb-standalone/orb-voice-station-content.tsx')

  it('mobile home quick actions stay above scrollable centre stack not covered by composer', () => {
    assert.match(companion, /data-orb-home-mobile-station/)
    assert.match(companion, /data-orb-home-quick-actions-mobile/)
    assert.match(css, /\[data-orb-home-mobile-station='true'\] \.orb-chat-thread/)
    assert.match(css, /\[data-orb-home-mobile-station='true'\] \.orb-composer-dock/)
    assert.match(css, /\[data-orb-home-quick-actions-mobile='true'\]/)
  })

  it('mobile composer uses safe-area bottom padding', () => {
    assert.match(companion, /data-orb-composer-safe-area/)
    assert.match(composer, /data-orb-composer-mobile-safe/)
    assert.match(css, /\[data-orb-composer-safe-area='true'\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('no mobile station horizontal overflow', () => {
    assert.match(css, /Mobile polish pass/)
    assert.match(css, /max-width:\s*100vw/)
    assert.match(css, /overflow-x:\s*hidden/)
    assert.match(companion, /data-orb-no-horizontal-overflow/)
  })

  it('Voice card has compact mobile height', () => {
    assert.match(voice, /data-orb-voice-mobile-action-dock/)
    assert.match(css, /min-height:\s*clamp\(8\.5rem,\s*24vh,\s*12rem\)/)
    assert.match(css, /min-height:\s*clamp\(10rem,\s*28vh,\s*15rem\)/)
  })

  it('ORB Write does not clip title or controls', () => {
    assert.match(write, /data-orb-write-mobile-controls/)
    assert.match(css, /\[data-orb-write-mobile-controls='stacked'\] \[data-orb-write-title-input\]/)
    assert.match(css, /overflow-wrap:\s*anywhere/)
    assert.match(css, /word-break:\s*break-word/)
  })

  it('ORB Write hides duplicate record type on mobile when header controls exist', () => {
    assert.match(write, /suppressRecordTypeBadge=\{isMobile\}/)
    assert.match(writeEditor, /suppressRecordTypeBadge/)
    assert.match(write, /data-orb-write-record-type-suppressed/)
    assert.match(css, /\[data-orb-write-record-type-suppressed='true'\]/)
  })

  it('ORB Write review panel is collapsible on mobile', () => {
    assert.match(write, /data-orb-write-review-collapsible/)
    assert.match(css, /\[data-orb-write-review-collapsible\]/)
  })

  it('Records search icon does not overlap placeholder text', () => {
    assert.match(toolbar, /data-orb-premium-search-wrap/)
    assert.match(toolbar, /orb-premium-search-input/)
    assert.match(toolbar, /pl-11/)
    assert.match(css, /\[data-orb-premium-search-wrap\]/)
    assert.match(css, /padding-left:\s*2\.75rem/)
  })

  it('Records loading state is deliberate centred not buried in whitespace', () => {
    assert.match(saved, /data-orb-records-loading/)
    assert.match(css, /\[data-orb-records-loading\]/)
    assert.match(css, /justify-content:\s*center/)
    assert.match(saved, /data-orb-records-mobile-list-first/)
  })

  it('Help & Safety has bottom safe-area padding', () => {
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(help, /data-orb-help-panel-safe-bottom/)
    assert.match(css, /\[data-orb-help-panel-safe-bottom\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('Settings has bottom safe-area padding on mobile stack', () => {
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(settings, /data-orb-settings-mobile-layout/)
    assert.match(css, /\[data-orb-settings-mobile-layout='stack'\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('account bottom sheet remains accessible with tap targets', () => {
    assert.match(account, /data-orb-account-menu-mobile-sheet/)
    assert.match(account, /safe-area-inset-bottom/)
    assert.match(css, /\.orb-account-menu--mobile-sheet/)
    assert.match(css, /min-height:\s*2\.75rem/)
  })

  it('Dictate mobile scroll region reduces empty lower space', () => {
    assert.match(dictate, /data-orb-dictate-mobile-scroll/)
    assert.match(css, /\[data-orb-dictate-mobile-scroll\]/)
    assert.match(css, /\[data-orb-dictate-idle-shell\]/)
  })

  it('drawer behaviour from previous pass still works', () => {
    assert.match(sidebar, /onClose\?\.\(\)/)
    assert.match(sidebar, /handleVisibleNavClick\(item\.id\)/)
    assert.match(companion, /setSidebarOpen\(false\)/)
  })

  it('final native pass removes desktop hero card weight on mobile home', () => {
    assert.match(companion, /data-orb-home-native-hero/)
    assert.match(css, /Final mobile native polish pass/)
    assert.match(css, /\[data-orb-home-native-hero='true'\]/)
    assert.match(css, /background:\s*transparent/)
  })

  it('final native pass anchors home composer to bottom of mobile screen', () => {
    assert.match(css, /\[data-orb-home-mobile-station='true'\] \.orb-composer-dock/)
    assert.match(css, /margin-top:\s*auto/)
  })

  it('ORB Write mobile review is collapsed by default', () => {
    assert.match(write, /mobileReviewOpen, setMobileReviewOpen\] = useState\(false\)/)
    assert.match(write, /setMobileReviewOpen\(false\)/)
  })

  it('ORB Write lower sections have safe-area scroll padding on mobile', () => {
    assert.match(css, /\[data-orb-write-notepad-body\]/)
    assert.match(css, /safe-area-inset-bottom/)
    assert.match(writeEditor, /data-orb-write-notepad-body/)
  })

  it('Records legacy drafts are hidden by default with repair labels available', () => {
    const local = read('lib/orb/orb-saved-outputs-local.ts')
    assert.match(saved, /showLegacyLocal/)
    assert.match(saved, /data-orb-records-legacy-toggle/)
    assert.match(saved, /repairSavedOutputDisplayTitle/)
    assert.match(local, /isLegacyLocalSavedOutput/)
    assert.match(local, /repairSavedOutputDisplayTitle/)
  })

  it('Voice transcript area has bottom safe padding on mobile', () => {
    assert.match(css, /\[data-orb-voice-live-rail-slot\]/)
    assert.match(css, /\[data-orb-voice-mobile-action-dock\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('ORB Write review nested surface avoids card-within-card on mobile', () => {
    assert.match(write, /data-orb-write-review-nested-surface/)
    assert.match(css, /\[data-orb-write-review-nested-surface\]/)
  })
})
