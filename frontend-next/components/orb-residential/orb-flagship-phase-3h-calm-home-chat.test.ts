import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { formatOrbChatDisplayTitle } from '../../lib/orb/orb-chat-display-title.ts'
import {
  ORB_COMPOSER_V2_PLACEHOLDER_HOME,
  ORB_HOME_SAFETY_LINE,
  ORB_HOME_V2_HEADLINE
} from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3H calm home and chat', () => {
  it('build version marker is phase-3s-dictate-document-quality', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3s-dictate-document-quality')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-login\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('home no longer renders Start with chip row by default', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /OrbHomeStartRow/)
    assert.doesNotMatch(companion, /data-orb-home-start-with/)
  })

  it('home renders calm headline and professional judgement safety line', () => {
    assert.equal(ORB_HOME_V2_HEADLINE, 'What do you need help thinking through?')
    assert.match(ORB_HOME_SAFETY_LINE, /ORB supports professional judgement/)
    assert.match(ORB_HOME_SAFETY_LINE, /local safeguarding procedures/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-workspace-headline/)
    assert.match(companion, /orb-composer-dock-safety/)
    assert.match(companion, /data-orb-home-safety-line/)
  })

  it('composer uses single calm ORB placeholder', () => {
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_HOME, /Ask ORB what you need help thinking through/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_COMPOSER_V2_PLACEHOLDER_HOME/)
    assert.doesNotMatch(companion, /ORB_COMPOSER_V2_PLACEHOLDER_CHAT/)
  })

  it('hero welcome hides once chat is active', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-chat-active/)
    assert.match(companion, /showEmptyState \?/)
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /data-orb-chat-active='true'/)
  })

  it('chat title formatting prevents placeholder names', () => {
    assert.equal(formatOrbChatDisplayTitle('[NAME_1].'), 'Untitled chat')
    assert.match(read('components/orb-standalone/orb-care-companion.tsx'), /formatOrbChatDisplayTitle/)
  })

  it('no billing nav item or duplicate shell introduced', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.doesNotMatch(sidebar, /data-orb-sidebar-billing|Billing<\/|>Billing</)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-home-shell|orb-chat-shell/)
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /phase-3s-dictate-document-quality/)
  })
})
