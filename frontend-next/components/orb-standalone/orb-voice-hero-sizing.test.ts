import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const VOICE_UI_FILES = [
  'components/orb-standalone/orb-voice-station.tsx',
  'components/orb-standalone/orb-voice-studio-layout.tsx',
  'components/orb-residential/orb-voice-companion.tsx',
  'components/orb-residential/orb-voice-head.tsx',
  'components/orb-residential/orb-voice.css',
  'components/orb-standalone/orb-voice-studio-layout.css'
] as const

const AUTH_BACKEND_PATTERNS = [/routers\/orb_voice/, /services\/orb_voice/, /billing/]

describe('ORB Voice hero companion sizing contract', () => {
  it('hero companion uses hero size marker and dedicated hero stage', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')

    assert.match(station, /OrbVoiceStationContent/)
    assert.match(hero, /data-orb-voice-hero-stage/)
    assert.match(hero, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.match(head, /data-orb-voice-companion-size=\{resolvedSize\}/)
    assert.match(head, /data-orb-voice-head/)
    assert.match(head, /data-orb-voice-face/)
    assert.match(head, /data-orb-voice-waveform/)
  })

  it('debug showcase components remain available behind debugVisual gate only', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')
    const css = read('components/orb-residential/orb-voice.css')
    const studioCss = read('components/orb-standalone/orb-voice-studio-layout.css')

    assert.match(station, /OrbVoiceDebugVisualShowcase/)
    assert.match(station, /debugVisual \?/)
    assert.match(studio, /OrbVoiceStatePanel/)
    assert.match(studio, /OrbVoiceMobilePreviewStrip/)
    assert.match(studio, /OrbVoiceTrustStrip/)
    assert.match(studio, /data-orb-voice-state-panel/)
    assert.match(studio, /data-orb-voice-mobile-preview/)
    assert.match(studio, /data-orb-voice-trust-cards/)
    assert.match(studioCss, /\[data-orb-voice-hero-stage\]/)
    assert.match(studioCss, /\[data-orb-voice-state-panel\]/)
    assert.match(studioCss, /\.orb-voice-mobile-preview/)
    assert.match(studioCss, /\[data-orb-voice-trust-cards\]/)
    assert.match(css, /\[data-orb-voice-hero-stage\]/)
  })

  it('hero has non-collapsed sizing contract and does not inherit mini/mobile-preview dimensions', () => {
    const css = read('components/orb-residential/orb-voice.css')
    const studioCss = read('components/orb-standalone/orb-voice-studio-layout.css')

    assert.match(css, /\[data-orb-voice-companion-size='hero'\][\s\S]*min-height:\s*300px/)
    assert.match(css, /width:\s*clamp\(260px,\s*30vw,\s*380px\)/)
    assert.match(css, /height:\s*clamp\(300px,\s*42vh,\s*430px\)/)
    assert.match(css, /flex:\s*0\s*0\s*auto/)
    assert.match(css, /\[data-orb-voice-hero-stage\][\s\S]*\[data-orb-voice-companion-size='hero'\]/)
    assert.match(studioCss, /min-height: max\(18\.75rem, 300px\)/)

    const heroBlock = css.match(
      /\[data-orb-voice-companion-size='hero'\][\s\S]*?\/\* ── Mini/
    )?.[0]
    assert.ok(heroBlock, 'expected hero CSS block before mini rules')
    assert.doesNotMatch(heroBlock, /--orb-voice-head-width:\s*4\.75rem/)
    assert.doesNotMatch(heroBlock, /--orb-voice-head-width:\s*3\.25rem/)
    assert.match(heroBlock, /opacity:\s*1/)
    assert.match(heroBlock, /transform:\s*none/)
  })

  it('voice station keeps hero visible and scrolls session body only when needed', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')

    assert.match(content, /orb-voice-station-content__scroll/)
    assert.match(content, /overflow-y-auto/)
    assert.match(station, /OrbVoiceStationContent/)
    assert.doesNotMatch(station, /orb-voice-studio__body/)
    assert.doesNotMatch(station, /orb-voice-studio__workspace/)
  })

  it('voice surfaces do not use GlassOrbMark and auth/backend files were not touched', () => {
    for (const file of VOICE_UI_FILES.filter((f) => f.endsWith('.tsx'))) {
      const source = read(file)
      assert.doesNotMatch(source, /GlassOrbMark/, `${file} must not reference GlassOrbMark`)
    }

    for (const file of VOICE_UI_FILES.filter((f) => f.endsWith('.tsx'))) {
      for (const pattern of AUTH_BACKEND_PATTERNS) {
        assert.doesNotMatch(read(file), pattern, `${file} should remain UI-only`)
      }
    }
  })
})
