import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_HOME_SAFETY_LINE } from '../../lib/orb/orb-residential-shell-copy.ts'
import {
  ORB_RESIDENTIAL_BILLING_HEADER,
  ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS,
  ORB_RESIDENTIAL_BILLING_SUBTITLE,
  ORB_VOICE_STATUS_CARD_COPY,
  ORB_VOICE_V2_PROMPT,
  ORB_VOICE_V2_TITLE
} from '../../lib/orb/orb-residential-ui-copy.ts'
import { ORB_VISIBLE_SIDEBAR_NAV } from '../../lib/orb/orb-user-facing-names.ts'
import {
  ORB_ARCHIVED_PHASE_CSS_FILES,
  ORB_LAYOUT_CSS_FILES,
  ORB_LEGACY_CSS_PATHS
} from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const BANNED_SHELL_PATTERNS = [
  'orb-flagship-shell',
  'orb-full-viewport-shell',
  'orb-full-viewport-workspace',
  'orb-residential-app-shell',
  'orb-residential-app-shell__workspace',
  'orb-chat-shell',
  'orb-chat-sidebar',
  'orb-chat-main',
  'orb-residential-sidebar-v2',
  'orb-composer-v2-dock',
  'orb-full-viewport-composer-dock',
  'orb-login-flagship-shell',
  'orb-login-full-viewport-shell',
  'orb-login-enterprise',
  'orb-product-modal-v2',
  'orb-showstopper',
  'orb-flagship',
  'orb-convergence',
  'orb-full-viewport',
  'orb-flagship-records-empty',
  'orb-flagship-guided-demo'
] as const

const BANNED_MOBILE_CSS_PATTERNS = [
  '.orb-chat-shell',
  '.orb-chat-sidebar',
  '.orb-chat-main',
  'orb-full-viewport-',
  'orb-flagship-',
  'orb-residential-app-shell',
  'orb-composer-v2'
] as const

const BANNED_USER_LABELS = [
  'Saved Outputs',
  'Magic Notes',
  'Shift Builder',
  'Export coming soon',
  'Templates',
  'Documents'
] as const

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function usesLegacyShellPattern(source: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const classPattern = new RegExp(`(className|class=)[^\\n]*${escaped}`)
  const dataPattern = new RegExp(`data-orb-${escaped}(?:[^a-z0-9-]|$)`)
  return classPattern.test(source) || dataPattern.test(source)
}

function listTsxUnder(dir: string): string[] {
  const base = join(root, dir)
  const out: string[] = []
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    const rel = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== '_legacy-ui-archive' && entry.name !== 'node_modules') {
      out.push(...listTsxUnder(rel))
    } else if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) {
      out.push(rel)
    }
  }
  return out
}

describe('ORB Residential Phase 1K blank canvas reset', () => {
  it('/app/orb/layout.tsx imports only allowed CSS files', () => {
    const layout = read('app/orb/layout.tsx')
    const imports = [...layout.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map((m) => m[1])
    assert.deepEqual(imports, ['./orb-residential-shell.css'])
    assert.deepEqual([...ORB_LAYOUT_CSS_FILES], ['app/orb/orb-residential-shell.css'])
  })

  it('legacy phase CSS files are archived and not in active app/orb root', () => {
    for (const archived of ORB_ARCHIVED_PHASE_CSS_FILES) {
      assert.ok(existsSync(join(root, archived)), `${archived} should exist in archive`)
      const basename = archived.split('/').pop()!
      assert.ok(
        !existsSync(join(root, 'app/orb', basename)),
        `${basename} must not remain in active app/orb`
      )
    }
    for (const legacy of ORB_LEGACY_CSS_PATHS) {
      assert.doesNotMatch(read('app/orb/layout.tsx'), new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('no active residential component uses legacy shell classes', () => {
    const targets = [
      ...listTsxUnder('components/orb-residential'),
      ...listTsxUnder('components/orb-standalone'),
      ...listTsxUnder('components/orb'),
      'components/orb/orb-layout.tsx'
    ]
    for (const file of targets) {
      const source = read(file)
      for (const pattern of BANNED_SHELL_PATTERNS) {
        assert.ok(
          !usesLegacyShellPattern(source, pattern),
          `${file} must not use ${pattern}`
        )
      }
    }
  })

  it('orb-residential-shell.css mobile rules use canonical classes only', () => {
    const css = read('app/orb/orb-residential-shell.css')
    for (const pattern of BANNED_MOBILE_CSS_PATTERNS) {
      assert.doesNotMatch(css, new RegExp(pattern), `shell CSS must not reference ${pattern}`)
    }
    assert.match(css, /\.orb-app-shell/)
    assert.match(css, /\.orb-sidebar/)
    assert.match(css, /\.orb-main/)
    assert.match(css, /\.orb-composer-dock/)
    assert.match(css, /\.orb-login-shell/)
  })

  it('OrbCareCompanion owns exactly one orb-app-shell', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const matches = companion.match(/className=\{`[^`]*orb-app-shell/g) ?? []
    assert.equal(matches.length, 1)
    assert.match(companion, /data-orb-shell=\{residentialSurface \? 'residential'/)
  })

  it('OrbLayout owns one orb-sidebar and one orb-main', () => {
    const layout = read('components/orb/orb-layout.tsx')
    assert.equal((layout.match(/<aside[\s\S]*?className=\{`[^`]*orb-sidebar/g) ?? []).length, 1)
    assert.equal((layout.match(/<main[\s\S]*?className="orb-main/g) ?? []).length, 1)
    assert.match(layout, /data-orb-sidebar=\{residentialSurface \? 'primary'/)
    assert.match(layout, /data-orb-main=\{residentialSurface \? 'workspace'/)
  })

  it('home renders one composer dock and orb-composer class', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.equal((companion.match(/className=\{`[^`]*orb-composer-dock/g) ?? []).length, 1)
    assert.match(composer, /\borb-composer\b/)
    assert.doesNotMatch(composer, /orb-composer-v2/)
  })

  it('login uses only orb-login-shell', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /orb-login-shell/)
    assert.match(login, /data-orb-login-shell/)
    assert.doesNotMatch(login, /orb-login-flagship/)
    assert.doesNotMatch(login, /orb-login-full-viewport/)
    assert.doesNotMatch(login, /orb-login-enterprise/)
  })

  it('billing uses orb-modal with current included labels', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-modal="product"/)
    assert.match(billing, /ORB_RESIDENTIAL_BILLING_HEADER/)
    assert.match(billing, /ORB_RESIDENTIAL_BILLING_SUBTITLE/)
    assert.equal(ORB_RESIDENTIAL_BILLING_HEADER, 'ORB Residential')
    assert.match(ORB_RESIDENTIAL_BILLING_SUBTITLE, /children\u2019s homes/)
    for (const label of BANNED_USER_LABELS) {
      assert.doesNotMatch(billing, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
    for (const item of ['Chat', 'Dictate', 'Voice', 'ORB Write', 'Records & Drafts', 'Guided Demo', 'Help & Safety']) {
      assert.ok(ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS.includes(item as (typeof ORB_RESIDENTIAL_BILLING_INCLUDED_ITEMS)[number]))
    }
  })

  it('voice station uses Phase 1K copy from orb-residential-ui-copy', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(voice, /ORB_VOICE_V2_TITLE/)
    assert.match(voice, /ORB_VOICE_V2_PROMPT/)
    assert.match(voice, /ORB_VOICE_STATUS_CARD_COPY/)
    assert.equal(ORB_VOICE_V2_TITLE, 'Ready to talk')
    assert.equal(ORB_VOICE_V2_PROMPT, 'Talk it through with ORB before you write.')
    assert.match(ORB_VOICE_STATUS_CARD_COPY, /Audio is not stored/)
    assert.match(voice, /data-orb-voice-status-card/)
  })

  it('approved nav labels remain exactly nine items', () => {
    assert.deepEqual(
      ORB_VISIBLE_SIDEBAR_NAV.map((entry) => entry.label),
      ['Home', 'Chat', 'Dictate', 'Voice', 'Communicate', 'ORB Write', 'Records & Drafts', 'Help & Safety', 'Settings']
    )
  })

  it('safety copy and demo entry points remain present', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.equal(
      ORB_HOME_SAFETY_LINE,
      'ORB supports professional judgement. Review before use and follow local safeguarding procedures.'
    )
    assert.match(companion, /OrbGuidedDemo|guided-demo|data-orb-guided-demo/i)
    assert.match(read('components/orb-residential/orb-login-auth-card.tsx'), /OrbRequestDemoLink/)
  })

  it('residential components avoid banned user-facing product labels in rendered copy', () => {
    const files = [
      'components/orb-residential/orb-residential-sidebar.tsx',
      'components/orb-standalone/orb-care-companion.tsx',
      'components/orb-standalone/orb-billing-modal.tsx',
      'components/orb-standalone/orb-saved-outputs-panel.tsx',
      'components/orb-residential/orb-login-desktop-hero.tsx'
    ]
    for (const file of files) {
      const source = read(file)
      for (const label of BANNED_USER_LABELS) {
        assert.doesNotMatch(
          source,
          new RegExp(`(>|\\{['"])${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
          `${file} must not render ${label}`
        )
      }
    }
  })
})
