import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const ORB_BUILD_VISUAL_VERSION = 'premium-final'
const ORB_STYLE_VERSION = 'orb-style-v1'
const ORB_CSS_CONTRACT = 'premium-viewport-final'
const ORB_LOGIN_VERSION = 'front-door-v6'
const ORB_VOICE_VERSION = 'living-core-v1'
const ORB_VOICE_COMPONENT_NAME = 'OrbVoiceCompanion'
const ORB_LOGIN_COMPONENT_NAME = 'OrbLoginScreen'
const ORB_LAYOUT_CSS_FILES = [
  'app/orb/orb-theme.css',
  'app/orb/orb-components.css',
  'app/orb/orb-shell.css',
  'app/orb/orb-stations.css',
  'app/orb/orb-login.css'
] as const

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

/** CSS import map — canonical hub: app/orb/layout.tsx + component co-located CSS */
const ORB_CSS_AUDIT_MAP = [
  {
    file: 'app/orb/orb-theme.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: [],
    status: 'canonical (tokens layer)'
  },
  {
    file: 'app/orb/orb-components.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: ['.orb-chat-sidebar', '.orb-sidebar-nav-item'],
    status: 'canonical (components layer)'
  },
  {
    file: 'app/orb/orb-shell.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: ['.orb-main-workspace .orb-voice-room', '[data-orb-voice-mobile]'],
    login: ['.orb-login-shell', '.orb-login-hero', '[data-orb-login-mobile-brand]'],
    shell: ['.orb-chat-layout--residential', '[data-orb-shell]'],
    status: 'canonical (shell layer)'
  },
  {
    file: 'app/orb/orb-stations.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: [],
    status: 'canonical (shared station polish)'
  },
  {
    file: 'app/orb/orb-login.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: ['.orb-login-shell', '.orb-login-hero-sphere-wrap', '.orb-login-panel'],
    shell: [],
    status: 'canonical (login visual authority)'
  },
  {
    file: 'app/orb/orb-premium-tokens.css',
    importedBy: ['app/orb/orb-theme.css'],
    voice: ['.orb-presence--voice', '.orb-living-sphere', '.orb-voice-room'],
    login: ['.orb-login-root--light', '.orb-login-panel', '.orb-login-input'],
    shell: ['.orb-chat-sidebar', '.orb-sidebar-rail', '.glass-orb-mark'],
    status: 'supporting (legacy glass-orb aliases scoped away from voice companion)'
  },
  {
    file: 'components/orb/premium/orb-premium-v2.css',
    importedBy: ['app/orb/orb-components.css'],
    voice: [],
    login: [],
    shell: ['.orb-chat-sidebar', '.orb-sidebar-nav-item'],
    status: 'supporting'
  },
  {
    file: 'components/orb/premium/orb-premium-studio-v3.css',
    importedBy: ['app/orb/orb-shell.css'],
    voice: [],
    login: [],
    shell: ['.orb-studio-shell'],
    status: 'supporting'
  },
  {
    file: 'app/orb/orb-dictate-studio-polish.css',
    importedBy: ['app/orb/orb-stations.css'],
    voice: [],
    login: [],
    shell: [],
    status: 'supporting (dictate station)'
  },
  {
    file: 'app/orb/orb-premium-layout-pass.css',
    importedBy: ['app/orb/orb-shell.css'],
    voice: [],
    login: ['.orb-login-shell', '.orb-login-hero', '[data-orb-login-mobile-brand]'],
    shell: ['html[data-orb-residential] .orb-chat-layout--residential'],
    status: 'supporting (viewport pass — voice visuals in orb-voice.css)'
  },
  {
    file: 'components/orb-residential/orb-voice.css',
    importedBy: ['components/orb-residential/orb-voice-head.tsx'],
    voice: [
      '.orb-voice-companion',
      '.orb-voice-core__sphere',
      '[data-orb-voice-head]',
      '[data-orb-voice-companion-size="hero"]'
    ],
    login: [],
    shell: [],
    status: 'canonical (voice head visual authority)'
  },
  {
    file: 'components/orb-standalone/orb-voice-studio-layout.css',
    importedBy: ['components/orb-standalone/orb-voice-studio-layout.tsx'],
    voice: [
      '[data-orb-voice-station-content]',
      '[data-orb-voice-hero-stage]',
      '[data-orb-voice-state-panel]',
      '[data-orb-voice-mobile-preview]'
    ],
    login: [],
    shell: [],
    status: 'supporting (voice studio layout + hero containment)'
  },
  {
    file: 'app/orb/orb-brand-asset.css',
    importedBy: ['app/orb/orb-theme.css'],
    voice: ['.orb-presence', '[data-orb-presence-state]'],
    login: [],
    shell: [],
    status: 'supporting'
  },
  {
    file: 'app/orb/orb-light-layer-fix.css',
    importedBy: ['app/orb/orb-stations.css'],
    voice: [],
    login: [],
    shell: [],
    status: 'supporting (non-residential only)'
  },
  {
    file: 'app/orb/orb-mobile.css',
    importedBy: ['app/orb/orb-shell.css'],
    voice: ['[data-orb-voice-mobile]', '.orb-voice-status-slot'],
    login: [],
    shell: ['[data-orb-shell]', '.orb-chat-sidebar'],
    status: 'supporting'
  },
  {
    file: 'app/globals.css',
    importedBy: ['app/layout.tsx'],
    voice: ['.orb-voice-dock', '.orb-voice-status-slot'],
    login: [],
    shell: ['.orb-chat-sidebar'],
    status: 'legacy (global foundation; residential layers override)'
  }
] as const

describe('ORB visual render audit', () => {
  it('canonical layout CSS files are imported from orb layout; voice CSS from components', () => {
    const layout = read('app/orb/layout.tsx')
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const studio = read('components/orb-standalone/orb-voice-studio-layout.tsx')

    for (const file of ORB_LAYOUT_CSS_FILES) {
      const importName = file.replace(/^app\/orb\//, './')
      assert.match(layout, new RegExp(importName.replace(/\./g, '\\.')), `${file} must be imported in orb layout`)
    }

    assert.match(head, /import '\.\/orb-voice\.css'/)
    assert.match(studio, /import '\.\/orb-voice-studio-layout\.css'/)
  })

  it('documents CSS audit map entries', () => {
    assert.equal(ORB_CSS_AUDIT_MAP.length, 16)
    for (const entry of ORB_CSS_AUDIT_MAP) {
      assert.ok(entry.file, 'each map entry needs a file path')
      assert.ok(entry.importedBy.length > 0, `${entry.file} must list importers`)
    }
  })

  it('layout exposes visual build version markers', () => {
    const layout = read('app/orb/layout.tsx')
    const theme = read('lib/orb/orb-residential-theme.ts')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(layout, /data-orb-style-version=/)
    assert.match(layout, /data-orb-build-visual-version=/)
    assert.match(layout, /data-orb-css-contract=/)
    assert.match(layout, /ORB_STYLE_VERSION/)
    assert.match(layout, /ORB_BUILD_VISUAL_VERSION/)
    assert.match(layout, /ORB_CSS_CONTRACT/)
    assert.match(visualBuild, new RegExp(`ORB_STYLE_VERSION = '${ORB_STYLE_VERSION}'`))
    assert.match(visualBuild, new RegExp(`ORB_BUILD_VISUAL_VERSION = '${ORB_BUILD_VISUAL_VERSION}'`))
    assert.match(visualBuild, new RegExp(`ORB_CSS_CONTRACT = '${ORB_CSS_CONTRACT}'`))
    assert.match(theme, /orbStyleVersion/)
    assert.match(theme, /orbBuildVisualVersion/)
    assert.match(theme, /orbCssContract/)
  })

  it('voice companion exposes living-head version marker', () => {
    const head = read('components/orb-residential/orb-voice-head.tsx')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    assert.match(head, /data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(companion, /OrbVoiceHead/)
    assert.doesNotMatch(head, /GlassOrbMark/)
  })

  it('login screen exposes front-door version marker', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /data-orb-login-version=\{ORB_LOGIN_VERSION\}/)
    assert.match(login, /OrbLoginScreen/)
  })

  it('debug visual panel mounts on /orb when ?debugVisual=1', () => {
    const page = read('app/orb/page.tsx')
    const panel = read('components/orb-residential/orb-visual-debug-panel.tsx')
    assert.match(page, /OrbVisualDebugPanel/)
    assert.match(panel, /debugVisual/)
    assert.match(panel, /ORB_VOICE_COMPONENT_NAME/)
    assert.match(panel, /ORB_LOGIN_COMPONENT_NAME/)
  })

  it('voice head CSS is living ORB core with state rings — not legacy glass orb', () => {
    const css = read('components/orb-residential/orb-voice.css')
    assert.match(css, /--orb-voice-head-width/)
    assert.match(css, /\.orb-voice-core__sphere/)
    assert.match(css, /\.orb-voice-core__listen-ring/)
    assert.match(css, /\[data-orb-voice-waveform\]/)
    assert.match(css, /\.orb-voice-core__swirl/)
    assert.match(css, /\[data-glass-orb-mark\]/)
    assert.doesNotMatch(css, /\.glass-orb-mark--voice \.glass-orb-mark__sphere/)
  })

  it('legacy glass-orb voice sizing cannot override orb-presence--voice companion', () => {
    const tokens = read('app/orb/orb-premium-tokens.css')
    assert.match(tokens, /\.orb-presence\.glass-orb-mark--voice:not\(\.orb-presence--voice\)/)
  })

  it('voice render paths use OrbVoiceCompanion not GlassOrbMark', () => {
    for (const file of [
      'components/orb-standalone/orb-voice-station.tsx',
      'components/orb-standalone/orb-voice-station-content.tsx',
      'components/orb-standalone/orb-voice-hero-stage.tsx'
    ]) {
      const source = read(file)
      assert.match(source, /OrbVoiceCompanion|OrbVoiceHeroStage|OrbVoiceStationContent/)
      assert.doesNotMatch(source, /GlassOrbMark/)
    }
  })

  it('login routes redirect to embedded /orb front door', () => {
    const loginPage = read('app/login/page.tsx')
    const orbLoginPage = read('app/orb/login/page.tsx')
    assert.match(loginPage, /redirect/)
    assert.match(orbLoginPage, /redirect/)
    assert.match(read('components/orb-residential/orb-auth-gate.tsx'), /OrbLoginScreen/)
  })
})
