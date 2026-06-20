import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB living presence', () => {
  it('maps presence states to orb sphere render states', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    assert.match(presence, /responding: 'speaking'/)
    assert.match(presence, /error: 'offline'/)
    assert.match(presence, /data-orb-presence-state=\{state\}/)
  })

  it('respects prefers-reduced-motion via reduced_motion render state', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    assert.match(presence, /prefers-reduced-motion: reduce/)
    assert.match(presence, /reduced_motion/)
  })

  it('premium tokens style listening thinking and responding living sphere states', () => {
    const css = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    assert.match(css, /\[data-orb-presence-state='listening'\] \.orb-sphere-wrap/)
    assert.match(css, /\[data-orb-presence-state='thinking'\] \.orb-living-sphere/)
    assert.match(css, /\[data-orb-presence-state='responding'\] \.orb-sphere-wrap/)
    assert.match(css, /\.orb-living-sphere/)
  })

  it('appearance control documents time-of-day system mode', () => {
    const control = read('components/orb-standalone/orb-appearance-control.tsx')
    assert.match(control, /time of day/i)
    const hook = read('components/orb-standalone/use-orb-appearance.ts')
    assert.match(hook, /msUntilNextOrbSystemThemeBoundary/)
    assert.doesNotMatch(hook, /prefers-color-scheme/)
  })
})
