import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate converged outputs', () => {
  it('hero output types align with converged registry', () => {
    const hero = read('lib/orb/dictate/orb-dictate-hero-output-types.ts')
    const registry = read('lib/orb/orb-converged-actions.ts')
    assert.match(hero, /convergedDictateHeroNoteTypes/)
    assert.match(registry, /ORB_CONVERGED_DICTATE_OUTPUTS/)
    for (const noteType of [
      'daily_record',
      'incident_record',
      'missing_episode_note',
      'safeguarding_concern_record',
      'chronology_entry',
      'handover_note',
      'manager_oversight_note',
      'action_plan'
    ]) {
      assert.match(hero, new RegExp(noteType))
      assert.match(registry, new RegExp(noteType))
    }
  })

  it('includes required residential output buttons', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    for (const required of [
      'Daily Record',
      'Incident Report',
      'Missing From Home',
      'Safeguarding Concern',
      'Chronology Entry',
      'Handover',
      'Manager Summary',
      'Action Plan'
    ]) {
      assert.match(registry, new RegExp(required))
    }
  })

  it('suggested outputs still use recording framework', () => {
    const outputs = read('components/orb/dictate/OrbDictateSuggestedOutputs.tsx')
    assert.match(outputs, /suggestedOutputsForRecordType/)
    assert.match(outputs, /resolveOrbRecordingRecordType/)
  })

  it('dictate station retains Open in ORB Write handoff', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /saveOrbWriteHandoff/)
  })
})
