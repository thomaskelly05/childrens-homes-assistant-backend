import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB therapeutic template writing', () => {
  it('therapeutic writing supplement covers core templates', () => {
    const tw = read('lib/orb/recording/orb-therapeutic-writing.ts')
    const core = [
      'general_dictation',
      'daily_record',
      'incident_report',
      'handover',
      'behaviour_reflection',
      'supervision_preparation',
      'action_plan',
      'missing_from_home_record',
      'safeguarding_concern',
      'physical_intervention',
      'key_work_session',
      'manager_summary',
      'chronology_entry',
      'handover',
      'reg_44_evidence_summary',
      'reg_45_reflection',
      'policy_change_summary'
    ]
    for (const id of core) {
      assert.match(tw, new RegExp(id))
    }
  })

  it('framework merges therapeutic writing at load', () => {
    const framework = read('lib/orb/recording/orb-recording-framework.ts')
    assert.match(framework, /mergeTherapeuticWriting/)
    assert.match(framework, /writing_framework/)
  })

  it('template cards expose therapeutic prompts and writing style chips', () => {
    const cards = read('components/orb/recording/OrbRecordingLibraryCards.tsx')
    assert.match(cards, /data-orb-template-therapeutic-prompts/)
    assert.match(cards, /data-orb-template-writing-styles/)
    assert.match(cards, /ORB will help you write this in a/)
  })

  it('templates expose writing style prompts module', () => {
    const styles = read('lib/orb/recording/orb-template-writing-styles.ts')
    assert.match(styles, /Child-centred/)
    assert.match(styles, /Therapeutic/)
    assert.match(styles, /ORB_SPELLING_GRAMMAR_REMINDER/)
  })

  it('templates expose spelling grammar reminder on cards', () => {
    const cards = read('components/orb/recording/OrbRecordingLibraryCards.tsx')
    assert.match(cards, /data-orb-template-spelling-reminder/)
  })

  it('therapeutic prompts include person-centred questions', () => {
    const tw = read('lib/orb/recording/orb-therapeutic-writing.ts')
    assert.match(tw, /What did the child say, do or show/)
    assert.match(tw, /trauma_informed/)
    assert.match(tw, /what_to_avoid/)
  })
})
