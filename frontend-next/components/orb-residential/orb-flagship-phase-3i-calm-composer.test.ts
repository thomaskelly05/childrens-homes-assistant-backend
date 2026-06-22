import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  formatOrbChatDisplayTitle,
  isMeaningfulOrbRecentChat
} from '../../lib/orb/orb-chat-display-title.ts'
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

describe('ORB Residential Phase 3I calm floating composer', () => {
  it('build version marker is phase-5n2-voice-realtime-latency-full-canvas', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5n2-voice-realtime-latency-full-canvas')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-login\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('home empty state does not render separate Dictate/Voice pill row above composer', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /showComposerQuickActions[\s\S]*!residentialSurface/)
    assert.match(composer, /homeEmptyCalm = compactResidential && !chatHasMessages/)
  })

  it('home empty state renders one calm composer placeholder', () => {
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_HOME, /Ask ORB what you need help thinking through/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_COMPOSER_V2_PLACEHOLDER_HOME/)
  })

  it('home empty state renders exactly one visible short safety note', () => {
    assert.equal(ORB_HOME_V2_HEADLINE, 'What do you need help thinking through?')
    assert.match(ORB_HOME_SAFETY_LINE, /ORB supports professional judgement/)
    assert.match(ORB_HOME_SAFETY_LINE, /local safeguarding procedures/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /orb-composer-dock-safety/)
    assert.match(companion, /OrbPrivacyClassificationLink/)
  })

  it('home empty state does not render the large boxed identifiable-information strip', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /homeEmptyCalm/)
    assert.match(composer, /!homeEmptyCalm && \(!compactResidential \|\| !mobileViewport\)/)
    assert.doesNotMatch(composer, /OrbComposerCopyright/)
  })

  it('welcome content renders before first message and hides after chat starts', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /showEmptyState \?/)
    assert.match(companion, /data-orb-chat-active/)
    assert.match(companion, /data-orb-workspace-headline/)
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /\[data-orb-chat-active='true'\] .*orb-workspace-hero/)
  })

  it('composer remains available after chat starts', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /composer=\{activeWorkspacePanel \? null : composer\}/)
    assert.match(companion, /chatHasMessages=\{visibleMessages\.length > 0\}/)
  })

  it('recent chats hide placeholder-only conversations and format titles safely', () => {
    assert.equal(formatOrbChatDisplayTitle('[NAME_1].'), 'Untitled chat')
    assert.equal(
      isMeaningfulOrbRecentChat({ title: 'New conversation', messages: [] }),
      false
    )
    assert.equal(
      isMeaningfulOrbRecentChat({ title: 'Incident debrief', messages: [] }),
      true
    )
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /isMeaningfulOrbRecentChat/)
    assert.match(sidebar, /meaningfulRecentChats/)
  })

  it('sidebar action menu items stay in portal dropdown, not inline', () => {
    const menu = read('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    assert.match(menu, /createPortal/)
    assert.match(menu, /data-orb-sidebar-chat-actions-menu/)
    assert.doesNotMatch(menu, /Rename chat<\/button>\s*<button[^>]*>Delete/)
  })

  it('single shell and CSS contract remain intact', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-home-shell|orb-chat-shell/)
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /phase-5n2-voice-realtime-latency-full-canvas/)
  })
})
