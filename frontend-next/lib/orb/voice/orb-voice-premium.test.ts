import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = dirname(fileURLToPath(import.meta.url))

function readSrc(name: string) {
  return readFileSync(join(root, name), 'utf8')
}

describe('ORB voice premium upgrade', () => {
  it('defines spoken summary helper', () => {
    const src = readSrc('orb-spoken-summary.ts')
    assert.match(src, /buildOrbSpokenSummary/)
    assert.match(src, /on screen/)
  })

  it('defines speech policy with safeguarding block message', () => {
    const src = readSrc('orb-voice-speech-policy.ts')
    assert.match(src, /resolveOrbVoiceSpeechDecision/)
    assert.match(src, /safeguarding_critical/)
  })

  it('provider client never exposes API keys', () => {
    const src = readSrc('orb-voice-provider.ts')
    assert.equal(src.includes('ELEVENLABS_API_KEY'), false)
  })

  it('settings panel uses curated profile selector', () => {
    const panel = readFileSync(
      join(root, '../../../components/orb-standalone/orb-voice-settings-panel.tsx'),
      'utf8'
    )
    assert.match(panel, /data-orb-voice-profile-select/)
    assert.match(panel, /Privacy mode/)
  })

  it('voice station shows you said and orb replied sections', () => {
    const station = readFileSync(
      join(root, '../../../components/orb-standalone/orb-voice-station.tsx'),
      'utf8'
    )
    assert.match(station, /data-orb-voice-you-said/)
    assert.match(station, /data-orb-voice-orb-replied/)
    assert.match(station, /data-orb-voice-speak-again/)
  })

  it('companion uses speech decision for auto speak', () => {
    const companion = readFileSync(
      join(root, '../../../components/orb-standalone/orb-care-companion.tsx'),
      'utf8'
    )
    assert.match(companion, /speechDecision\.allowAutoSpeak/)
    assert.match(companion, /speechDecision\.spokenText/)
  })
})
