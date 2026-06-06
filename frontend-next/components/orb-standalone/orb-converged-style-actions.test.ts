import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB converged style and comparison actions', () => {
  it('registry includes style spellcheck and comparison actions', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    const ids = [
      'check_spelling_grammar',
      'check_names_dates_times',
      'apply_therapeutic_style',
      'apply_child_centred_style',
      'apply_concise_professional_style',
      'apply_inspection_ready_style',
      'compare_documents',
      'summarise_recent_changes',
      'create_easy_read_briefing',
      'create_staff_briefing',
      'create_action_plan_from_comparison'
    ]
    for (const id of ids) {
      assert.match(registry, new RegExp(`id: '${id}'`))
    }
  })

  it('write panel groups include spelling and style sections', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    assert.match(registry, /key: 'spelling'/)
    assert.match(registry, /key: 'style'/)
  })

  it('no duplicate hardcoded action lists in write ai actions', () => {
    const actions = read('lib/orb/write/orb-write-ai-actions.ts')
    assert.match(actions, /convergedWriteActionsForPanel/)
    assert.match(actions, /ORB_CONVERGED_WRITE_ACTIONS/)
  })

  it('no internal brain metadata exposed in comparison output', () => {
    const lib = read('lib/orb/document-comparison.ts')
    assert.doesNotMatch(lib, /brain_metadata/)
  })

  it('no new AI brain created in comparison module', () => {
    const lib = read('lib/orb/document-comparison.ts')
    assert.match(lib, /governed/)
    assert.doesNotMatch(lib, /createBrain/i)
  })
})
