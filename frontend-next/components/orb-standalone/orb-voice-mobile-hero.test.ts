import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice mobile hero companion', () => {
  it('mobile Voice renders OrbVoiceCompanion with size="hero" inside mobile hero stage', () => {
    const mobile = read('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.match(mobile, /data-orb-voice-mobile-hero-stage/)
    assert.match(mobile, /<OrbVoiceCompanion state=\{resolvedCompanionState\} size="hero"/)
    assert.doesNotMatch(mobile, /size="mini"/)
    assert.doesNotMatch(mobile, /size="mobile-preview"/)
  })

  it('mobile hero has non-collapsed sizing contract separate from desktop hero', () => {
    const css = read('components/orb-residential/orb-voice.css')
    const studioCss = read('components/orb-standalone/orb-voice-studio-layout.css')

    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*width:\s*clamp\(13rem,\s*58vw,\s*19rem\)/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*height:\s*clamp\(15rem,\s*34vh,\s*24rem\)/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*min-height:\s*15rem/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*flex:\s*0\s*0\s*auto/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*opacity:\s*1/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*transform:\s*none/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*z-index:\s*2/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*overflow:\s*visible/)

    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*\[data-orb-voice-head\][\s\S]*min-height:\s*9rem/)
    assert.match(studioCss, /\[data-orb-voice-mobile-hero-stage\]/)

    const mobileHeroBlock = css.match(
      /\/\* ── Mobile hero[\s\S]*?@media \(prefers-reduced-motion/
    )?.[0]
    assert.ok(mobileHeroBlock, 'expected mobile hero CSS block')
    assert.doesNotMatch(mobileHeroBlock, /--orb-voice-head-width:\s*3\.25rem/)
    assert.doesNotMatch(mobileHeroBlock, /--orb-voice-head-width:\s*4\.75rem/)
    assert.doesNotMatch(mobileHeroBlock, /mix-blend-mode:\s*screen/)
  })

  it('mobile hero does not use GlassOrbMark or OrbSphere', () => {
    const mobile = read('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')

    assert.doesNotMatch(mobile, /GlassOrbMark/)
    assert.doesNotMatch(mobile, /OrbSphere/)
    assert.doesNotMatch(mobile, /orb-living-sphere/)
    assert.doesNotMatch(mobile, /orb-presence--voice/)

    const mobileBranch = station.match(
      /isMobileViewport \?[\s\S]*?data-orb-desktop-branch="active"/
    )?.[0]
    assert.ok(mobileBranch, 'expected mobile branch in voice station')
    assert.doesNotMatch(mobileBranch, /GlassOrbMark/)
    assert.doesNotMatch(mobileBranch, /OrbSphere/)
  })

  it('desktop Voice studio hero stage remains unchanged', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const studioCss = read('components/orb-standalone/orb-voice-studio-layout.css')
    const css = read('components/orb-residential/orb-voice.css')

    assert.match(station, /data-orb-voice-hero-stage/)
    assert.match(station, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.match(studioCss, /\[data-orb-voice-hero-stage\][\s\S]*min-height: max\(18\.75rem, 300px\)/)
    assert.match(css, /\[data-orb-voice-hero-stage\][\s\S]*width:\s*clamp\(260px,\s*30vw,\s*380px\)/)
    assert.doesNotMatch(station, /data-orb-voice-mobile-hero-stage/)
  })
})
