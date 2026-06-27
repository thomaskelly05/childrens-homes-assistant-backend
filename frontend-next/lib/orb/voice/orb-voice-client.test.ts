import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = dirname(fileURLToPath(import.meta.url))

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-voice-client TTS source contract', () => {
  it('requestOrbPremiumTts requires and sends source', () => {
    const client = readSource('orb-voice-client.ts')
    assert.match(client, /source:\s*OrbVoiceTtsSource/)
    assert.match(client, /source:\s*options\.source/)
    assert.match(client, /'manual_speak'/)
    assert.match(client, /'voice_mode'/)
    assert.match(client, /'settings_preview'/)
  })

  it('standalone voice hook maps manual, preview and voice turn sources', () => {
    const hook = readSource('../../../components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /resolveTtsSource/)
    assert.match(hook, /settings_preview/)
    assert.match(hook, /voice_mode/)
    assert.match(hook, /manual_speak/)
    assert.match(hook, /source:\s*resolveTtsSource\(options\)/)
  })

  it('voice v2 client sends voice_mode source by default', () => {
    const client = readSource('../voice-v2/orb-voice-v2-client.ts')
    assert.match(client, /source:\s*options\?\.source\s*\?\?\s*'voice_mode'/)
  })

  it('voice v2 hook requests speak with voice_mode source', () => {
    const hook = readSource('../voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /source:\s*'voice_mode'/)
  })

  it('typed chat still does not auto-trigger TTS', () => {
    const companion = readSource('../../../components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /speechDecision\.allowAutoSpeak/)
    assert.doesNotMatch(companion, /voice\.speak\(/)
    assert.match(companion, /speakMessageContent/)
    assert.match(companion, /voice\.speakAloud/)
  })
})
