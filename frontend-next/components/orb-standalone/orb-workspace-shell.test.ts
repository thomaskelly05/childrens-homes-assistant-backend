import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_CORE_WORKSPACE_PANELS,
  isOrbCoreWorkspacePanel
} from './orb-core-workspace-panels.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB main workspace shell', () => {
  it('core workspace panel list matches product tools', () => {
    assert.deepEqual([...ORB_CORE_WORKSPACE_PANELS].sort(), [
      'documents',
      'inspection_readiness',
      'knowledge',
      'orb_dictate',
      'orb_voice',
      'orb_write',
      'record_properly',
      'review',
      'safeguarding_thinking',
      'saved_outputs',
      'shift_builder',
      'skills',
      'templates'
    ])
    assert.equal(isOrbCoreWorkspacePanel('settings'), false)
    assert.equal(isOrbCoreWorkspacePanel('billing'), false)
    assert.equal(isOrbCoreWorkspacePanel('orb_voice'), true)
  })

  it('residential stations use workspace presentation instead of centred modal', () => {
    const props = readComponent('components/orb-standalone/orb-app-modal.tsx')
    assert.match(props, /layout: 'workspace'/)
    assert.match(props, /presentation: 'workspace'/)
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(voice, /presentation="workspace"/)
    assert.match(dictate, /presentation="workspace"/)
    const documents = readComponent('components/orb-standalone/orb-document-panel.tsx')
    assert.match(documents, /orbStationShellProps\(residentialSurface/)
  })

  it('care companion renders core tools in main thread workspace', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /isOrbCoreWorkspacePanel/)
    assert.match(companion, /activeWorkspacePanel/)
    assert.match(companion, /activeWorkspacePanel \?/)
    assert.match(companion, /renderResidentialCorePanels\(\)/)
    assert.match(companion, /composer=\{activeWorkspacePanel \? null : composer\}/)
    assert.match(companion, /OrbBillingModal/)
    assert.match(companion, /OrbAccountModal/)
    assert.match(companion, /thread=\{[\s\S]*activeWorkspacePanel/)
  })

  it('theme root applies resolved appearance once via orb shell and document', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    assert.match(shell, /useOrbResidentialThemeSync/)
    assert.match(shell, /getOrbThemeCssVariables\(resolvedTheme\)/)
    assert.doesNotMatch(shell, /ORB_RESIDENTIAL_RESOLVED_THEME/)
    const appearance = readComponent('lib/orb/orb-appearance.ts')
    assert.match(appearance, /setAttribute\('data-orb-theme', theme\)/)
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-theme=\{effectiveTheme\}/)
    assert.match(companion, /data-orb-appearance-mode=\{appearanceMode\}/)
  })

  it('voice start falls back to browser push-to-talk when realtime is unavailable', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /voice_start_clicked/)
    assert.match(station, /voice_realtime_fallback_browser/)
    assert.match(station, /handleBrowserVoicePrimary/)
    assert.match(station, /detectSpeechRecognitionSupported/)
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(actions, /data-orb-voice-primary-action/)
  })

  it('workspace frame exposes back navigation and panel markers', () => {
    const frame = readComponent('components/orb-standalone/orb-workspace-frame.tsx')
    assert.match(frame, /data-orb-main-workspace="true"/)
    assert.match(frame, /data-orb-workspace-back/)
    assert.match(frame, /Back to chat/)
  })

  it('premium tokens do not force dark markdown in light mode', () => {
    const premium = readComponent('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    assert.match(premium, /orb-chat-layout--residential\.orb-theme-dark/)
    assert.doesNotMatch(
      premium,
      /\.orb-chat-layout--residential \.orb-markdown-answer p,\nhtml\[data-orb-residential='1'\] \.orb-chat-layout--residential \.orb-markdown-answer li/
    )
  })
})
