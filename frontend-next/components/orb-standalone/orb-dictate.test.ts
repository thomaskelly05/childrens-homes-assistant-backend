import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  noteTypeForVoiceCommand,
  parseOrbDictateVoiceCommand
} from '../../lib/orb/dictate/orb-dictate-voice-commands.ts'
import { REFLECTIVE_DEBRIEF_QUESTIONS } from '../../lib/orb/dictate/orb-dictate-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate', () => {
  it('voice commands map to actions', () => {
    const cmd = parseOrbDictateVoiceCommand('Turn this into an incident record')
    assert.ok(cmd)
    assert.equal(cmd!.action, 'convert_incident')
    assert.equal(noteTypeForVoiceCommand('convert_incident'), 'incident_record')
  })

  it('reflective debrief has nine questions', () => {
    assert.equal(REFLECTIVE_DEBRIEF_QUESTIONS.length, 9)
  })

  it('station uses OrbAppModal not drawer', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /OrbAppModal/)
    assert.match(station, /data-orb-dictate-station/)
    assert.match(station, /data-orb-dictate-record-start/)
    assert.doesNotMatch(station, /layout="drawer"/)
  })

  it('record does not auto-start', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.doesNotMatch(station, /useEffect\(\(\) => \{[^}]*handleStartRecording/s)
  })

  it('consent shown for debrief mode', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /data-orb-dictate-consent/)
    assert.match(station, /record_debrief/)
  })

  it('sidebar and composer include orb_dictate', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const plus = readComponent('components/orb-standalone/orb-composer-plus-menu.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(sidebar, /orb_dictate/)
    assert.match(plus, /orb_dictate/)
    assert.match(companion, /OrbDictateStation/)
  })

  it('generate calls API with fallback', () => {
    const client = readComponent('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(client, /DICTATE_BASE \+ '\/generate'/)
    assert.match(client, /buildLocalDictateFallback/)
  })

  it('ORB Voice links to dictate', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-to-dictate/)
    assert.match(voice, /onOpenDictate/)
  })
})
