import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { buildIntelligenceContextActionChips } from '../../lib/orb/indicare-intelligence-core.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB premium UX polish', () => {
  it('composer copyright component exports line', () => {
    const source = readComponent('components/orb-standalone/orb-composer-copyright.tsx')
    assert.match(source, /data-orb-composer-copyright/)
    assert.match(source, /IndiCare Intelligence/)
  })

  it('general answer chips stay light', () => {
    const chips = buildIntelligenceContextActionChips({
      core: { expert_depth: 'general_light' },
      messageHint: 'What is photosynthesis?',
      content: 'Plants use sunlight…'
    })
    assert.ok(chips.some((c) => c.label === 'Make shorter'))
    assert.ok(!chips.some((c) => c.label.includes('safeguarding lens')))
  })

  it('care depth shows residential actions', () => {
    const chips = buildIntelligenceContextActionChips({
      core: { expert_depth: 'residential_light' },
      messageHint: 'Help me record an incident',
      content: 'A young person was upset…'
    })
    assert.ok(chips.some((c) => c.label === 'Record this properly'))
    assert.ok(chips.some((c) => c.label.includes('Ofsted')))
  })

  it('voice reply panel markers exist', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-reply/)
    assert.match(voice, /displayedOrbReply/)
  })
})
