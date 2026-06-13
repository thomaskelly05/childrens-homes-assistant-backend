import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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

  it('OrbVoiceHead exposes living-core-v1 markers and asset+css orb renderer', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const core = read('components/orb-residential/orb-voice-core.tsx')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_VOICE_VERSION = 'living-core-v1'/)
    assert.match(visualBuild, /ORB_VOICE_CORE_ASSET_WEBP/)
    assert.match(visualBuild, /ORB_VOICE_CORE_ASSET_PNG/)
    assert.match(companion, /OrbVoiceHead/)
    assert.match(head, /data-orb-voice-companion/)
    assert.match(head, /data-orb-voice-companion-size=\{resolvedSize\}/)
    assert.match(head, /data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(head, /data-orb-voice-state/)
    assert.match(head, /data-orb-voice-head/)
    assert.match(head, /OrbVoiceCore/)
    assert.match(head, /data-orb-voice-attention/)
    assert.match(head, /data-orb-voice-renderer="asset\+css"/)
    assert.match(head, /data-orb-voice-behaviour="living-core-v1"/)
    assert.match(core, /data-orb-voice-core/)
    assert.match(core, /data-orb-voice-waveform/)
    assert.match(core, /data-orb-voice-thinking-swirl/)
    assert.match(core, /data-orb-voice-listen-rings/)
    assert.match(core, /ORB_VOICE_CORE_ASSET_WEBP/)
    assert.match(core, /data-orb-voice-orb-asset/)
    assert.doesNotMatch(head, /OrbVoiceAvatarRig/)
    assert.doesNotMatch(head, /useRive/)
    assert.doesNotMatch(head, /orb-voice-head-base/)
    assert.doesNotMatch(head, /data-orb-voice-face/)
    assert.doesNotMatch(head, /data-orb-voice-mouth-light/)
    assert.doesNotMatch(head, /OrbPresence/)
    assert.doesNotMatch(head, /import.*OrbSphere/)
    assert.doesNotMatch(head, /GlassOrbMark/)
  })

  it('OrbVoiceHead exposes living ORB presence hooks and state-driven motion', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const core = read('components/orb-residential/orb-voice-core.tsx')
    const css = read('components/orb-residential/orb-voice.css')

    assert.match(head, /--orb-voice-core-scale/)
    assert.match(head, /--orb-voice-core-brightness/)
    assert.match(head, /--orb-voice-hue-shift/)
    assert.match(head, /--orb-voice-aura-opacity/)
    assert.match(core, /data-orb-voice-breathe/)
    assert.match(core, /data-orb-voice-head-motion/)
    assert.match(core, /data-orb-voice-core-sphere/)

    assert.match(css, /orb-voice-core-breathe/)
    assert.match(css, /--orb-voice-speech-energy/)
    assert.match(css, /--orb-voice-core-scale/)
    assert.match(css, /--orb-voice-core-brightness/)
    assert.match(css, /--orb-voice-hue-shift/)
    assert.match(css, /--orb-voice-aura-opacity/)
    assert.match(css, /orb-voice-core-waveform-fallback/)
    assert.match(css, /orb-voice-core-speak-fallback/)
    assert.match(css, /\[data-orb-voice-state='idle'\]/)
    assert.match(css, /\[data-orb-voice-state='listening'\]/)
    assert.match(css, /\[data-orb-voice-state='thinking'\]/)
    assert.match(css, /\[data-orb-voice-state='speaking'\]/)
    assert.match(css, /\[data-orb-voice-state='paused'\]/)
    assert.match(css, /\[data-orb-voice-attention='engaged'\]/)
    assert.match(css, /orb-voice-core-listen-ring/)
    assert.match(css, /orb-voice-core-settle/)
    assert.match(css, /\.orb-voice-core__sphere/)
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

  it('hero companion keeps core shell and waveform markers without mini/mobile classes', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const core = read('components/orb-residential/orb-voice-core.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')

    assert.match(hero, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.match(head, /data-orb-voice-head-shell/)
    assert.match(head, /OrbVoiceCore/)
    assert.match(core, /data-orb-voice-waveform/)
    assert.doesNotMatch(head, /OrbVoiceAvatarRig/)
    assert.doesNotMatch(
      station,
      /size="mini"|size="mobile-preview"|size="preview"/
    )
  })

  it('voice head uses dedicated living core — not legacy chat sphere classes', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const core = read('components/orb-residential/orb-voice-core.tsx')
    const css = read('components/orb-residential/orb-voice.css')
    assert.doesNotMatch(head, /orb-living-sphere/)
    assert.doesNotMatch(head, /className=.*orb-sphere/)
    assert.doesNotMatch(head, /orb-presence--voice/)
    assert.match(core, /orb-voice-core__sphere/)
    assert.match(css, /\.orb-voice-companion \.orb-living-sphere[\s\S]*display:\s*none/)
    assert.match(css, /\.orb-voice-core__sphere/)
    assert.match(css, /\.orb-voice-core__asset-img/)
    assert.match(css, /border-radius: 50%/)
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

  it('voice head CSS targets living ORB core with state styling', () => {
    const css = read('components/orb-residential/orb-voice.css')
    assert.match(css, /\.orb-voice-core__swirl/)
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
    assert.match(content, /cta=\{/)
    assert.doesNotMatch(hero, /OrbVoiceStatePanel/)
    assert.doesNotMatch(hero, /data-orb-voice-state-panel/)
  })

  it('login screen uses front-door-v6 marker', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(visualBuild, /ORB_LOGIN_VERSION = 'front-door-v6'/)
    assert.match(login, /data-orb-login-version=\{ORB_LOGIN_VERSION\}/)
  })

  it('orb voice core base assets exist for transparent sphere rendering', () => {
    assert.ok(existsSync(join(root, 'public/assets/orb/orb-voice-core-base.png')))
    assert.ok(existsSync(join(root, 'public/assets/orb/orb-voice-core-base.webp')))
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
