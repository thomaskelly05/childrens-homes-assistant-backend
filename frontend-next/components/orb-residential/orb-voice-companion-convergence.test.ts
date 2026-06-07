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

  it('OrbVoiceCompanion exposes living-head-v3 markers and custom head structure', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_VOICE_VERSION = 'living-head-v4'/)
    assert.match(companion, /data-orb-voice-companion/)
    assert.match(companion, /data-orb-voice-companion-size=\{resolvedSize\}/)
    assert.match(companion, /data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(companion, /data-orb-voice-state/)
    assert.match(companion, /data-orb-voice-head/)
    assert.match(companion, /data-orb-voice-face/)
    assert.match(companion, /data-orb-voice-waveform/)
    assert.match(companion, /orb-voice-companion__head-material/)
    assert.match(companion, /orb-voice-companion__eyes/)
    assert.doesNotMatch(companion, /OrbPresence/)
    assert.doesNotMatch(companion, /OrbSphere/)
    assert.doesNotMatch(companion, /GlassOrbMark/)
  })

  it('companion size scopes separate hero, mini, and mobile-preview instances', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')
    const mobile = read('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const css = read('components/orb-residential/orb-voice-companion.css')

    assert.match(companion, /resolveOrbVoiceCompanionSize/)
    assert.match(companion, /'hero' \| 'mini' \| 'mobile-preview'/)
    assert.match(companion, /orb-voice-companion--hero/)
    assert.match(companion, /orb-voice-companion--mobile-preview/)
    assert.doesNotMatch(companion, /orb-voice-companion--preview/)

    assert.match(station, /size="hero"/)
    assert.match(mobile, /size="hero"/)
    assert.match(studio, /size="mini"/)
    assert.match(studio, /size="mobile-preview"/)
    assert.doesNotMatch(station, /size="mini"/)
    assert.doesNotMatch(station, /size="mobile-preview"/)

    assert.match(css, /\[data-orb-voice-companion-size='hero'\]/)
    assert.match(css, /\[data-orb-voice-companion-size='mini'\]/)
    assert.match(css, /\[data-orb-voice-companion-size='mobile-preview'\]/)
    assert.match(css, /\[data-orb-voice-companion-size='hero'\][\s\S]*opacity:\s*1/)
    assert.match(css, /min-width:\s*var\(--orb-voice-head-width\)/)
  })

  it('hero companion keeps head, face and waveform markers without mini/mobile classes', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')

    assert.match(station, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.match(companion, /data-orb-voice-head-shell/)
    assert.match(companion, /data-orb-voice-eyes/)
    assert.match(companion, /data-orb-voice-waveform/)
    assert.doesNotMatch(
      station,
      /size="mini"|size="mobile-preview"|size="preview"/
    )
  })

  it('voice head does not use circular-only sphere class contract', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const css = read('components/orb-residential/orb-voice-companion.css')
    assert.doesNotMatch(companion, /orb-living-sphere/)
    assert.doesNotMatch(companion, /orb-sphere/)
    assert.doesNotMatch(companion, /orb-presence--voice/)
    assert.match(css, /\.orb-voice-companion \.orb-living-sphere[\s\S]*display:\s*none/)
    assert.match(css, /\.orb-voice-companion__head-material/)
    assert.match(css, /border-radius: 44% 44% 36% 36%/)
  })

  it('voice station wires companion state from transport and renders voice studio layout', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /mapOrbVoiceUiToCompanionState/)
    assert.match(station, /voiceCompanionState=\{companionState\}/)
    assert.match(station, /data-orb-voice-studio/)
    assert.match(station, /OrbVoiceStatePanel/)
    assert.match(station, /OrbVoiceMobilePreviewStrip/)
    assert.match(station, /OrbVoiceTrustStrip/)
    assert.match(station, /OrbVoiceStudioWaveform/)
    assert.doesNotMatch(station, /orbVisualClassName/)
    assert.doesNotMatch(station, /pulseOrb/)
    assert.doesNotMatch(station, /orbVisualClassFrom/)
  })

  it('voice head CSS targets custom head silhouette with state styling', () => {
    const css = read('components/orb-residential/orb-voice-companion.css')
    assert.match(css, /\.orb-voice-companion__eyes/)
    assert.match(css, /\[data-orb-voice-waveform\]/)
    assert.match(css, /\[data-orb-voice-state='speaking'\]/)
    assert.match(css, /\[data-orb-voice-state='listening'\]/)
    assert.match(css, /\[data-orb-voice-state='thinking'\]/)
    assert.match(css, /\[data-orb-voice-state='error'\]/)
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')
    assert.match(studio, /data-orb-voice-state-panel/)
    assert.match(studio, /data-orb-voice-mobile-preview/)
    assert.doesNotMatch(css, /\.glass-orb-mark--voice \.glass-orb-mark__sphere/)
  })

  it('mobile voice experience includes studio waveform without state panel', () => {
    const mobile = read('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.match(mobile, /OrbVoiceStudioWaveform/)
    assert.doesNotMatch(mobile, /OrbVoiceStatePanel/)
    assert.doesNotMatch(mobile, /data-orb-voice-state-panel/)
  })

  it('login screen uses front-door-v4 marker', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_LOGIN_VERSION = 'front-door-v4'/)
    assert.match(login, /data-orb-login-version=\{ORB_LOGIN_VERSION\}/)
  })

  it('voice actions and realtime routes remain unchanged', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const realtime = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(station, /OrbVoiceActions/)
    assert.match(station, /handleStart/)
    assert.match(station, /handleEnd/)
    assert.match(station, /requestMicrophoneAccess/)
    assert.match(realtime, /\/orb\/voice/)
    assert.doesNotMatch(station, /GlassOrbMark/)
  })
})
