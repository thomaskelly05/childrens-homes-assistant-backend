import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential final product polish', () => {
  it('viewport lock and composer zone on residential shell', () => {
    const desktop = readComponent('app/orb/_legacy-ui-archive/orb-desktop.css')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(desktop, /height: 100dvh/)
    assert.match(desktop, /\.orb-composer-zone/)
    assert.match(companion, /h-\[100dvh\]/)
    assert.match(composer, /orb-composer-zone/)
  })

  it('sidebar sections persist collapse in localStorage', () => {
    const pref = readComponent('lib/orb/orb-sidebar-section-preference.ts')
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(pref, /orb-sidebar-projects-collapsed/)
    assert.match(pref, /orb-sidebar-recents-collapsed/)
    assert.match(pref, /orb-sidebar-apps-collapsed/)
    assert.match(pref, /orb-sidebar-account-collapsed/)
    assert.match(sidebar, /data-orb-sidebar-section-toggle/)
  })

  it('templates auto-send immediate prompt', () => {
    const fallback = readComponent('lib/orb/orb-templates-fallback.ts')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(fallback, /templateImmediatePrompt/)
    assert.match(fallback, /Safeguarding concern record/)
    assert.match(companion, /onUseTemplate=\{\(prompt\) => \{/)
    assert.match(companion, /void sendMessage\(prompt\)/)
  })

  it('station apps avoid sign-in blocker when session ready', () => {
    const states = readComponent('components/orb-standalone/orb-station-panel-states.tsx')
    const templates = readComponent('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(states, /shouldBlockStationForAuth/)
    assert.match(states, /OrbStationReconnectBanner/)
    assert.match(templates, /sessionReady/)
  })

  it('ORB Voice station and composer plus menu', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const plus = readComponent('components/orb-standalone/orb-composer-plus-menu.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(voice, /data-orb-voice-start/)
    assert.match(voice, /data-orb-voice-station/)
    assert.match(plus, /orb_voice/)
    assert.match(plus, /orb_dictate/)
    assert.match(plus, /use_template/)
    assert.match(companion, /OrbVoiceStation/)
    assert.match(companion, /openOrbVoicePanel/)
    assert.match(companion, /OrbDictateStation/)
  })

  it('premium account modal and project memory editor', () => {
    const account = readComponent('components/orb-standalone/orb-account-modal.tsx')
    const memory = readComponent('components/orb-residential/orb-project-memory-modal.tsx')
    assert.match(account, /data-orb-account-status-chips/)
    assert.match(account, /data-orb-account-voice-settings/)
    assert.match(memory, /data-orb-project-memory-modal/)
  })

  it('composer mic visible on residential', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-mic/)
    assert.match(composer, /Ask anything/)
  })
})
