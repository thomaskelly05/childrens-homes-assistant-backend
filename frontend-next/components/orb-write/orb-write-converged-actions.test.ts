import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write converged actions', () => {
  it('write AI actions derive from converged registry', () => {
    const actions = read('lib/orb/write/orb-write-ai-actions.ts')
    const registry = read('lib/orb/orb-converged-actions.ts')
    assert.match(actions, /convergedWriteActionsForPanel/)
    assert.match(actions, /ORB_CONVERGED_WRITE_ACTIONS/)
    assert.match(registry, /convergedWriteActionsForPanel/)
  })

  it('ORB Write panel renders converged action groups', () => {
    const panel = read('components/orb-write/orb-write-ai-panel.tsx')
    const registry = read('lib/orb/orb-converged-actions.ts')
    assert.match(panel, /ORB_CONVERGED_WRITE_PANEL_GROUPS/)
    assert.match(panel, /data-orb-write-ai-action/)
    assert.match(registry, /key: 'core'/)
    assert.match(registry, /key: 'safety'/)
    assert.match(registry, /key: 'create_related'/)
    assert.match(registry, /key: 'export'/)
  })

  it('includes required core, safety and create-related actions', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    for (const required of [
      'What am I missing?',
      'Review this record',
      'Make more professional',
      'Remove blame language',
      'Make child-centred',
      'Improve grammar',
      'Check safeguarding gaps',
      'Check Inspection evidence preparation',
      'Check recording quality',
      'Check child voice',
      'Check manager oversight',
      'Create chronology entry',
      'Create manager summary',
      'Create handover',
      'Create action plan',
      'Prepare PDF'
    ]) {
      assert.match(registry, new RegExp(required))
    }
  })
})
