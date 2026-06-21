import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readLib(relativePath: string) {
  return readFileSync(join(root, 'lib', relativePath), 'utf8')
}

describe('ORB Voice conversational sprint', () => {
  it('station renders premium voice room with explicit start', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(station, /data-orb-voice-station/)
    assert.match(station, /data-orb-voice-start-stage/)
    assert.match(station, /OrbVoiceActions/)
    assert.match(actions, /data-orb-voice-primary-action/)
    assert.match(readLib('orb/voice/orb-voice-ui-state.ts'), /ORB_VOICE_BUTTON_START/)
    assert.match(station, /ORB_VOICE_PANEL_SUBTITLE/)
  })

  it('voice settings persist under orb-voice-settings key', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    const types = readLib('orb/voice/orb-voice-types.ts')
    assert.match(hook, /ORB_VOICE_SETTINGS_STORAGE_KEY/)
    assert.match(types, /ORB_VOICE_SETTINGS_STORAGE_KEY/)
    assert.match(hook, /allowInterruption/)
    assert.match(hook, /voiceMode/)
    assert.match(hook, /speechSynthesis\?\.cancel/)
    assert.match(hook, /interruptForListen/)
  })

  it('voice settings panel exposes modes and interruption', () => {
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /data-orb-voice-settings-panel/)
    assert.match(panel, /data-orb-voice-allow-interruption/)
    assert.match(panel, /data-orb-open-orb-voice/)
    assert.match(panel, /data-orb-voice-push-to-talk/)
    assert.match(panel, /data-orb-voice-profile-select/)
    assert.match(panel, /Preview voice/)
    assert.match(panel, /data-orb-voice-auto-speak/)
  })

  it('voice profile registry returns ORB British Female default', () => {
    const profiles = readLib('orb/voice/orb-voice-profiles.ts')
    assert.match(profiles, /DEFAULT_ORB_VOICE_PROFILE_ID = 'orb_british_female'/)
    assert.match(profiles, /ORB_VOICE_PROFILES/)
  })

  it('voice settings render all profile labels', () => {
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /listCuratedOrbVoiceProfiles/)
    assert.match(panel, /profile\.label|orbVoiceProfileLabel/)
    assert.match(panel, /data-orb-voice-profile-select/)
    const profiles = readLib('orb/voice/orb-voice-profiles.ts')
    const count = (profiles.match(/id: '/g) || []).length
    assert.ok(count >= 7)
  })

  it('selecting a voice persists to localStorage', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /ORB_VOICE_SETTINGS_STORAGE_KEY/)
    assert.match(hook, /userChoseVoice/)
    assert.match(hook, /voicePresetId/)
  })

  it('ORB Voice modal shows selected voice label not raw OpenAI id', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /orbVoiceProfileLabel/)
    assert.match(station, /selectedProfileLabel/)
    assert.doesNotMatch(station, /<option[^>]*>coral<\/option>/)
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /profile\.label/)
  })

  it('composer mic button exists on residential composer', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-mic/)
  })

  it('voice station links to dictate', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /OrbVoiceTranscriptActions/)
    assert.match(voice, /onOpenDictate/)
  })

  it('voice transcript actions support dictate routing', () => {
    const actions = readComponent('components/orb-standalone/orb-voice-transcript-actions.tsx')
    assert.match(actions, /data-orb-voice-to-dictate/)
  })

  it('ORB Voice links to dictate from transcript actions', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /OrbVoiceTranscriptActions/)
    const actions = readComponent('components/orb-standalone/orb-voice-transcript-actions.tsx')
    assert.match(actions, /Send to Dictate/)
  })
})
