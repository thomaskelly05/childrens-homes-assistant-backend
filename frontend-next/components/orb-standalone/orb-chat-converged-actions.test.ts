import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB chat converged actions', () => {
  it('chat starters come from converged registry via residential copy', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    const copy = read('lib/orb/orb-residential-copy.ts')
    const navigation = read('lib/orb/orb-navigation-convergence.ts')
    assert.match(copy, /convergedChatStarters/)
    assert.match(registry, /starter_handover/)
    assert.match(registry, /starter_recent_changes/)
    assert.match(registry, /starter_easy_read_briefing/)
    assert.match(navigation, /Summarise recent changes/)
    assert.match(navigation, /Turn policy into easy-read briefing/)
  })

  it('assistant message actions use existing helpers', () => {
    const actions = read('components/orb-standalone/orb-assistant-message.tsx')
    for (const attr of [
      'copy',
      'regenerate',
      'speak',
      'save',
      'open-in-orb-write',
      'use-as-template',
      'export'
    ]) {
      assert.match(actions, new RegExp(`dataAttr="${attr}"`))
    }
    assert.match(actions, /data-orb-action-more-menu/)
  })
})
