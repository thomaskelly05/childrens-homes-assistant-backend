import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice conversation engine UI integration', () => {
  it('live panel shows acknowledgement and prompt slots', () => {
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')
    assert.match(live, /data-orb-voice-live-prompt/)
    assert.match(live, /data-orb-voice-suggested-question/)
    assert.match(live, /data-orb-voice-live-safety/)
    assert.match(live, /data-orb-voice-barge-in-fallback/)
  })

  it('station wires conversation engine without duplicate shell', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /evaluateOrbVoiceConversation/)
    assert.match(station, /orb-voice-conversation-engine/)
    assert.doesNotMatch(station, /OrbVoiceMobileExperience/)
    assert.match(station, /OrbVoiceStationContent/)
  })

  it('after-call panel shows upgraded sections and suggested record type', () => {
    const after = read('components/orb-standalone/orb-voice-after-call-panel.tsx')
    assert.match(after, /data-orb-voice-child-voice/)
    assert.match(after, /data-orb-voice-adult-response/)
    assert.match(after, /data-orb-voice-missing-information/)
    assert.match(after, /data-orb-voice-suggested-record-type/)
    assert.match(after, /OrbDictateTemplateSelector/)
  })

  it('voice prompt includes conversational style instructions', () => {
    const prompt = read('lib/orb/voice/orb-voice-prompt.ts')
    const engine = read('lib/orb/voice/orb-voice-conversation-engine.ts')
    assert.match(prompt, /ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS/)
    assert.match(prompt, /One follow-up question at a time/i)
    assert.match(engine, /one question at a time/i)
    assert.match(engine, /professional judgement/i)
    assert.match(engine, /safeguarding/i)
  })

  it('turn into record uses existing dictate framework', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /handleCreateDraftFromVoice/)
    assert.match(station, /templateById/)
    assert.doesNotMatch(station, /orb-voice-mobile-experience/)
  })
})
