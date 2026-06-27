import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB assistant message Speak action', () => {
  it('shows visible Speak on assistant action bar including residential quiet mode', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /dataAttr="speak"/)
    assert.match(assistant, /label=\{speakLabel\}/)
    assert.match(assistant, /speakLabelVisible/)
    assert.match(assistant, /primaryActions\.push\(renderSpeakAction\('speak'\)\)/)
    assert.doesNotMatch(assistant, /if \(!residentialQuietMode\) \{[\s\S]*primaryActions\.push\([\s\S]*dataAttr="speak"/)
  })

  it('does not attach Speak action bar to user messages', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /entry\.role === 'assistant'[\s\S]*OrbResponseActionBar/)
    assert.doesNotMatch(companion, /entry\.role === 'user'[\s\S]{0,400}OrbResponseActionBar/)
  })

  it('manual Speak uses speakMessageContent and speakAloud with manual source', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const voice = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(companion, /speakMessageContent/)
    assert.match(companion, /onSpeak=\{\(\) => speakMessageContent\(entry\.id, entry\.content\)\}/)
    assert.match(companion, /voice\.speakAloud\(speechText[\s\S]*source: 'manual'/)
    assert.match(voice, /resolveTtsSource/)
    assert.match(voice, /return 'manual_speak'/)
    assert.match(voice, /source: resolveTtsSource\(options\)/)
  })

  it('typed chat completion does not auto-call TTS after response', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /speechDecision\.allowAutoSpeak/)
    assert.doesNotMatch(companion, /voice\.speak\(/)
    assert.doesNotMatch(companion, /speakAloud\([\s\S]*orb_turn/)
  })

  it('residential More menu includes Copy, Speak, Save, and Open in ORB Write when wired', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /if \(residentialQuietMode\) \{[\s\S]*renderSpeakAction\('speak-more'/)
    assert.match(assistant, /key="copy-more"/)
    assert.match(assistant, /key="save-more"/)
    assert.match(assistant, /key="open-write-more"/)
  })

  it('speech failure notice stays with the text reply', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(assistant, /data-orb-speech-notice/)
    assert.match(companion, /speechNotice=\{[\s\S]*voice\.speechPlaybackError/)
    assert.match(readComponent('lib/orb/voice/orb-voice-speech-loop.ts'), /ORB_MANUAL_SPEAK_UNAVAILABLE/)
  })
})
