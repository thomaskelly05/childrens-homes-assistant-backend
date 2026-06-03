import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential composer and shell cleanup', () => {
  it('residential composer does not render agent selector or footer', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /compactResidential \?/)
    assert.doesNotMatch(composer, /compactResidential && onAgentSelectorClick/)
    assert.doesNotMatch(composer, /orb-composer-agent-pill/)
    assert.match(composer, /!compactResidential \?[\s\S]*data-orb-composer-agent-selector/)
    assert.match(composer, /!compactResidential \?\s*\(\s*<OrbFooter/)
  })

  it('residential companion passes mode selector only for non-residential', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /onAgentSelectorClick=\{residentialSurface \? undefined/)
    assert.match(companion, /data-orb-composer="main"/)
  })

  it('canonical residential root is OrbShell only', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const themeLock = readComponent('components/orb-residential/use-orb-residential-theme-lock.ts')
    assert.match(shell, /ORB_SHELL_ROOT_CLASS/)
    assert.match(shell, /data-orb-shell="true"/)
    assert.match(companion, /orb-chat-layout--residential/)
    assert.doesNotMatch(companion, /orb-chat-layout--residential orb-residential-root/)
    assert.doesNotMatch(themeLock, /orb-residential-root/)
  })

  it('UI audit reports composer agent selector and residential root counts', () => {
    const audit = readComponent('components/orb-standalone/orb-ui-audit.ts')
    assert.match(audit, /composerAgentSelectorCount/)
    assert.match(audit, /visibleComposerAgentSelectorCount/)
    assert.match(audit, /residentialRootCount/)
    assert.match(audit, /footerText/)
    assert.match(audit, /voiceStartHitTest/)
  })

  it('Voice workspace exposes one primary Start control', () => {
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(actions, /data-orb-voice-primary-action=\{isStartVoice \? 'start'/)
    assert.match(actions, /onClick=\{handlePrimary\}/)
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /OrbVoiceActions/)
  })

  it('premium tokens use residential launch lock over legacy light selectors', () => {
    const premium = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(premium, /ORB Residential launch lock/)
    assert.match(premium, /\[data-orb-shell='true'\]\[data-orb-residential='true'\]/)
    assert.match(premium, /\.orb-chat-layout--residential\.orb-theme-light[\s\S]*--orb-premium-bg-deep:\s*#05070d/)
    assert.doesNotMatch(
      premium,
      /html\[data-orb-residential='1'\]:not\(:has\(\.orb-theme-light\)\)\s*\{/
    )
  })
})
