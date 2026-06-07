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
  'components/orb-standalone/orb-voice-station-content.tsx',
  'components/orb-standalone/orb-voice-hero-stage.tsx',
  'components/orb-residential/orb-voice-companion.tsx',
  'components/orb-residential/orb-voice-head.tsx'
] as const

describe('ORB Voice companion visual convergence', () => {
  it('all voice surfaces render OrbVoiceCompanion as the canonical visual', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    for (const file of VOICE_SURFACE_FILES) {
      const source = read(file)
      if (file.endsWith('orb-voice-hero-stage.tsx')) continue
      if (file.endsWith('orb-voice-head.tsx')) continue
      assert.match(source, /OrbVoiceCompanion|OrbVoiceHead|OrbVoiceHeroStage|OrbVoiceStationContent/, `${file} must use canonical voice visual path`)
    }
    assert.match(hero, /OrbVoiceCompanion/)
  })

  it('voice surfaces do not import or render legacy GlassOrbMark sphere', () => {
    for (const file of VOICE_SURFACE_FILES) {
      const source = read(file)
      assert.doesNotMatch(source, /GlassOrbMark/, `${file} must not use GlassOrbMark`)
      assert.doesNotMatch(source, /glass-orb-mark--voice/, `${file} must not use glass-orb-mark voice classes`)
      assert.doesNotMatch(source, /glass-orb-mark__sphere/, `${file} must not use legacy sphere markup`)
    }
  })

  it('OrbVoiceHead exposes living-head-v9 markers and SVG profile silhouette', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_VOICE_VERSION = 'living-head-v9'/)
    assert.match(companion, /OrbVoiceHead/)
    assert.match(head, /data-orb-voice-companion/)
    assert.match(head, /data-orb-voice-companion-size=\{resolvedSize\}/)
    assert.match(head, /data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(head, /data-orb-voice-state/)
    assert.match(head, /data-orb-voice-head/)
    assert.match(head, /data-orb-voice-face/)
    assert.match(head, /data-orb-voice-waveform/)
    assert.match(head, /orb-voice-companion__head-material/)
    assert.match(head, /orb-voice-companion__svg/)
    assert.match(head, /viewBox="0 0 200 280"/)
    assert.match(head, /orb-voice-companion__eyes/)
    assert.doesNotMatch(head, /OrbPresence/)
    assert.doesNotMatch(head, /import.*OrbSphere/)
    assert.doesNotMatch(head, /GlassOrbMark/)
  })

  it('OrbVoiceHead exposes human presence hooks for breathing, eyes and state motion', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const css = read('components/orb-residential/orb-voice.css')

    assert.match(head, /data-orb-voice-breathe/)
    assert.match(head, /data-orb-voice-breathe-bust/)
    assert.match(head, /data-orb-voice-eye-left/)
    assert.match(head, /data-orb-voice-eye-right/)
    assert.match(head, /data-orb-voice-listening-waves/)
    assert.match(head, /data-orb-voice-particles/)
    assert.match(head, /data-orb-voice-thinking-halo/)
    assert.match(head, /data-orb-voice-head-motion/)
    assert.match(head, /data-orb-voice-mouth-light/)
    assert.match(head, /data-orb-voice-blink-active/)
    assert.match(head, /orb-voice-companion__eye--blink/)
    assert.match(head, /orb-voice-companion__eye-shimmer/)
    assert.match(head, /orb-voice-companion__nose-bridge/)
    assert.match(head, /orb-voice-companion__jaw-line/)
    assert.match(head, /orb-voice-companion__temple-warmth/)

    assert.match(css, /orb-voice-head-breathe/)
    assert.match(css, /orb-voice-neck-breathe/)
    assert.match(css, /orb-voice-bust-breathe/)
    assert.match(css, /--orb-voice-speech-energy/)
    assert.match(css, /--orb-voice-mouth-open/)
    assert.match(css, /--orb-head-tilt/)
    assert.match(css, /orb-voice-mouth-fallback/)
    assert.match(css, /orb-voice-head-speak-nod/)
    assert.match(css, /orb-voice-eye-shimmer/)
    assert.match(css, /orb-voice-listen-wave/)
    assert.match(css, /orb-voice-particle-drift/)
    assert.match(css, /\[data-orb-voice-state='idle'\]/)
    assert.match(css, /\[data-orb-voice-state='listening'\]/)
    assert.match(css, /\[data-orb-voice-state='thinking'\]/)
    assert.match(css, /\[data-orb-voice-state='speaking'\]/)
    assert.match(css, /\[data-orb-voice-state='paused'\]/)
    assert.match(css, /prefers-reduced-motion: reduce/)
  })

  it('companion size scopes separate hero, mini, and mobile-preview instances', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')
    const css = read('components/orb-residential/orb-voice.css')

    assert.match(head, /resolveOrbVoiceCompanionSize/)
    assert.match(head, /'hero' \| 'mini' \| 'mobile-preview'/)
    assert.match(head, /orb-voice-companion--hero/)
    assert.match(head, /orb-voice-companion--mobile-preview/)
    assert.doesNotMatch(companion, /orb-voice-companion--preview/)

    assert.match(hero, /size="hero"/)
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
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')

    assert.match(hero, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.match(head, /data-orb-voice-head-shell/)
    assert.match(head, /data-orb-voice-eyes/)
    assert.match(head, /data-orb-voice-waveform/)
    assert.doesNotMatch(
      station,
      /size="mini"|size="mobile-preview"|size="preview"/
    )
  })

  it('voice head does not use circular-only sphere class contract', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const css = read('components/orb-residential/orb-voice.css')
    assert.doesNotMatch(head, /orb-living-sphere/)
    assert.doesNotMatch(head, /className=.*orb-sphere/)
    assert.doesNotMatch(head, /orb-presence--voice/)
    assert.match(css, /\.orb-voice-companion \.orb-living-sphere[\s\S]*display:\s*none/)
    assert.match(css, /\.orb-voice-companion__head-material/)
    assert.match(css, /\.orb-voice-companion__svg/)
    assert.match(css, /border-radius: 44% 44% 36% 36%/)
  })

  it('voice station wires companion state from transport and uses unified station content', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(station, /mapOrbVoiceUiToCompanionState/)
    assert.match(station, /companionState=\{companionState\}/)
    assert.match(station, /OrbVoiceStationContent/)
    assert.match(content, /data-orb-voice-station-content/)
    assert.match(station, /OrbVoiceDebugVisualShowcase/)
    assert.doesNotMatch(station, /orbVisualClassName/)
    assert.doesNotMatch(station, /pulseOrb/)
    assert.doesNotMatch(station, /orbVisualClassFrom/)
  })

  it('voice head CSS targets custom head silhouette with state styling', () => {
    const css = read('components/orb-residential/orb-voice.css')
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

  it('shared voice experience includes studio waveform and hero CTA without production state panel', () => {
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(hero, /OrbVoiceStudioWaveform/)
    assert.match(hero, /data-orb-voice-hero-cta/)
    assert.match(content, /cta=\{controls\}/)
    assert.doesNotMatch(hero, /OrbVoiceStatePanel/)
    assert.doesNotMatch(hero, /data-orb-voice-state-panel/)
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
