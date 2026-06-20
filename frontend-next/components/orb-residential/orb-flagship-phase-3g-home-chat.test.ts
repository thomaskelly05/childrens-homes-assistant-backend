import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { formatOrbChatDisplayTitle } from '../../lib/orb/orb-chat-display-title.ts'
import {
  ORB_COMPOSER_V2_PLACEHOLDER_HOME,
  ORB_HOME_BRAND_TRUTH_LINE,
  ORB_HOME_SAFETY_LINE,
  ORB_HOME_START_WITH_OPTIONS
} from '../../lib/orb/orb-residential-shell-copy.ts'
import {
  buildResidentialGuidedChatFallback,
  reshapeResidentialChatAnswer
} from '../../lib/orb/orb-residential-chat-response-guide.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3G home and chat experience', () => {
  it('build version marker is phase-3j-active-chat-calm', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3j-active-chat-calm')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-login\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('home screen includes hero and brand truth without start-with row', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const startRow = read('components/orb-residential/orb-home-start-row.tsx')
    assert.match(companion, /data-orb-workspace-hero/)
    assert.match(companion, /data-orb-home-hero-presence/)
    assert.match(companion, /data-orb-home-brand-truth/)
    assert.doesNotMatch(companion, /OrbHomeStartRow/)
    assert.match(companion, /data-orb-home-empty/)
    assert.match(companion, /data-orb-chat-active/)
    assert.match(startRow, /data-orb-home-start-with/)
    assert.match(ORB_HOME_BRAND_TRUTH_LINE, /Built to help adults think before they write/)
  })

  it('start row component remains available but not mounted on home', () => {
    const labels = ORB_HOME_START_WITH_OPTIONS.map((option) => option.label)
    assert.deepEqual(labels, [
      'Daily record',
      'Incident reflection',
      'Safeguarding concern',
      'Key-work session',
      'Supervision prep'
    ])
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /OrbHomeStartRow/)
  })

  it('composer uses calm placeholder and safety line below composer', () => {
    assert.match(ORB_COMPOSER_V2_PLACEHOLDER_HOME, /Ask ORB what you need help thinking through/)
    assert.match(ORB_HOME_SAFETY_LINE, /professional judgement/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_COMPOSER_V2_PLACEHOLDER_HOME/)
    assert.match(companion, /orb-composer-dock-safety/)
    assert.match(companion, /data-orb-home-safety-line/)
  })

  it('placeholder chat titles become Untitled chat and header uses formatter', () => {
    assert.equal(formatOrbChatDisplayTitle('[NAME_1].'), 'Untitled chat')
    assert.equal(formatOrbChatDisplayTitle('[NAME_2]'), 'Untitled chat')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /formatOrbChatDisplayTitle/)
    const sidebarMenu = read('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    assert.match(sidebarMenu, /formatOrbChatDisplayTitle/)
    assert.match(sidebarMenu, /data-orb-sidebar-chat-actions-menu/)
    assert.match(sidebarMenu, /role="menuitem"/)
    assert.match(sidebarMenu, /orb-sidebar-dropdown-menu__item/)
    assert.match(sidebarMenu, /createPortal/)
  })

  it('safeguarding chat response is guided with boundaries and record offer', () => {
    const message = 'I need help with a safeguarding concern after a disclosure'
    const fallback = buildResidentialGuidedChatFallback(message, 'Safeguarding')
    assert.match(fallback, /I can help you think this through/i)
    assert.match(fallback, /immediate safety and local safeguarding procedures/i)
    assert.match(fallback, /1\. What happened, in order\?/)
    assert.match(fallback, /child say, show or communicate/i)
    assert.match(fallback, /factual, child-centred record/i)
    assert.doesNotMatch(fallback, /it is important to note that safeguarding is everyone's responsibility/i)

    const genericEssay = `# Safeguarding overview

It is important to note that in any safeguarding situation, safeguarding is everyone's responsibility.

## Best practice
${'Generic guidance paragraph without questions here. '.repeat(60)}

## Further reading
${'More generic content continues. '.repeat(40)}

## Additional sections
${'## Section\nMore text. '.repeat(20)}`

    const reshaped = reshapeResidentialChatAnswer(genericEssay, message, 'Safeguarding')
    assert.match(reshaped, /immediate safety|I can help you think this through/i)
    assert.match(reshaped, /local policy|professional judgement/i)
  })

  it('home CSS includes living ORB presence hooks without duplicate shells', () => {
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(css, /phase-3j-active-chat-calm/)
    assert.match(css, /orb-home-breathe/)
    assert.match(css, /data-orb-composer-focused/)
    assert.match(css, /orb-home-start-row/)
    assert.match(css, /data-orb-home-hero-presence/)
    assert.doesNotMatch(css, /orb-home-shell|orb-chat-shell/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-home-shell|orb-chat-shell/)
  })
})
