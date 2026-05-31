import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { pickBritishFemaleVoice } from '../../lib/orb/voice/orb-voice-browser.ts'
import { frameMessageForOrbVoice } from '../../lib/orb/voice/orb-voice-prompt.ts'
import { ORB_VOICE_SETTINGS_STORAGE_KEY } from '../../lib/orb/voice/orb-voice-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice conversational sprint', () => {
  it('station renders premium voice room with explicit start', () => {
    const station = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /data-orb-voice-station/)
    assert.match(station, /data-orb-voice-start/)
    assert.match(station, /Start conversation/)
    assert.match(station, /Voice starts only when you press Start/)
    assert.match(station, /data-orb-voice-interrupt/)
    assert.match(station, /data-orb-voice-save-transcript/)
    assert.match(station, /conversational voice copilot/)
  })

  it('voice settings persist under orb-voice-settings key', () => {
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /ORB_VOICE_SETTINGS_STORAGE_KEY/)
    assert.equal(ORB_VOICE_SETTINGS_STORAGE_KEY, 'orb-voice-settings')
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
    assert.match(panel, /British female voice where available/)
  })

  it('composer mic and speak remain visible', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-mic/)
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /interruptForListen/)
    assert.match(companion, /speakAloud/)
  })

  it('voice prompt framing avoids cognition labels', () => {
    const framed = frameMessageForOrbVoice('Help with a safeguarding concern', {
      mode: 'safeguarding_support',
      spokenAnswerLength: 'balanced'
    })
    assert.match(framed, /ORB Voice/)
    assert.match(framed, /safeguarding/)
    assert.doesNotMatch(framed, /chain of thought/i)
  })

  it('British voice preference selects en-GB where available', () => {
    const voices = [
      { name: 'Google US English', lang: 'en-US', voiceURI: 'us', localService: true },
      { name: 'Google UK English Female', lang: 'en-GB', voiceURI: 'gb-f', localService: true },
      { name: 'Microsoft David', lang: 'en-GB', voiceURI: 'gb-m', localService: true }
    ] as SpeechSynthesisVoice[]
    const picked = pickBritishFemaleVoice(voices, true, null)
    assert.equal(picked?.voiceURI, 'gb-f')
  })

  it('backend voice client abstracts session and speak', () => {
    const client = readComponent('lib/orb/voice/orb-voice-client.ts')
    assert.match(client, /startOrbVoiceSession/)
    assert.match(client, /requestOrbVoiceSpeak/)
    assert.match(client, /browser_fallback/)
  })

  it('save voice transcript uses voice_transcript type', () => {
    const save = readComponent('lib/orb/voice/save-voice-transcript.ts')
    assert.match(save, /voice_transcript/)
  })

  it('realtime architecture doc exists', () => {
    const doc = readComponent('docs/orb-voice-realtime-architecture.md')
    assert.match(doc, /WebRTC|WebSocket/)
    assert.match(doc, /barge-in|interrupt/i)
  })
})
