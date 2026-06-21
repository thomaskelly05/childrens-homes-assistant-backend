import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { formatOrbChatDisplayTitle } from '../../lib/orb/orb-chat-display-title.ts'
import { ORB_COMMUNICATE_COMPACT_SAFETY } from '../../lib/orb/communicate/orb-communicate-plan.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_DICTATE_CAPTURE_GUIDANCE, ORB_DICTATE_CAPTURE_PROMPT } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_WRITE_SAFETY_COPY } from '../../lib/orb/write/orb-write-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3D station behaviour hardening', () => {
  it('build version marker is phase-3d', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5b-voice-v2-safari-katherine-hardening')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-visual-version=\{ORB_BUILD_VISUAL_VERSION\}/)
  })

  it('single shell — only orb-residential-shell.css imported', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-convergence-phase|orb-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('chat uses guided specialist shaping and recent chat menu is stacked', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const menu = read('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    const guide = read('lib/orb/orb-residential-chat-response-guide.ts')
    assert.match(companion, /reshapeResidentialChatAnswer/)
    assert.match(guide, /shouldApplyResidentialChatGuidance/)
    assert.match(guide, /I can help you think this through/i)
    assert.match(menu, /data-orb-sidebar-chat-actions-menu/)
    assert.match(menu, /role="menuitem"/)
    assert.equal(formatOrbChatDisplayTitle('[NAME_1].'), 'Untitled chat')
  })

  it('dictate capture studio is primary with single review checklist', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const checklist = read('components/orb/dictate/OrbDictateReviewChecklist.tsx')
    assert.equal(ORB_DICTATE_CAPTURE_PROMPT, 'Speak, paste or upload what happened')
    assert.match(ORB_DICTATE_CAPTURE_GUIDANCE, /Start with what happened/)
    const extras = read('components/orb-standalone/orb-dictate-station-extras.tsx')
    assert.match(capture, /data-orb-dictate-capture-station/)
    assert.match(capture, /data-orb-dictate-paste-notes/)
    assert.match(capture, /data-orb-dictate-capture-method=\{method\.id\}/)
    assert.match(extras, /data-orb-dictate-audio-upload/)
    assert.match(workspace, /data-orb-dictate-designed-workflow/)
    assert.match(checklist, /data-orb-dictate-review-checklist/)
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(copy, /Time, date and sequence/)
    assert.match(copy, /Management oversight where needed/)
    assert.match(workspace, /ORB_DICTATE_CREATE_SAFER_DRAFT/)
    assert.match(read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx'), /ORB_DICTATE_ACTION_OPEN_WRITE/)
  })

  it('voice shows style and reasoning carousels on main screen without broken end summary', () => {
    const selector = read('components/orb-residential/orb-voice-mode-selector.tsx')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const launch = read('components/orb-standalone/orb-voice-launch-controls.tsx')
    const carousel = read('lib/orb/orb-voice-mode-carousel.ts')
    assert.match(selector, /data-orb-voice-style-carousel/)
    assert.match(selector, /data-orb-voice-reasoning-carousel/)
    assert.match(selector, /data-orb-voice-mode-selection-summary/)
    assert.match(voice, /data-orb-voice-secondary-controls/)
    assert.match(voice, /ORB_VOICE_V2_SAFETY_FOOTER/)
    assert.match(launch, /data-orb-voice-ptt-primary/)
    assert.doesNotMatch(launch, /data-orb-voice-end-summary/)
    for (const label of ['Calm', 'Warm', 'Direct', 'Reflective']) {
      assert.match(carousel, new RegExp(`label: '${label}'`))
    }
    for (const label of ['Talk it through', 'Safeguarding thinking', 'Supervision prep', 'Clear summary']) {
      assert.match(carousel, new RegExp(`label: '${label}'`))
    }
    assert.match(carousel, /voice ·/)
  })

  it('communicate is support-pack creator with natural language input', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /Describe the communication need/)
    assert.match(flow, /Create accessible explanations, visual supports, social story sections/)
    assert.match(flow, /data-orb-communicate-natural-language-input/)
    assert.match(flow, /Create support pack/)
    assert.match(flow, /Adult-reviewed support pack/)
    assert.match(flow, /Easy-read explanation/)
    assert.match(flow, /Visual support cards/)
    assert.match(flow, /Social story section/)
    assert.match(flow, /Staff guidance/)
    assert.match(flow, /Recording prompts/)
    assert.doesNotMatch(flow, /Widgit|Makaton|PECS|universally understood/i)
    assert.match(flow, /personalised around the way each person communicates/)
    assert.equal(
      ORB_COMMUNICATE_COMPACT_SAFETY,
      'Visuals support communication and do not imply universal understanding. Adults must personalise and review before use.'
    )
    for (const card of ['Now', 'Next', 'Choice', 'Feeling', 'Safe adult', 'Break', 'Later', 'Finished']) {
      assert.match(flow, new RegExp(`'${card}'`))
    }
  })

  it('ORB Write is care documentation studio with review panel and adult responsibility', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const checklist = read('components/orb-write/orb-write-studio-review-checklist.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(panel, /Care documentation studio/)
    assert.match(panel, /data-orb-write-review-panel/)
    assert.match(panel, /data-orb-write-adult-responsibility/)
    assert.match(panel, /Create safer final draft/)
    assert.match(ORB_WRITE_SAFETY_COPY.responsibility, /staff must verify accuracy/)
    assert.match(checklist, /ORB_WRITE_STUDIO_REVIEW_CHECKS/)
    assert.match(copy, /child-centred/)
    assert.match(toolbar, /data-orb-write-toolbar-group="structure"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="format"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="review"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="export"/)
  })
})
