import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_LIVE_SPOKEN_CAP,
  capOrbVoiceSpokenText,
  resolveOrbVoiceSpokenText,
  resolveOrbVoiceTtsContext
} from './orb-voice-low-latency.ts'
import { resolveOrbVoiceTurnTtsText } from './orb-voice-runtime-wiring.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice low-latency spoken text and TTS context', () => {
  it('caps normal voice turns around 320 characters', () => {
    const reply = `Reflective note. ${'Sentence. '.repeat(40)}`
    const resolved = resolveOrbVoiceTurnTtsText({
      visibleReply: reply,
      promptTier: 'voice_fast'
    })
    assert.ok(resolved.spokenText.length <= ORB_VOICE_LIVE_SPOKEN_CAP)
    assert.equal(resolved.spokenCapApplied, true)
  })

  it('does not include markdown or follow-up metadata in spoken text', () => {
    const resolved = resolveOrbVoiceSpokenText({
      visibleReply: '**Calm** reply. What felt hardest?',
      promptTier: 'voice_fast'
    })
    assert.doesNotMatch(resolved.spokenText, /\*\*/)
    assert.match(resolved.spokenText, /Calm reply/)
  })

  it('maps live voice TTS context for conversational turns', () => {
    assert.equal(resolveOrbVoiceTtsContext('live_voice'), 'live_voice')
    assert.equal(resolveOrbVoiceTtsContext('summary'), 'summary')
    const client = read('lib/orb/voice/orb-voice-client.ts')
    assert.match(client, /context/)
    assert.match(client, /live_voice/)
  })

  it('voice hook prepares audio after showing text', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /setVoicePreparing\(options\?\.source === 'orb_turn'\)/)
    assert.match(hook, /setSpeaking\(true\)[\s\S]*audio\.onplay/)
    const service = read('../services/orb_voice_tts_service.py')
    assert.match(service, /ORB_TTS_LIVE_MODEL/)
    assert.match(service, /_resolve_openai_tts_model/)
  })

  it('cap helper reports when cap is applied', () => {
    const capped = capOrbVoiceSpokenText('x'.repeat(400))
    assert.equal(capped.text.length, ORB_VOICE_LIVE_SPOKEN_CAP)
    assert.equal(capped.capApplied, true)
  })
})
