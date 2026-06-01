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
    assert.match(station, /data-orb-voice-station/)
    assert.match(station, /data-orb-voice-start/)
    assert.match(station, /Start conversation/)
    assert.match(station, /orbVoiceReadinessPresentation/)
    assert.match(station, /data-orb-voice-readiness/)
    assert.match(station, /data-orb-voice-interrupt/)
    assert.match(station, /data-orb-voice-save-transcript/)
    assert.match(station, /conversational voice copilot/)
  })

  it('voice settings persist under orb-voice-settings key', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    const types = readLib('orb/voice/orb-voice-types.ts')
    assert.match(hook, /ORB_VOICE_SETTINGS_STORAGE_KEY/)
    assert.match(types, /ORB_VOICE_SETTINGS_STORAGE_KEY = 'orb-voice-settings'/)
    assert.match(hook, /allowInterruption/)
    assert.match(hook, /voiceMode/)
    assert.match(hook, /speechSynthesis\.cancel/)
    assert.match(hook, /interruptForListen/)
  })

  it('voice settings panel exposes modes and interruption', () => {
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /data-orb-voice-settings-panel/)
    assert.match(panel, /data-orb-voice-allow-interruption/)
    assert.match(panel, /data-orb-open-orb-voice/)
    assert.match(panel, /data-orb-voice-push-to-talk/)
    assert.match(panel, /data-orb-voice-profile-list/)
    assert.match(panel, /Preview voice/)
    assert.match(panel, /data-orb-voice-use-read-aloud/)
  })

  it('voice profile registry returns ORB British Female default', () => {
    const profiles = readLib('orb/voice/orb-voice-profiles.ts')
    assert.match(profiles, /DEFAULT_ORB_VOICE_PROFILE_ID = 'orb_british_female'/)
    assert.match(profiles, /ORB_VOICE_PROFILES/)
  })

  it('voice settings render all profile labels', () => {
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /ORB_VOICE_PROFILES\.map/)
    assert.match(panel, /profile\.label/)
    assert.match(panel, /data-orb-voice-profile-label/)
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
    assert.match(station, /data-orb-voice-selected-profile/)
    assert.match(station, /orbVoiceProfileLabel/)
    assert.doesNotMatch(station, /<option[^>]*>coral<\/option>/)
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /data-orb-voice-dev-openai-id/)
  })

  it('preview falls back to browser when server TTS missing', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /previewVoiceProfile/)
    assert.match(hook, /requestOrbVoiceSpeak/)
    assert.match(hook, /speakAloud/)
  })

  it('speak answer uses selected profile via resolveBrowserVoice', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /resolveBrowserVoice/)
    assert.match(hook, /readAloudProfileId/)
  })

  it('composer mic and speak remain visible', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-mic/)
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /interruptForListen/)
    assert.match(companion, /speakAloud/)
  })

  it('voice prompt framing avoids cognition labels', () => {
    const promptSrc = readLib('orb/voice/orb-voice-prompt.ts')
    assert.match(promptSrc, /frameMessageForOrbVoice/)
    assert.match(promptSrc, /ORB Voice/)
    assert.doesNotMatch(promptSrc, /chain of thought/i)
  })

  it('British voice preference selects en-GB where available', async () => {
    const { pickBritishFemaleVoice } = await import('../../lib/orb/voice/orb-voice-browser.ts')
    const voices = [
      { name: 'Google US English', lang: 'en-US', voiceURI: 'us', localService: true },
      { name: 'Google UK English Female', lang: 'en-GB', voiceURI: 'gb-f', localService: true },
      { name: 'Microsoft David', lang: 'en-GB', voiceURI: 'gb-m', localService: true }
    ] as SpeechSynthesisVoice[]
    const picked = pickBritishFemaleVoice(voices, true, null)
    assert.equal(picked?.voiceURI, 'gb-f')
  })

  it('backend voice client abstracts session and speak', () => {
    const client = readLib('orb/voice/orb-voice-client.ts')
    assert.match(client, /startOrbVoiceSession/)
    assert.match(client, /requestOrbVoiceSpeak/)
    assert.match(client, /browser_fallback/)
    assert.match(client, /websocket_realtime/)
  })

  it('realtime provider pass doc exists', () => {
    const doc = readComponent('docs/orb-voice-realtime-provider-pass.md')
    assert.match(doc, /WebSocket/)
    assert.match(doc, /browser fallback/i)
  })

  it('save voice transcript uses voice_transcript type', () => {
    const save = readLib('orb/voice/save-voice-transcript.ts')
    assert.match(save, /voice_transcript/)
  })

  it('realtime architecture doc exists', () => {
    const doc = readComponent('docs/orb-voice-realtime-architecture.md')
    assert.match(doc, /WebRTC|WebSocket/)
    assert.match(doc, /barge-in|interrupt/i)
  })

  it('ORB Voice links to ORB Dictate with meeting and debrief actions', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-to-dictate/)
    assert.match(voice, /data-orb-voice-to-meeting/)
    assert.match(voice, /data-orb-voice-to-debrief/)
    assert.match(voice, /Send transcript to ORB Dictate/)
  })
})
