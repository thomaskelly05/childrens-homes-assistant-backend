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

  it('station wires voice v2 without duplicate shell', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /OrbVoiceMobileExperience/)
    assert.match(station, /OrbVoiceStationContent/)
  })

  it('summary handoff uses dictate framework via station actions', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /onOpenDictate/)
    assert.match(station, /data-orb-voice-send-to-dictate/)
    assert.doesNotMatch(station, /orb-voice-mobile-experience/)
  })
})
