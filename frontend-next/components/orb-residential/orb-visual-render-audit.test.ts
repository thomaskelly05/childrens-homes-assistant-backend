import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const ORB_BUILD_VISUAL_VERSION = 'premium-final'
const ORB_CSS_CONTRACT = 'premium-viewport-final'
const ORB_LOGIN_VERSION = 'front-door-v4'
const ORB_VOICE_VERSION = 'living-head-v3'
const ORB_VOICE_COMPONENT_NAME = 'OrbVoiceCompanion'
const ORB_LOGIN_COMPONENT_NAME = 'OrbLoginScreen'
const ORB_CANONICAL_CSS_FILES = [
  'app/orb/orb-desktop.css',
  'app/orb/orb-premium-tokens.css',
  'components/orb/premium/orb-premium-v2.css',
  'components/orb/premium/orb-premium-studio-v3.css',
  'app/orb/orb-dictate-studio-polish.css',
  'app/orb/orb-premium-layout-pass.css',
  'app/orb/orb-brand-asset.css',
  'app/orb/orb-light-layer-fix.css',
  'app/orb/orb-login-center.css',
  'app/orb/orb-mobile.css'
] as const

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

/** CSS import map — single canonical hub: app/orb/layout.tsx */
const ORB_CSS_AUDIT_MAP = [
  {
    file: 'app/orb/orb-desktop.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: ['.orb-main-workspace .orb-voice-room'],
    login: [],
    shell: ['.orb-chat-layout--residential', '[data-orb-shell]'],
    status: 'current'
  },
  {
    file: 'app/orb/orb-premium-tokens.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: ['.orb-presence--voice', '.orb-living-sphere', '.orb-voice-room'],
    login: ['.orb-login-root--light', '.orb-login-panel', '.orb-login-input'],
    shell: ['.orb-chat-sidebar', '.orb-sidebar-rail', '.glass-orb-mark'],
    status: 'current (legacy glass-orb aliases scoped away from voice companion)'
  },
  {
    file: 'components/orb/premium/orb-premium-v2.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: ['.orb-chat-sidebar', '.orb-sidebar-nav-item'],
    status: 'current'
  },
  {
    file: 'components/orb/premium/orb-premium-studio-v3.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: ['.orb-studio-shell'],
    status: 'current'
  },
  {
    file: 'app/orb/orb-dictate-studio-polish.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: [],
    status: 'current'
  },
  {
    file: 'app/orb/orb-premium-layout-pass.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [
      '.orb-voice-companion',
      '.orb-voice-companion__eyes',
      '.orb-voice-companion__head-material',
      '[data-orb-voice-state]',
      '[data-orb-voice-state-panel]',
      '[data-orb-voice-mobile-preview]'
    ],
    login: ['.orb-login-shell', '.orb-login-hero', '[data-orb-login-mobile-hero]'],
    shell: ['html[data-orb-residential] .orb-chat-layout--residential'],
    status: 'current (canonical voice head + login viewport pass)'
  },
  {
    file: 'app/orb/orb-brand-asset.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: ['.orb-presence', '[data-orb-presence-state]'],
    login: [],
    shell: [],
    status: 'current'
  },
  {
    file: 'app/orb/orb-light-layer-fix.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: [],
    shell: [],
    status: 'current (non-residential only)'
  },
  {
    file: 'app/orb/orb-login-center.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: [],
    login: ['.orb-login-shell', '.orb-login-hero-sphere-wrap', '.orb-login-panel'],
    shell: [],
    status: 'current'
  },
  {
    file: 'app/orb/orb-mobile.css',
    importedBy: ['app/orb/layout.tsx'],
    voice: ['[data-orb-voice-mobile]', '.orb-voice-status-slot'],
    login: [],
    shell: ['[data-orb-shell]', '.orb-chat-sidebar'],
    status: 'current'
  },
  {
    file: 'app/globals.css',
    importedBy: ['app/layout.tsx'],
    voice: ['.orb-voice-dock', '.orb-voice-status-slot'],
    login: [],
    shell: ['.orb-chat-sidebar'],
    status: 'current (global foundation; residential layers override)'
  }
] as const

describe('ORB visual render audit', () => {
  it('canonical CSS files are imported only from app/orb/layout.tsx', () => {
    const layout = read('app/orb/layout.tsx')
    for (const file of ORB_CANONICAL_CSS_FILES) {
      const importName = file.replace(/^app\/orb\//, './').replace(/^components\//, '@/components/')
      assert.match(layout, new RegExp(importName.replace(/\./g, '\\.')), `${file} must be imported in orb layout`)
    }
  })

  it('documents CSS audit map entries', () => {
    assert.equal(ORB_CSS_AUDIT_MAP.length, 11)
    for (const entry of ORB_CSS_AUDIT_MAP) {
      assert.ok(entry.file, 'each map entry needs a file path')
      assert.ok(entry.importedBy.length > 0, `${entry.file} must list importers`)
    }
  })

  it('layout exposes visual build version markers', () => {
    const layout = read('app/orb/layout.tsx')
    const theme = read('lib/orb/orb-residential-theme.ts')
    const visualBuild = read('lib/orb/orb-visual-build.ts')
    assert.match(layout, /data-orb-build-visual-version=/)
    assert.match(layout, /data-orb-css-contract=/)
    assert.match(layout, /ORB_BUILD_VISUAL_VERSION/)
    assert.match(layout, /ORB_CSS_CONTRACT/)
    assert.match(visualBuild, new RegExp(`ORB_BUILD_VISUAL_VERSION = '${ORB_BUILD_VISUAL_VERSION}'`))
    assert.match(visualBuild, new RegExp(`ORB_CSS_CONTRACT = '${ORB_CSS_CONTRACT}'`))
    assert.match(theme, /orbBuildVisualVersion/)
    assert.match(theme, /orbCssContract/)
  })

  it('voice companion exposes living-head version marker', () => {
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    assert.match(companion, /data-orb-voice-version=\{ORB_VOICE_VERSION\}/)
    assert.match(companion, /OrbVoiceCompanion/)
    assert.doesNotMatch(companion, /GlassOrbMark/)
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

  it('voice head CSS is custom bust with eyes and state rings — not legacy glass orb', () => {
    const css = read('app/orb/orb-premium-layout-pass.css')
    assert.match(css, /--orb-voice-head-width/)
    assert.match(css, /\.orb-voice-companion__head-material/)
    assert.match(css, /\.orb-voice-companion__eyes/)
    assert.match(css, /\[data-orb-voice-waveform\]/)
    assert.match(css, /\.orb-voice-companion__orbit/)
    assert.match(css, /\.orb-voice-companion__listen-glow/)
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
      'components/orb-standalone/orb-voice-mobile-experience.tsx'
    ]) {
      const source = read(file)
      assert.match(source, /OrbVoiceCompanion/)
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
