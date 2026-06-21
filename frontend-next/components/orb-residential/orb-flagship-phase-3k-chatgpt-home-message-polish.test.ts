import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  capResidentialFollowUps,
  contextualResidentialCalmFollowUps,
  RESIDENTIAL_MAX_FOLLOW_UP_CHIPS
} from '../../lib/orb/orb-residential-active-chat-follow-ups.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3K ChatGPT home and message polish', () => {
  it('build version marker is phase-5f-voice-v2-microphone-transition', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5f-voice-v2-microphone-transition')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-residential-shell-v2|orb-mobile\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('empty home state renders centred home and welcome region', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /data-orb-home-empty/)
    assert.match(companion, /data-orb-home-centre-stack/)
    assert.match(companion, /justify-center/)
    assert.match(css, /\[data-orb-home-empty='true'\] \.orb-main/)
    assert.match(css, /justify-content: center/)
  })

  it('composer has controlled max-width aligned to chat column', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /--orb-composer-dock-max: min\(47\.5rem/)
    assert.match(css, /--orb-res-chat-column-max: 47\.5rem/)
    assert.match(css, /max-width: var\(--orb-composer-dock-max\)/)
  })

  it('active chat uses a controlled conversation column', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /\[data-orb-residential-calm-chat='true'\] \.orb-chat-column-inner/)
    assert.match(css, /max-width: var\(--orb-res-chat-column-max\)/)
    assert.match(read('components/orb-standalone/orb-care-companion.tsx'), /data-orb-residential-calm-chat/)
  })

  it('user message bubble sizes to content and aligns right', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /data-orb-user-message-bubble/)
    assert.match(companion, /w-fit/)
    assert.match(companion, /max-w-\[76%\]/)
    assert.match(css, /\[data-orb-user-message-bubble\]/)
    assert.match(css, /width: fit-content/)
    assert.match(css, /justify-content: flex-end/)
  })

  it('assistant response keeps at most three follow-up chips', () => {
    assert.equal(RESIDENTIAL_MAX_FOLLOW_UP_CHIPS, 3)
    const chips = contextualResidentialCalmFollowUps({ messageHint: 'daily record for shift' })
    assert.equal(chips.length, 3)
    assert.ok(chips.some((chip) => chip.label === 'Create daily record'))
    assert.equal(
      capResidentialFollowUps([
        { action: 'what_missing', label: 'One' },
        { action: 'more_concise', label: 'Two' },
        { action: 'recording_wording', label: 'Three' },
        { action: 'child_voice', label: 'Four' }
      ]).length,
      3
    )
  })

  it('quiet message action row is visible under assistant response', () => {
    const assistant = read('components/orb-standalone/orb-assistant-message.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(assistant, /residentialQuietMode/)
    assert.match(assistant, /data-orb-response-action-bar-quiet/)
    assert.doesNotMatch(assistant, /residentialSurface && !isOrbDeveloperMode\(\)\) \{\s*return null/s)
    assert.match(css, /\[data-orb-response-action-bar-quiet\]/)
    assert.match(read('components/orb-standalone/orb-care-companion.tsx'), /OrbResponseActionBar/)
  })

  it('developer and debug controls stay hidden by default', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const assistant = read('components/orb-standalone/orb-assistant-message.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(companion, /!residentialSurface \|\| isOrbDeveloperMode\(\)/)
    assert.match(assistant, /!residentialCalmChat/)
    assert.match(css, /data-orb-response-support-panel/)
    assert.match(css, /data-orb-explainability/)
    assert.doesNotMatch(css, /data-orb-response-action-bar\],\s*\n\[data-orb-residential-calm-chat='true'\] \[data-orb-message-feedback\]/)
  })

  it('Run Deep Research and Response support do not appear by default', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /Run Deep Research/)
    assert.match(companion, /!residentialSurface \|\| isOrbDeveloperMode\(\)/)
    assert.doesNotMatch(read('components/orb-standalone/orb-assistant-message.tsx'), /Response support/)
  })

  it('composer remains visible in active chat and welcome hides after first message', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /composer=\{activeWorkspacePanel \? null : composer\}/)
    assert.match(companion, /data-orb-chat-active/)
    assert.match(companion, /showEmptyState \?/)
    assert.match(read('app/orb/orb-residential-shell.css'), /\[data-orb-chat-active='true'\] \.orb-workspace-hero/)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-home-shell|orb-chat-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5f-voice-v2-microphone-transition/)
  })
})
