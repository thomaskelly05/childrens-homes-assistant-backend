import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildResidentialGuidedChatFallback,
  detectResidentialChatSupportType
} from '../../lib/orb/orb-residential-chat-response-guide.ts'
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

describe('ORB Residential Phase 3J active chat calm', () => {
  it('build version marker is phase-4h-voice-fresh-low-latency', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4h-voice-fresh-low-latency')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('active chat hides internal agent and debug controls by default', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const assistant = read('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(companion, /contextualResidentialCalmFollowUps/)
    assert.match(companion, /Run Deep Research/)
    assert.match(companion, /!residentialSurface \|\| isOrbDeveloperMode\(\)/)
    assert.match(assistant, /residentialQuietMode/)
    assert.match(assistant, /residentialCalmChat/)
    assert.doesNotMatch(companion, /Run offset research agent/)
  })

  it('active chat shows at most three calm follow-up chips', () => {
    assert.equal(RESIDENTIAL_MAX_FOLLOW_UP_CHIPS, 3)
    const defaultChips = contextualResidentialCalmFollowUps({ messageHint: 'Help me think this through' })
    assert.equal(defaultChips.length, 3)
    assert.ok(defaultChips.some((chip) => chip.label === 'Turn this into a record'))
    assert.ok(defaultChips.some((chip) => chip.label === 'What may be missing?'))
    assert.ok(defaultChips.some((chip) => chip.label === 'Make this more concise'))

    const safeguardingChips = contextualResidentialCalmFollowUps({
      messageHint: 'safeguarding concern after a disclosure',
      mode: 'Safeguarding'
    })
    assert.equal(safeguardingChips.length, 3)
    assert.ok(safeguardingChips.some((chip) => chip.label === 'Manager oversight'))

    const capped = capResidentialFollowUps([
      { action: 'what_missing', label: 'One' },
      { action: 'more_concise', label: 'Two' },
      { action: 'recording_wording', label: 'Three' },
      { action: 'child_voice', label: 'Four' }
    ])
    assert.equal(capped.length, 3)
  })

  it('does not expose Response support or Why ORB answered this way in calm chat', () => {
    const assistant = read('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /!residentialCalmChat/)
    assert.match(read('app/orb/orb-residential-shell.css'), /data-orb-residential-calm-chat='true'/)
    assert.match(read('app/orb/orb-residential-shell.css'), /data-orb-response-support-panel/)
  })

  it('safeguarding guided responses keep boundaries and focused questions', () => {
    assert.equal(
      detectResidentialChatSupportType('safeguarding concern after disclosure', 'Safeguarding'),
      'safeguarding_concern'
    )
    const fallback = buildResidentialGuidedChatFallback(
      'I need help with a safeguarding concern after a disclosure',
      'Safeguarding'
    )
    assert.match(fallback, /immediate safety and local safeguarding procedures/i)
    assert.match(fallback, /What happened/)
    assert.match(fallback, /child say, show or communicate/i)
    assert.match(fallback, /factual, child-centred record|adult review/i)
  })

  it('composer remains available and welcome hides after first message', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /composer=\{activeWorkspacePanel \? null : composer\}/)
    assert.match(companion, /data-orb-chat-active/)
    assert.match(companion, /showEmptyState \?/)
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /!residentialSurface/)
  })

  it('single shell without duplicate layouts', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-home-shell|orb-chat-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-4h-voice-fresh-low-latency/)
  })
})
