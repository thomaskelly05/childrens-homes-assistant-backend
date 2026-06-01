import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  anonymiseText,
  parseIntroductionLine,
  suggestParticipantsFromText
} from '../../lib/orb/dictate/orb-dictate-speaker.ts'
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

  it('deep link opens dictate via station=orb_dictate or dictate alias', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /stationParam === 'dictate'/)
    assert.match(companion, /orb_dictate/)
  })

  it('audio upload UI calls multipart route', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const extras = readComponent('components/orb-standalone/orb-dictate-station-extras.tsx')
    const client = readComponent('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(extras, /data-orb-dictate-upload/)
    assert.match(station, /transcribeOrbDictateAudio/)
    assert.match(client, /transcribe\/audio/)
    assert.match(client, /FormData/)
  })

  it('speaker participant UI renders', () => {
    const extras = readComponent('components/orb-standalone/orb-dictate-station-extras.tsx')
    assert.match(extras, /data-orb-dictate-participants/)
    assert.match(extras, /data-orb-dictate-add-participant/)
  })

  it('rename Speaker 1 and segment assign controls exist', () => {
    const extras = readComponent('components/orb-standalone/orb-dictate-station-extras.tsx')
    assert.match(extras, /data-orb-dictate-rename-speaker-1/)
    assert.match(extras, /data-orb-dictate-segment-speaker/)
  })

  it('team meeting mode shows consent confirmation', () => {
    const extras = readComponent('components/orb-standalone/orb-dictate-station-extras.tsx')
    assert.match(extras, /data-orb-dictate-consent/)
    assert.match(extras, /MODE_REQUIRES_CONSENT/)
  })

  it('investigation mode shows investigation boundary confirmation', () => {
    const extras = readComponent('components/orb-standalone/orb-dictate-station-extras.tsx')
    assert.match(extras, /data-orb-dictate-investigation-boundary/)
  })

  it('generate blocked without consent for meeting modes', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /consentReadyForGenerate/)
    assert.match(station, /Complete consent/)
  })

  it('ORB Voice transcript import appears', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /readLatestOrbVoiceTurns/)
    assert.match(station, /voiceTurnsToSegments/)
  })

  it('speaker-aware actions render', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /data-orb-dictate-speaker-actions/)
    assert.match(station, /data-orb-dictate-action-anonymise/)
  })

  it('anonymise replaces names with roles', () => {
    const text = anonymiseText('Tom Kelly confirmed the plan. Sarah Jones agreed.', [
      { id: 'p1', name: 'Tom Kelly', role: 'Registered Manager' },
      { id: 'p2', name: 'Sarah Jones', role: 'Deputy Manager' }
    ])
    assert.match(text, /Registered Manager/)
    assert.doesNotMatch(text, /Tom Kelly/)
  })

  it('introduction parsing suggests participants', () => {
    const parsed = parseIntroductionLine('Tom Kelly, Registered Manager, speaking.')
    assert.ok(parsed)
    const suggested = suggestParticipantsFromText('Tom Kelly, Registered Manager, speaking.')
    assert.equal(suggested.length, 1)
  })

  it('copy save export still work', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /data-orb-dictate-copy/)
    assert.match(station, /data-orb-dictate-save/)
    assert.match(station, /data-orb-dictate-export-pdf/)
  })

  it('sidebar and composer include orb_dictate', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const plus = readComponent('components/orb-standalone/orb-composer-plus-menu.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(sidebar, /orb_dictate/)
    assert.match(plus, /orb_dictate/)
    assert.match(companion, /OrbDictateStation/)
  })

  it('ORB Voice links to dictate', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-to-dictate/)
    assert.match(voice, /onOpenDictate/)
  })

  it('standalone boundary copy present', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /GOVERNANCE_COPY\.boundary/)
    assert.match(station, /GOVERNANCE_COPY\.saveWording/)
  })

  it('studio split screen renders on desktop', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(studio, /data-orb-dictate-studio-split/)
    assert.match(studio, /md:grid-cols-2/)
    assert.match(studio, /data-orb-dictate-studio-mobile-tabs/)
  })

  it('document editor and assistant panel render', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    const assistant = readComponent('components/orb-standalone/orb-dictate-studio-assistant.tsx')
    assert.match(studio, /data-orb-dictate-studio-editor/)
    assert.match(assistant, /data-orb-dictate-studio-assistant/)
    assert.match(assistant, /data-orb-dictate-quick-action/)
  })

  it('therapeutic quick action calls edit endpoint', () => {
    const actions = readFileSync(join(root, 'lib/orb/dictate/orb-dictate-studio-actions.ts'), 'utf8')
    const client = readComponent('lib/orb/dictate/orb-dictate-client.ts')
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(actions, /therapeutic_rewrite/)
    assert.match(client, /editOrbDictateDocument/)
    assert.match(client, /\/edit/)
    assert.match(studio, /editOrbDictateDocument/)
  })

  it('proposed changes require apply', () => {
    const assistant = readComponent('components/orb-standalone/orb-dictate-studio-assistant.tsx')
    assert.match(assistant, /data-orb-dictate-apply-edit/)
    assert.match(assistant, /data-orb-dictate-edit-preview/)
  })

  it('autosave status and local fallback', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    const drafts = readComponent('lib/orb/dictate/orb-dictate-drafts.ts')
    assert.match(studio, /data-orb-dictate-autosave-status/)
    assert.match(drafts, /orb-dictate-drafts/)
  })

  it('quality panel renders checks', () => {
    const quality = readComponent('components/orb-standalone/orb-dictate-studio-quality.tsx')
    assert.match(quality, /data-orb-dictate-studio-quality/)
    assert.match(quality, /child_voice/)
  })

  it('station opens studio after generate', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /OrbDictateStudio/)
    assert.match(station, /setPhase\('studio'\)/)
    assert.match(station, /xlarge/)
  })

  it('ORB Voice can open dictate studio', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-to-dictate-studio/)
  })

  it('anonymise action available in studio', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(studio, /data-orb-dictate-action-anonymise/)
  })
})
