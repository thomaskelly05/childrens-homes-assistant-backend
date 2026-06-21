import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_V2_PLACEHOLDER_HOME,
  ORB_HOME_SAFETY_LINE,
  ORB_HOME_V2_HEADLINE
} from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { DEFAULT_HEAP_MB } from '../../scripts/render-safe-next-build.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const repoRoot = join(root, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readRepo(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('ORB Residential Phase 3I.1 deploy memory rescue', () => {
  it('build version marker is phase-3t-dictate-transcript-data-flow', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3t-dictate-transcript-data-flow')
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('layout imports only the canonical ORB residential shell CSS', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-login\.css|_legacy-ui-archive/)
  })

  it('runtime ORB files do not import legacy archive or phase test modules', () => {
    const runtimePaths = [
      'components/orb-standalone/orb-care-companion.tsx',
      'components/orb-standalone/orb-standalone-composer.tsx',
      'components/orb-residential/orb-residential-sidebar.tsx',
      'app/orb/layout.tsx',
      'app/orb/page.tsx'
    ]
    for (const path of runtimePaths) {
      const source = read(path)
      assert.doesNotMatch(source, /_legacy-ui-archive/)
      assert.doesNotMatch(source, /orb-flagship-phase-.*\.test/)
      assert.doesNotMatch(source, /\.test\.(ts|tsx)['"]/)
    }
  })

  it('Render and package config use memory-safe production build command', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    assert.match(pkg.scripts.build, /render-safe-next-build/)
    assert.match(pkg.scripts['build:render'], /render-safe-next-build/)
    const renderYaml = readRepo('render.yaml')
    assert.match(renderYaml, /npm ci --omit=optional && npm run build:render/)
    assert.match(renderYaml, /--max-old-space-size=3072/)
    assert.equal(DEFAULT_HEAP_MB, 3072)
  })

  it('next config disables expensive build-time checks and limits webpack memory', () => {
    const nextConfig = read('next.config.ts')
    assert.match(nextConfig, /productionBrowserSourceMaps:\s*false/)
    assert.match(nextConfig, /typescript:\s*\{[\s\S]*ignoreBuildErrors:\s*true/)
    assert.match(nextConfig, /cpus:\s*1/)
    assert.match(nextConfig, /config\.parallelism\s*=\s*1/)
    assert.match(nextConfig, /webpack\.IgnorePlugin/)
  })

  it('Phase 3I calm home copy and empty-state behaviour remain intact', () => {
    assert.equal(ORB_HOME_V2_HEADLINE, 'What do you need help thinking through?')
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_HOME, /Ask ORB what you need help thinking through/)
    assert.match(ORB_HOME_SAFETY_LINE, /ORB supports professional judgement/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /OrbHomeStartRow/)
    assert.doesNotMatch(companion, /data-orb-home-start-with/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /showEmptyState \?/)
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /homeEmptyCalm = compactResidential && !chatHasMessages/)
    assert.match(composer, /showComposerQuickActions[\s\S]*!residentialSurface/)
  })
})
