import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB existing intelligence convergence', () => {
  it('shared converged action registry exists with write, chat, dictate and document entries', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    assert.match(registry, /ORB_CONVERGED_WRITE_ACTIONS/)
    assert.match(registry, /ORB_CONVERGED_CHAT_STARTER_ACTIONS/)
    assert.match(registry, /ORB_CONVERGED_DICTATE_OUTPUTS/)
    assert.match(registry, /ORB_CONVERGED_DOCUMENT_LENSES/)
    assert.match(registry, /convergedActionsForSurface/)
  })

  it('reuses IndiCare Intelligence Core without exposing brain metadata in surfaces', () => {
    const core = read('lib/orb/indicare-intelligence-core.ts')
    const assistant = read('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(core, /extractIndicareIntelligenceCore/)
    assert.doesNotMatch(assistant, /brain_metadata/)
  })

  it('reuses existing handoff modules via converged handoff helper', () => {
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(handoff, /handoffTextToOrbWrite/)
    assert.match(handoff, /saveOrbWriteHandoff/)
    assert.match(handoff, /saveOrbWriteTemplateHandoff/)
    assert.match(handoff, /handoffSavedOutputToOrbWrite/)
  })

  it('does not add child profile selector to standalone ORB shell', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /childProfileSelector/)
  })

  it('deprecated practice panels remain behind compatibility redirects', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbConvergedPanelRedirect/)
    assert.match(read('components/orb-standalone/orb-practice-panels.tsx'), /Deprecated from primary nav/)
  })
})
