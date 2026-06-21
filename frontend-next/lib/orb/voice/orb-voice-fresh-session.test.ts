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
  it('voice v2 hook exports resetLiveSession used by the voice station', () => {
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /resetLiveSession/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /resetLiveSession/)
  })

  it('resets on Voice open and close transitions', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /if \(!open\)/)
    assert.match(hook, /resetLiveSession\(\)/)
    assert.match(hook, /useEffect\([\s\S]*open/)
  })

  it('companion stops composer audio when leaving Voice', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /activePanel === 'orb_voice'/)
    assert.match(companion, /voice\.cancelSpeaking/)
  })

  it('v2 hook clears spoken turn guard refs on reset', () => {
    const source = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(source, /spokenTurnKeysRef/)
    assert.match(source, /spokenTurnKeysRef\.current\.clear/)
  })
})
