import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const VOICE_SURFACE_FILES = [
  'components/orb-standalone/orb-voice-station.tsx',
  'components/orb-standalone/orb-voice-mobile-experience.tsx',
  'components/orb-residential/orb-voice-companion.tsx'
] as const

describe('ORB Voice companion visual convergence', () => {
  it('all voice surfaces render OrbVoiceCompanion as the canonical visual', () => {
    for (const file of VOICE_SURFACE_FILES) {
      const source = read(file)
      assert.match(source, /OrbVoiceCompanion/, `${file} must use OrbVoiceCompanion`)
    }
  })

  it('voice surfaces do not import or render legacy GlassOrbMark sphere', () => {
    for (const file of VOICE_SURFACE_FILES) {
      const source = read(file)
      assert.doesNotMatch(source, /GlassOrbMark/, `${file} must not use GlassOrbMark`)
      assert.doesNotMatch(source, /glass-orb-mark--voice/, `${file} must not use glass-orb-mark voice classes`)
      assert.doesNotMatch(source, /glass-orb-mark__sphere/, `${file} must not use legacy sphere markup`)
    }
  })

  it('OrbVoiceCompanion exposes testable data markers for head and waveform', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    assert.match(companion, /data-orb-voice-companion/)
    assert.match(companion, /data-orb-voice-version="living-head-v2"|data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(companion, /data-orb-voice-state/)
    assert.match(companion, /data-orb-voice-head/)
    assert.match(companion, /data-orb-voice-waveform/)
    assert.match(companion, /variant="voice"/)
    assert.match(companion, /orb-voice-companion__eyes/)
    assert.match(companion, /orb-voice-companion__waveform/)
  })

  it('voice station wires companion state from transport and does not pass legacy orb classes', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /mapOrbVoiceUiToCompanionState/)
    assert.match(station, /voiceCompanionState=\{companionState\}/)
    assert.doesNotMatch(station, /orbVisualClassName/)
    assert.doesNotMatch(station, /pulseOrb/)
    assert.doesNotMatch(station, /orbVisualClassFrom/)
  })

  it('voice head CSS targets orb-voice-companion not legacy glass orb sphere', () => {
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(css, /\.orb-voice-companion \.orb-living-sphere/)
    assert.match(css, /\.orb-voice-companion__eyes/)
    assert.match(css, /\.orb-voice-companion__waveform/)
    assert.match(css, /\[data-orb-voice-state='speaking'\]/)
    assert.match(css, /\[data-orb-voice-state='listening'\]/)
    assert.match(css, /\[data-orb-voice-state='thinking'\]/)
    assert.match(css, /\[data-orb-voice-state='error'\]/)
    assert.doesNotMatch(css, /\.glass-orb-mark--voice \.glass-orb-mark__sphere/)
  })
})
