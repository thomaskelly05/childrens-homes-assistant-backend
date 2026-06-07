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
  it('mobile Voice renders OrbVoiceCompanion with size="hero" inside shared hero stage', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    assert.match(content, /data-orb-voice-mobile/)
    assert.match(hero, /data-orb-voice-hero-stage/)
    assert.match(hero, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.doesNotMatch(hero, /size="mini"/)
    assert.doesNotMatch(hero, /size="mobile-preview"/)
  })

  it('mobile hero has non-collapsed sizing contract separate from debug preview cards', () => {
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
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')

    assert.doesNotMatch(content, /GlassOrbMark/)
    assert.doesNotMatch(content, /OrbSphere/)
    assert.doesNotMatch(head, /orb-living-sphere/)
    assert.doesNotMatch(head, /orb-presence--voice/)
    assert.doesNotMatch(station, /GlassOrbMark/)
    assert.doesNotMatch(station, /OrbSphere/)
  })

  it('desktop and mobile share the same hero stage component', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const css = read('components/orb-residential/orb-voice.css')

    assert.match(station, /OrbVoiceStationContent/)
    assert.match(hero, /data-orb-voice-hero-stage/)
    assert.match(hero, /<OrbVoiceCompanion state=\{companionState\} size="hero"/)
    assert.match(css, /\[data-orb-voice-hero-stage\][\s\S]*width:\s*clamp\(260px,\s*30vw,\s*380px\)/)
  })
})
