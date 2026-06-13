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

  it('station uses workspace shell via OrbAppModal on residential', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const transcript = readComponent('components/orb/dictate/OrbTranscriptPanel.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(station, /OrbAppModal/)
    assert.match(station, /presentation="workspace"/)
    assert.match(station, /data-orb-dictate-station/)
    assert.match(mobile, /data-orb-dictate-start=\{id\}|data-orb-dictate-speech-start/)
    assert.match(transcript, /data-orb-dictate-transcript-panel/)
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
    assert.match(station, /runSpeakerAction/)
    assert.match(station, /action === 'anonymise'/)
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

  it('copy save export still work via ORB Write', () => {
    const write = readComponent('components/orb-write/orb-write-station.tsx')
    const toolbar = readComponent('components/orb-write/orb-write-toolbar.tsx')
    const studio = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(toolbar, /data-orb-write-copy/)
    assert.match(toolbar, /data-orb-write-save-draft/)
    assert.match(toolbar, /data-orb-write-export-pdf/)
    assert.match(studio, /OrbWriteStation/)
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
    const actions = readComponent('components/orb-standalone/orb-voice-transcript-actions.tsx')
    assert.match(voice, /data-orb-voice-use-dictate|OrbVoiceTranscriptActions/)
    assert.match(actions, /data-orb-voice-to-dictate/)
    assert.match(voice, /onOpenDictate/)
  })

  it('standalone boundary copy present', () => {
    const privacy = readComponent('components/orb/dictate/OrbDictatePrivacyStrip.tsx')
    const boundary = readComponent('components/orb-standalone/orb-dictate-boundary-copy.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(privacy, /data-orb-dictate-privacy-banner/)
    assert.match(boundary, /data-orb-dictate-boundary-based-on-input/)
    assert.match(mobile, /OrbDictateBoundaryCopy|boundary/i)
  })

  it('Dictate product title and hero output types', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const selector = readComponent('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    const types = readFileSync(join(root, 'lib/orb/dictate/orb-dictate-types.ts'), 'utf8')
    assert.match(types, /orbResidentialStation\('orb_dictate'\)/)
    assert.match(station, /ORB_DICTATE_PRODUCT_SUBTITLE/)
    assert.match(selector, /data-orb-dictate-template-selector/)
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

  it('ORB Voice routes transcript to dictate via shared actions', () => {
    const actions = readComponent('components/orb-standalone/orb-voice-transcript-actions.tsx')
    assert.match(actions, /data-orb-voice-to-dictate/)
    assert.match(actions, /Send to Dictate/)
  })

  it('guided reflective debrief is typed not mic', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(station, /REFLECTIVE_DEBRIEF_QUESTIONS/)
    assert.match(mobile, /reflective|debrief/i)
  })

  it('dictate media recorder does not show pause when recording audio only', () => {
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const transcript = readComponent('components/orb/dictate/OrbTranscriptPanel.tsx')
    assert.match(station, /recorderModeRef\.current === 'speech'/)
    assert.match(transcript, /recordingPaused/)
  })

  it('anonymise action available in studio', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(studio, /data-orb-dictate-action-anonymise/)
    assert.match(studio, /data-orb-dictate-apply-anonymise/)
  })

  it('find replace panel in studio', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    const findReplace = readComponent('components/orb-standalone/orb-dictate-find-replace-panel.tsx')
    assert.match(studio, /OrbDictateFindReplacePanel/)
    assert.match(findReplace, /data-orb-dictate-find-replace/)
    assert.match(findReplace, /data-orb-dictate-replace-all/)
  })

  it('tone lock and readiness in studio', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(studio, /data-orb-dictate-tone-lock/)
    assert.match(studio, /data-orb-dictate-readiness-status/)
  })

  it('section diff preview in assistant', () => {
    const assistant = readComponent('components/orb-standalone/orb-dictate-studio-assistant.tsx')
    assert.match(assistant, /data-orb-dictate-section-changes/)
  })

  it('draft sync prompt when backend available', () => {
    const studio = readComponent('components/orb-standalone/orb-dictate-studio.tsx')
    const sync = readComponent('components/orb-standalone/orb-dictate-draft-sync-prompt.tsx')
    assert.match(studio, /OrbDictateDraftSyncPrompt/)
    assert.match(sync, /data-orb-dictate-draft-sync-prompt/)
  })
})
