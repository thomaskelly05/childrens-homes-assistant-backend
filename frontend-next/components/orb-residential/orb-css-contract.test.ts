import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import postcss from 'postcss'

import {
  ORB_CANONICAL_CSS_FILES,
  ORB_IMPLEMENTATION_CSS_FILES,
  ORB_LAYOUT_CSS_FILES,
  ORB_LEGACY_CSS_PATHS,
  ORB_LOGIN_CSS_FILE,
  ORB_LOGIN_VERSION,
  ORB_STYLE_VERSION,
  ORB_VOICE_CSS_FILE,
  ORB_VOICE_VERSION
} from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function resolveCssPath(relativePath: string): string {
  return join(root, relativePath)
}

async function parseCssFile(relativePath: string): Promise<void> {
  const absolutePath = resolveCssPath(relativePath)
  assert.ok(existsSync(absolutePath), `${relativePath} must exist`)
  const source = read(relativePath)
  try {
    await postcss().process(source, { from: absolutePath })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${relativePath} failed CSS parse: ${message}`)
  }
}

describe('ORB CSS parse and import contract', () => {
  it('all canonical ORB CSS files parse successfully', async () => {
    for (const file of ORB_CANONICAL_CSS_FILES) {
      await parseCssFile(file)
    }
  })

  it('/orb layout imports only approved canonical ORB CSS files', () => {
    const layout = read('app/orb/layout.tsx')
    const importMatches = [...layout.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map((match) => match[1])

    assert.deepEqual(importMatches, [
      './orb-theme.css',
      './orb-components.css',
      './orb-shell.css',
      './orb-stations.css',
      './orb-login.css'
    ])

    for (const legacy of ORB_LEGACY_CSS_PATHS) {
      assert.doesNotMatch(layout, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('canonical layout layers aggregate implementation modules', () => {
    const theme = read('app/orb/orb-theme.css')
    const components = read('app/orb/orb-components.css')
    const shell = read('app/orb/orb-shell.css')
    const stations = read('app/orb/orb-stations.css')

    for (const file of ['orb-premium-tokens.css', 'orb-brand-asset.css']) {
      assert.match(theme, new RegExp(`@import\\s+['"]\\./${file}['"]`))
    }
    assert.match(components, /@import\s+['"]@\/components\/orb\/premium\/orb-premium-v2\.css['"]/)
    for (const file of ['orb-desktop.css', 'orb-premium-layout-pass.css', 'orb-mobile.css']) {
      assert.match(shell, new RegExp(`@import\\s+['"]\\./${file}['"]`))
    }
    assert.match(shell, /@import\s+['"]@\/components\/orb\/premium\/orb-premium-studio-v3\.css['"]/)
    for (const file of ['orb-dictate-studio-polish.css', 'orb-light-layer-fix.css']) {
      assert.match(stations, new RegExp(`@import\\s+['"]\\./${file}['"]`))
    }

    assert.equal(ORB_LAYOUT_CSS_FILES.length, 5)
    assert.equal(ORB_IMPLEMENTATION_CSS_FILES.length, 9)
  })

  it('no legacy indicare-ai voice CSS is imported into /orb', () => {
    const layout = read('app/orb/layout.tsx')
    const voiceCompanion = read('components/orb-residential/orb-voice-companion.tsx')
    const voiceStation = read('components/orb-standalone/orb-voice-station.tsx')

    for (const source of [layout, voiceCompanion, voiceStation]) {
      assert.doesNotMatch(source, /indicare-ai/)
      assert.doesNotMatch(source, /indicare\/orb\/.*\.css/)
    }
  })

  it('voice hero has viewport-scaled mobile sizing in orb-voice.css', () => {
    const css = read(ORB_VOICE_CSS_FILE)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\]/)
    assert.match(css, /--orb-voice-hero-available-h/)
    assert.match(css, /\[data-orb-voice-mobile-hero-stage\][\s\S]*min-height:\s*0/)
    assert.match(css, /flex-shrink:\s*0/)
    assert.match(css, /max-height:\s*none/)
    assert.match(css, /transform:\s*none/)
  })

  it('voice does not render GlassOrbMark or OrbSphere in station components', () => {
    for (const file of [
      'components/orb-standalone/orb-voice-station.tsx',
      'components/orb-standalone/orb-voice-mobile-experience.tsx',
      'components/orb-residential/orb-voice-companion.tsx'
    ]) {
      const source = read(file)
      assert.doesNotMatch(source, /GlassOrbMark/)
      assert.doesNotMatch(source, /OrbSphere/)
    }

    const css = read(ORB_VOICE_CSS_FILE)
    assert.match(css, /\.orb-voice-companion \.orb-living-sphere[\s\S]*display:\s*none/)
    assert.match(css, /\.orb-voice-companion \.orb-sphere[\s\S]*display:\s*none/)
  })

  it('login uses canonical login CSS and front-door version marker', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const layout = read('app/orb/layout.tsx')

    assert.match(layout, /import '\.\/orb-login\.css'/)
    assert.match(login, /data-orb-login-version=\{ORB_LOGIN_VERSION\}/)
    assert.match(login, new RegExp(`ORB_LOGIN_VERSION`))
    assert.equal(ORB_LOGIN_VERSION, 'front-door-v5')
    assert.equal(ORB_LOGIN_CSS_FILE, 'app/orb/orb-login.css')
  })

  it('layout and voice expose orb-style-v1 and living-core-v1 version markers', () => {
    const layout = read('app/orb/layout.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const visualBuild = read('lib/orb/orb-visual-build.ts')

    assert.match(layout, /data-orb-style-version=\{ORB_STYLE_VERSION\}/)
    assert.match(head, /data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(visualBuild, new RegExp(`ORB_STYLE_VERSION = '${ORB_STYLE_VERSION}'`))
    assert.match(visualBuild, new RegExp(`ORB_VOICE_VERSION = '${ORB_VOICE_VERSION}'`))
  })
})
