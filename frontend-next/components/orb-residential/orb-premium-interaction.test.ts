import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB premium interaction pass', () => {
  it('sidebar collapse contract markers and full icon rail', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const layout = read('components/orb/orb-layout.tsx')
    assert.match(sidebar, /data-orb-sidebar-state/)
    assert.match(sidebar, /data-orb-sidebar-collapse-toggle/)
    assert.match(sidebar, /data-orb-sidebar-icon-rail/)
    assert.match(sidebar, /COLLAPSED_RAIL_MAIN/)
    assert.match(sidebar, /COLLAPSED_RAIL_LIBRARY/)
    assert.match(layout, /data-orb-sidebar-state/)
  })

  it('account menu toggles, closes on action, and exposes sign-out marker', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(menu, /data-orb-account-menu-open/)
    assert.match(menu, /data-orb-account-menu-signout/)
    assert.match(menu, /Escape/)
    assert.match(companion, /setAccountMenuOpen\(\(current\) => !current\)/)
    assert.match(companion, /preferAbove=\{sidebarCollapsed\}/)
  })

  it('sign out tears down product and hard-navigates to /orb', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /handleResidentialSignOut/)
    assert.match(companion, /await logout\(\)/)
    assert.match(companion, /window\.location\.replace\('\/orb'\)/)
    assert.match(companion, /setAccountMenuOpen\(false\)/)
    assert.match(companion, /closePanel\(\)/)
  })

  it('voice companion visual states and markers', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(companion, /data-orb-voice-companion/)
    assert.match(companion, /data-orb-voice-state/)
    assert.match(companion, /data-orb-voice-head/)
    assert.match(companion, /data-orb-voice-face/)
    assert.match(companion, /data-orb-voice-waveform/)
    assert.match(companion, /mapOrbVoiceUiToCompanionState/)
    assert.match(voice, /OrbVoiceCompanion/)
  })

  it('documents viewport uses internal content scroll markers', () => {
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const page = read('components/orb/premium/orb-premium-page.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(documents, /data-orb-documents-header/)
    assert.match(page, /data-orb-documents-content-scroll/)
    assert.match(css, /\[data-orb-documents-content-scroll\]/)
  })

  it('ORB Write document-first layout markers', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(write, /data-orb-write-document-first/)
    assert.match(write, /data-orb-write-source-collapsed/)
    assert.match(write, /data-orb-write-guidance-collapsed/)
    assert.match(write, /const \[sourcePanelOpen, setSourcePanelOpen\] = useState\(false\)/)
    assert.match(write, /const \[guidancePanelOpen, setGuidancePanelOpen\] = useState\(false\)/)
    assert.match(css, /\[data-orb-write-document-first='true'\]/)
  })
})
