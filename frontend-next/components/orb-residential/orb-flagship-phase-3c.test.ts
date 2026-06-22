import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { formatOrbChatDisplayTitle } from '../../lib/orb/orb-chat-display-title.ts'
import { ORB_COMMUNICATE_COMPACT_SAFETY } from '../../lib/orb/communicate/orb-communicate-plan.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_DICTATE_CAPTURE_GUIDANCE } from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3C live product repair', () => {
  it('build version marker is phase-3c', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5l1-voice-idle-siri-hero-activation')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-visual-version=\{ORB_BUILD_VISUAL_VERSION\}/)
  })

  it('only orb-residential-shell.css is imported — no duplicate shell', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-convergence-phase|orb-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('recent chat menu uses portal dropdown with stacked items — not inline concatenation', () => {
    const menu = read('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(menu, /createPortal/)
    assert.match(menu, /data-orb-sidebar-chat-actions-menu/)
    assert.match(menu, /role="menuitem"/)
    assert.match(menu, /Rename/)
    assert.match(menu, /Move to project/)
    assert.match(menu, /Delete/)
    assert.match(shell, /\.orb-sidebar-dropdown-menu \{/)
    assert.match(shell, /flex-direction: column/)
    assert.equal(formatOrbChatDisplayTitle('[NAME_1].'), 'Untitled chat')
  })

  it('chat uses residential guided response shaping and concise detail', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const router = read('lib/orb/orb-brain-router.ts')
    assert.match(companion, /reshapeResidentialChatAnswer/)
    assert.match(companion, /detail: voiceOriginatedSend \? voiceSettings\.answerStyle : 'concise'/)
    assert.match(router, /requested_action: 'residential_guided_chat'/)
  })

  it('dictate capture studio is primary with journey, choices and safer draft stage', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const documentWorkspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const draft = read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx')
    assert.match(workspace, /data-orb-dictate-journey-step="safer-draft"/)
    assert.match(capture, /data-orb-dictate-capture-methods/)
    assert.match(capture, /data-orb-dictate-paste-notes/)
    assert.match(workspace, /OrbDictateSaferDraftPanel/)
    assert.match(draft, /ORB_DICTATE_DRAFT_REVIEW_LABEL/)
    assert.match(capture, /data-orb-dictate-top-record/)
    assert.match(documentWorkspace, /ORB_DICTATE_REVIEW_WITH_ORB/)
    assert.match(workspace, /ORB_DICTATE_CREATE_SAFER_DRAFT/)
    assert.match(draft, /ORB_DICTATE_ACTION_OPEN_WRITE/)
    assert.match(workspace, /ORB_DICTATE_CAPTURE_BOUNDARY|ORB_DICTATE_ADULT_RESPONSIBILITY/)
    assert.match(ORB_DICTATE_CAPTURE_GUIDANCE, /Start with what happened/)
  })

  it('voice shows style and reasoning carousels on main screen with push to talk', () => {
    const selector = read('components/orb-residential/orb-voice-mode-selector.tsx')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const launch = read('components/orb-standalone/orb-voice-launch-controls.tsx')
    assert.match(selector, /data-orb-voice-style-carousel/)
    assert.match(selector, /data-orb-voice-reasoning-carousel/)
    assert.match(voice, /data-orb-voice-secondary-controls/)
    assert.match(read('components/orb-standalone/orb-voice-live-rail.tsx'), /ORB_VOICE_V2_SAFETY_FOOTER/)
    assert.match(launch, /data-orb-voice-ptt-primary/)
    assert.doesNotMatch(launch, /data-orb-voice-end-summary/)
  })

  it('communicate is support-pack creator with natural language input and placeholder visuals', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /Describe the communication need/)
    assert.match(flow, /data-orb-communicate-natural-language-input/)
    assert.match(flow, /data-orb-communicate-placeholder-visual-cards/)
    assert.doesNotMatch(flow, /Widgit|Makaton|universally understood/i)
    assert.match(flow, /ORB_COMMUNICATE_OUTPUT_TYPES/)
    assert.equal(
      ORB_COMMUNICATE_COMPACT_SAFETY,
      'Visuals support communication and do not imply universal understanding. Adults must personalise and review before use.'
    )
    for (const card of ['Now', 'Next', 'Choice', 'Feeling', 'Safe adult', 'Break', 'Later', 'Finished']) {
      assert.match(flow, new RegExp(`'${card}'`))
    }
  })

  it('ORB Write is care documentation studio with review panel and writing styles', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const styles = read('lib/orb/recording/orb-template-writing-styles.ts')
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(panel, /Care documentation studio/)
    assert.match(panel, /data-orb-write-review-panel/)
    assert.match(copy, /Is the record factual, balanced and child-centred/)
    assert.match(copy, /ORB_WRITE_STUDIO_REVIEW_CHECKS/)
    for (const label of [
      'Balanced',
      'Child-centred',
      'Therapeutic',
      'Factual',
      'Professional',
      'Safeguarding-aware',
      'Inspection evidence support',
      'Manager summary',
      'Easy-read briefing'
    ]) {
      assert.match(styles, new RegExp(`label: '${label}'`))
    }
  })
})
