import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { DEFAULT_HEAP_MB } from '../../scripts/render-safe-next-build.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5E Render build memory fix', () => {
  it('Render build memory lazy-load contract remains', () => {
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5e-render-build-memory-fix|phase-5f-voice-v2-microphone-transition|phase-5h-voice-v2-specialist-brain/)
  })

  it('Voice v2 clickable idle fix remains intact', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(station, /useOrbVoiceV2/)
    assert.match(station, /traceOrbVoiceV2StartClick/)
    assert.match(station, /data-orb-voice-controls/)
    assert.match(css, /phase-5d-voice-v2-clickable-idle/)
    assert.match(css, /pointer-events:\s*none/)
    assert.match(css, /orb-voice-controls[\s\S]*z-index:\s*5/)
  })

  it('active Voice station does not import legacy Voice modules', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.doesNotMatch(station, /use-standalone-orb-voice/)
    assert.doesNotMatch(station, /orb-voice-live-panel/)
    assert.doesNotMatch(station, /orb-voice-after-call-panel/)
    assert.doesNotMatch(station, /orb-voice-human-conversation/)
    assert.match(station, /voice-v2\/use-orb-voice-v2/)
  })

  it('/orb shell lazy-loads care companion and heavy stations', () => {
    const shell = read('components/orb/orb-shell.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(shell, /import dynamic from 'next\/dynamic'/)
    assert.match(shell, /import\('@\/components\/orb-standalone\/orb-care-companion'\)/)
    assert.doesNotMatch(
      shell,
      /^import\s+\{\s*OrbCareCompanion\s*\}\s+from\s+['"]@\/components\/orb-standalone\/orb-care-companion['"]/m
    )
    for (const station of [
      'orb-voice-station',
      'orb-dictate-station',
      'orb-write-standalone-panel',
      'orb-communicate-station',
      'orb-voice-settings-panel',
      'orb-write-template-picker',
      'orb-agent-panel',
      'orb-review-panel'
    ]) {
      assert.match(companion, new RegExp(`import\\('@\\/components\\/[^']*${station}'\\)`))
      assert.doesNotMatch(
        companion,
        new RegExp(`^import\\s+\\{[^}]*\\}\\s+from\\s+['"]@/components/[^'"]*${station}['"]`, 'm')
      )
    }
  })

  it('runtime ORB files do not import test modules', () => {
    const runtimePaths = [
      'components/orb/orb-shell.tsx',
      'components/orb-standalone/orb-care-companion.tsx',
      'components/orb-standalone/orb-voice-station.tsx',
      'app/orb/layout.tsx',
      'app/orb/page.tsx'
    ]
    for (const path of runtimePaths) {
      const source = read(path)
      assert.doesNotMatch(source, /\.test\.(ts|tsx)['"]/)
      assert.doesNotMatch(source, /orb-flagship-phase-.*\.test/)
    }
  })

  it('Render build uses memory-safe heap and webpack cache disabled', () => {
    const nextConfig = read('next.config.ts')
    assert.match(nextConfig, /config\.cache\s*=\s*false/)
    assert.match(nextConfig, /webpackMemoryOptimizations:\s*true/)
    assert.equal(DEFAULT_HEAP_MB, 2560)
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    assert.match(pkg.scripts.build, /render-safe-next-build/)
  })

  it('layout keeps single CSS import and no compliance guarantee language', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(layout, /guarantee|compliant|certified/i)
  })
})
