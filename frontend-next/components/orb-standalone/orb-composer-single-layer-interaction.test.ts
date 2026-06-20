import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function countMatches(source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length
}

describe('ORB mobile composer single-layer interaction audit', () => {
  it('care companion mounts exactly one standalone composer', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.equal(countMatches(companion, /<OrbStandaloneComposer\b/g), 1)
    assert.equal(countMatches(companion, /data-orb-standalone-composer/g), 0)
  })

  it('mobile branch renders one plus button and no desktop OrbComposerPlusMenu', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const mobileBranch =
      composer.match(/onPlusMenuAction \?[\s\S]*?mobileViewport \?\s*\([\s\S]*?\)\s*:\s*\(/)?.[0] ?? ''
    assert.match(composer, /data-orb-composer-plus-button/)
    assert.doesNotMatch(mobileBranch, /OrbComposerPlusMenu/)
    assert.match(composer, /OrbComposerPlusMenu/)
  })

  it('mobile attachment menu mounts only from composer when mobileViewport and onPlusMenuAction', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.equal(countMatches(composer, /<OrbResidentialComposerToolsSheet\b/g), 1)
    assert.equal(countMatches(companion, /OrbResidentialComposerToolsSheet/g), 0)
    assert.match(composer, /mobileViewport && onPlusMenuAction \?/)
  })

  it('focus handler is on textarea only, not composer glass or input column wrapper', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /onClick=\{compactResidential \? focusComposerInput : undefined\}/)
    assert.doesNotMatch(composer, /data-orb-composer-card[\s\S]{0,200}onClick=\{focusComposerInput\}/)
    assert.doesNotMatch(composer, /data-orb-composer-input-column[\s\S]{0,120}onClick=\{compactResidential \? focusComposerInput/)
    assert.match(composer, /event\.target !== event\.currentTarget/)
  })

  it('plus uses pointer handlers with propagation guards and deferred outside dismiss', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const outside = read('lib/orb/orb-composer-outside-click.ts')
    assert.match(composer, /onPointerDown=\{handlePlusPointerDown\}/)
    assert.match(composer, /onPointerUp=\{handlePlusActivate\}/)
    assert.match(composer, /onTouchStart=\{handlePlusTouchStart\}/)
    assert.match(composer, /shouldDismissComposerAttachmentMenu/)
    assert.match(composer, /deferComposerOutsidePointerArm/)
    assert.match(composer, /addEventListener\('pointerdown', onOutsidePointer, true\)/)
    assert.match(outside, /composedPath/)
    assert.match(outside, /requestAnimationFrame/)
  })

  it('dev-only interaction trace is guarded from production', () => {
    const trace = read('lib/orb/orb-composer-interaction-trace.ts')
    assert.match(trace, /NODE_ENV === 'production'/)
    assert.match(trace, /indicare\.orb\.debug\.interactions/)
    assert.match(trace, /console\.debug\('\[orb-composer-interaction\]'/)
    assert.match(composerRead(), /traceOrbComposerInteraction/)
  })

  it('mobile CSS keeps input column from intercepting rail taps', () => {
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(mobileCss, /\.orb-composer-input-column[\s\S]*pointer-events: none/)
    assert.match(mobileCss, /\.orb-composer-input-column textarea[\s\S]*pointer-events: auto/)
    assert.match(mobileCss, /max-width: calc\(100% - 8\.5rem\)/)
  })

  it('focus guard ignores plus trigger and attachment menu selectors', () => {
    const guard = read('lib/orb/orb-composer-focus-guard.ts')
    assert.match(guard, /data-orb-composer-plus-trigger/)
    assert.match(guard, /data-orb-composer-tools-trigger/)
    assert.match(guard, /data-orb-composer-attach-sheet/)
  })
})

function composerRead() {
  return read('components/orb-standalone/orb-standalone-composer.tsx')
}
