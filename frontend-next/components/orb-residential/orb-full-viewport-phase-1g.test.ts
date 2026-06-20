import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_V2_STATUS_COPY
} from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_RESIDENTIAL_LOCKED_THEME, ORB_RESIDENTIAL_THEME_LOCK_COPY } from '../../lib/orb/orb-appearance.ts'
import { ORB_NAV_RECORDS, ORB_RECORDS_PANEL_SUBTITLE } from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential full viewport workspace (consolidated shell)', () => {
  it('residential shell stylesheet is wired into orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-full-viewport-phase-1g\.css/)
    assert.match(css, /--orb-sidebar-width:\s*17\.5rem/)
    assert.match(css, /\.orb-app-shell/)
  })

  it('signed-in shell uses canonical app shell classes', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const shell = read('components/orb/orb-layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(shell, /orb-app-shell__grid/)
    assert.match(shell, /orb-main/)
    assert.match(shell, /orb-sidebar/)
    assert.match(shell, /17\.5rem/)
  })

  it('login uses full viewport landing layout', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(login, /orb-login-shell/)
    assert.match(login, /orb-login-shell__grid/)
    assert.match(login, /lg:grid-cols-\[58%_42%\]/)
    assert.match(hero, /orb-login-shell__brand/)
    assert.doesNotMatch(login, /max-w-\[88rem\]/)
  })

  it('home uses workspace grid with rail and starters', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-workspace--home/)
    assert.match(companion, /data-orb-workspace-home-grid/)
    assert.match(companion, /data-orb-workspace-home-main/)
    assert.doesNotMatch(companion, /data-orb-workspace-home-rail/)
    assert.doesNotMatch(companion, /data-orb-workspace-starters/)
  })

  it('chat uses readable column inner width', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-chat-column/)
    assert.match(companion, /orb-chat-column-inner/)
    assert.match(companion, /orb-composer-dock/)
  })

  it('dictate uses workspace layout', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(workspace, /orb-workspace--dictate/)
    assert.match(workspace, /data-orb-workspace-dictate/)
    assert.match(css, /\.orb-workspace--dictate/)
  })

  it('voice has status card and workspace class', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(voice, /orb-workspace--voice/)
    assert.match(voice, /data-orb-voice-status-card/)
    assert.match(ORB_VOICE_V2_STATUS_COPY, /reflect before you write/)
  })

  it('write uses editor workspace', () => {
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(write, /orb-workspace--write/)
    assert.match(write, /data-orb-workspace-write/)
  })

  it('records uses workspace empty state', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /orb-workspace--records/)
    assert.match(panel, /ORB_RECORDS_PANEL_SUBTITLE/)
    assert.match(ORB_RECORDS_PANEL_SUBTITLE, /adult review/)
    assert.match(panel, /data-orb-saved-open-guided-demo/)
  })

  it('modals use shared product modal class', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(help, /orb-modal/)
    assert.match(settings, /orb-modal/)
    assert.match(billing, /orb-modal/)
  })

  it('nav unchanged and billing included items aligned', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.doesNotMatch(billing, /'Saved outputs'/)
    assert.equal(ORB_NAV_RECORDS, 'Records & Drafts')
  })

  it('theme lock remains active', () => {
    assert.equal(ORB_RESIDENTIAL_LOCKED_THEME, 'light')
    assert.match(ORB_RESIDENTIAL_THEME_LOCK_COPY, /fixed light/)
  })
})
