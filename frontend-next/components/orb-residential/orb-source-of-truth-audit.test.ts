import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const VOICE_VISUAL_FILES = [
  'components/orb-standalone/orb-voice-station.tsx',
  'components/orb-residential/orb-voice-companion.tsx',
  'components/orb-residential/orb-voice-head.tsx',
  'components/orb-standalone/orb-voice-studio-layout.tsx'
] as const

describe('ORB Residential source-of-truth audit', () => {
  it('canonical voice path is OrbVoiceStation → OrbVoiceCompanion → OrbVoiceHead (not OrbSphere)', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')

    assert.match(station, /OrbVoiceStationContent/)
    assert.match(companion, /OrbVoiceHead/)
    assert.doesNotMatch(station, /OrbSphere/)
    assert.doesNotMatch(station, /OrbPresence/)
    assert.doesNotMatch(station, /GlassOrbMark/)
    assert.doesNotMatch(head, /OrbSphere/)
    assert.doesNotMatch(head, /orb-living-sphere/)
  })

  it('voice visual CSS is owned by OrbVoiceHead and studio layout components', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')
    const layoutPass = read('app/orb/orb-premium-layout-pass.css')
    const companionCss = read('components/orb-residential/orb-voice.css')
    const studioCss = read('components/orb-standalone/orb-voice-studio-layout.css')
    const visualBuild = read('lib/orb/orb-visual-build.ts')

    assert.match(head, /import '\.\/orb-voice\.css'/)
    assert.match(studio, /import '\.\/orb-voice-studio-layout\.css'/)
    assert.match(visualBuild, /ORB_VOICE_CSS_FILE/)
    assert.match(visualBuild, /living-head-v5/)

    assert.match(companionCss, /data-orb-voice-head/)
    assert.match(companionCss, /\.orb-voice-companion__head-material/)
    assert.match(studioCss, /\[data-orb-voice-hero-stage\]/)
    assert.match(studioCss, /min-height: max\(21\.25rem, 340px\)/)

    assert.doesNotMatch(layoutPass, /\.orb-voice-companion__head-material/)
    assert.doesNotMatch(layoutPass, /\[data-orb-voice-companion-size='hero'\]/)
  })

  it('hero sizing contract is non-collapsed and mini/mobile cannot apply globally', () => {
    const css = read('components/orb-residential/orb-voice.css')

    assert.match(css, /width: clamp\(280px,\s*36vw,\s*420px\)/)
    assert.match(css, /height: clamp\(340px,\s*48vh,\s*500px\)/)
    assert.match(css, /min-height: 340px/)
    assert.match(css, /transform: none/)

    assert.doesNotMatch(css, /^\[data-orb-voice-companion-size='mini'\]/m)
    assert.doesNotMatch(css, /^\[data-orb-voice-companion-size='mobile-preview'\]/m)
    assert.match(css, /\[data-orb-voice-state-panel\][\s\S]*mini/)
    assert.match(css, /\[data-orb-voice-mobile-preview\][\s\S]*mobile-preview/)
  })

  it('legacy sphere selectors are neutralised inside voice companion', () => {
    const css = read('components/orb-residential/orb-voice.css')
    assert.match(css, /\.orb-voice-companion \.orb-living-sphere[\s\S]*display:\s*none/)
    assert.match(css, /\.orb-voice-companion \.orb-sphere[\s\S]*display:\s*none/)
    assert.match(css, /\.orb-voice-companion \.orb-presence--voice[\s\S]*display:\s*none/)
  })

  it('/orb and voice use the same shell and component tree', () => {
    const page = read('app/orb/page.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    const care = read('components/orb-standalone/orb-care-companion.tsx')

    assert.match(page, /OrbShell/)
    assert.match(shell, /OrbAuthGate/)
    assert.match(shell, /OrbCareCompanion/)
    assert.match(care, /OrbVoiceStation/)
    assert.match(care, /activePanel === 'orb_voice'/)
  })

  it('login routes converge on OrbLoginScreen front door without legacy voice CSS in orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    const loginPage = read('app/login/page.tsx')
    const orbLoginPage = read('app/orb/login/page.tsx')
    const authGate = read('components/orb-residential/orb-auth-gate.tsx')

    assert.match(loginPage, /redirect/)
    assert.match(orbLoginPage, /redirect/)
    assert.match(authGate, /OrbLoginScreen/)
    assert.doesNotMatch(layout, /indicare-ai/)
    assert.doesNotMatch(layout, /glass-orb-mark--voice/)
  })

  it('debug visual panel exposes hero metrics behind ?debugVisual=1', () => {
    const panel = read('components/orb-residential/orb-visual-debug-panel.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')

    assert.match(panel, /heroWidth/)
    assert.match(panel, /heroHeight/)
    assert.match(panel, /heroOpacity/)
    assert.match(panel, /heroTransform/)
    assert.match(panel, /heroCollapsed/)
    assert.match(panel, /orbSphereInVoice/)
    assert.match(panel, /voiceComponentTree/)
    assert.match(head, /data-orb-voice-visual-authority="OrbVoiceHead"/)
  })

  it('voice visual files remain UI-only (no auth/billing/API edits)', () => {
    const forbidden = [/billing/, /csrf/i, /routers\/orb_voice/]
    for (const file of VOICE_VISUAL_FILES) {
      const source = read(file)
      for (const pattern of forbidden) {
        assert.doesNotMatch(source, pattern, `${file} must stay visual-only`)
      }
    }
  })
})
