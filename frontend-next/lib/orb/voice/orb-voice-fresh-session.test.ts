import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice fresh session lifecycle', () => {
  it('exports resetOrbVoiceLiveSession used by the voice station', () => {
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /resetOrbVoiceLiveSession/)
    assert.match(read('lib/orb/voice/orb-voice-fresh-session.ts'), /export function resetOrbVoiceLiveSession/)
  })

  it('resets on Voice open and close transitions', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /prevVoiceOpenRef/)
    assert.match(station, /open && !prevVoiceOpenRef\.current/)
    assert.match(station, /!open && prevVoiceOpenRef\.current/)
  })

  it('companion clears voice session chat when leaving Voice', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /setVoiceSessionChatId\(null\)/)
    assert.match(companion, /activePanel === 'orb_voice'/)
    assert.match(companion, /createStandaloneChat[\s\S]*temporary: true[\s\S]*ORB Voice/)
  })

  it('fresh session module clears reply and TTS guard refs', () => {
    const source = read('lib/orb/voice/orb-voice-fresh-session.ts')
    assert.match(source, /lastSyncedReplyKeyRef/)
    assert.match(source, /lastAutoSpokenKeyRef/)
    assert.match(source, /spokenTurnGuardRef/)
  })
})
