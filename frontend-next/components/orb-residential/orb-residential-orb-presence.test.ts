import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential orb presence layout', () => {
  it('OrbPresence exposes canonical variants hero workspace voice dictate avatar compact', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    for (const variant of ['hero', 'workspace', 'voice', 'dictate', 'avatar', 'compact']) {
      assert.match(presence, new RegExp(`'${variant}'`))
      assert.match(presence, new RegExp(`orb-presence--${variant}`))
    }
    assert.match(presence, /data-orb-presence-variant=\{resolvedVariant\}/)
    assert.match(presence, /resolveOrbPresenceVariant/)
    assert.match(presence, /case 'home':[\s\S]*return 'hero'/)
  })

  it('home empty state renders OrbPresence hero variant in document order before copy', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /GlassOrbMark/)
    assert.match(companion, /variant=\{isMobileViewport \? 'compact' : 'hero'\}/)
    assert.match(companion, /data-orb-presence-slot="hero"/)
    assert.match(companion, /data-orb-brand-eyebrow/)
    assert.match(companion, /ORB Residential/)
    assert.match(companion, /data-orb-empty-heading/)
    const orbIdx = companion.indexOf('data-orb-empty-sphere')
    const lineIdx = companion.indexOf('data-orb-brand-eyebrow')
    const headingIdx = companion.indexOf('data-orb-empty-heading')
    assert.ok(orbIdx > -1 && lineIdx > orbIdx && headingIdx > lineIdx)
    assert.doesNotMatch(companion, /md:scale-95/)
  })

  it('voice and dictate use workspace or voice/dictate variants not home hero sizing', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const voiceMobile = read('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const dictateMobile = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(voice, /OrbVoiceStationContent/)
    assert.match(voice, /mapOrbVoiceUiToCompanionState/)
    assert.match(voiceMobile, /OrbVoiceStationContent/)
    assert.match(dictateMobile, /variant="dictate"/)
    assert.doesNotMatch(voice, /variant="hero"/)
  })

  it('chat assistant avatar uses compact avatar variant', () => {
    const hue = read('components/orb-standalone/orb-hue-logo.tsx')
    assert.match(hue, /variant="avatar"/)
    assert.doesNotMatch(hue, /size="sm"/)
  })

  it('living sphere uses CSS gradients and pseudo-elements not static image', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    const sphere = read('components/orb-core/orb-sphere.tsx')
    const premium = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    assert.match(presence, /OrbSphere/)
    assert.doesNotMatch(presence, /OrbBrandImage|orb-brand\.png/)
    assert.match(sphere, /orb-living-sphere/)
    assert.match(premium, /\.orb-living-sphere::before/)
    assert.match(premium, /\.orb-living-sphere::after/)
    assert.match(premium, /@keyframes orb-breathe/)
    assert.match(premium, /@keyframes orb-energy-rotate/)
    assert.match(premium, /prefers-reduced-motion: reduce\)[\s\S]*\.orb-living-sphere::before/)
  })

  it('residential CSS does not hide living sphere or orb-sphere in product', () => {
    const premium = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    const brand = read('app/orb/_legacy-ui-archive/orb-brand-asset.css')
    assert.doesNotMatch(premium, /\.orb-living-sphere\s*\{[^}]*display:\s*none/)
    assert.doesNotMatch(premium, /\.orb-sphere\s*\{[^}]*display:\s*none/)
    assert.doesNotMatch(
      premium.match(/\.orb-presence \.orb-living-sphere\s*\{[^}]+\}/)?.[0] ?? '.orb-presence .orb-living-sphere {}',
      /display:\s*none/
    )
    assert.match(premium, /\.orb-living-sphere[\s\S]*opacity:\s*1/)
    assert.match(brand, /\.orb-brand-image[\s\S]*display:\s*none/)
    assert.doesNotMatch(premium, /\.orb-presence \.orb-sphere-wrap::after[\s\S]*display:\s*none/)
  })

  it('hero and workspace variant sizes stay within mobile/desktop bounds in CSS', () => {
    const premium = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    assert.match(premium, /\.orb-presence--hero[\s\S]*clamp\(8rem/)
    assert.match(premium, /\.orb-presence--hero[\s\S]*9\.75rem/)
    assert.match(premium, /@media \(min-width: 768px\)[\s\S]*\.orb-presence--hero[\s\S]*13\.75rem/)
    assert.match(premium, /\.orb-presence--voice[\s\S]*17\.5rem/)
    assert.match(premium, /@media \(min-width: 768px\)[\s\S]*\.orb-presence--voice[\s\S]*22\.5rem/)
  })

  it('empty state layout uses flex column without absolute orb over heading', () => {
    const premium = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    const mobile = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(premium, /\[data-orb-residential-empty\][\s\S]*gap:/)
    assert.match(premium, /pointer-events:\s*none/)
    assert.doesNotMatch(
      premium.match(/\[data-orb-empty-sphere\][\s\S]{0,200}/)?.[0] ?? '',
      /position:\s*absolute/
    )
    assert.doesNotMatch(mobile, /\[data-orb-empty-sphere\][\s\S]*max-width:\s*6\.5rem/)
  })

  it('light and dark theme both style living sphere with high contrast', () => {
    const premium = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    assert.match(premium, /\.orb-theme-light \.orb-living-sphere/)
    assert.match(premium, /\.orb-theme-dark \.orb-living-sphere/)
    assert.match(premium, /html\[data-orb-residential='1'\] \.orb-living-sphere[\s\S]*visibility:\s*visible/)
  })

  it('ORB_ORB_AUDIT reports visibility overlap static image and failures', () => {
    const audit = read('components/orb-standalone/orb-ui-audit.ts')
    assert.match(audit, /hiddenSphereCount/)
    assert.match(audit, /visibleSphereCount/)
    assert.match(audit, /overlapsMainHeading/)
    assert.match(audit, /staticImageInPresenceCount/)
    assert.match(audit, /failures/)
    assert.match(audit, /boundingBox/)
    assert.match(audit, /data-orb-presence-variant/)
    assert.match(audit, /console\.error\('\[ORB_ORB_AUDIT\] failures:'/)
  })
})
