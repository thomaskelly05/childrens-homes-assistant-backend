import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { formatOrbChatDisplayTitle } from '../../lib/orb/orb-chat-display-title.ts'
import { ORB_HOME_SAFETY_LINE } from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_LOGIN_CAPABILITY_GROUPS } from '../../lib/orb/orb-login-stations-copy.ts'
import { ORB_RECORDS_EMPTY_SUBTITLE } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3B unified station experience', () => {
  it('build version marker is phase-3b', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5c-voice-v2-audio-playback-unlock')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-visual-version=\{ORB_BUILD_VISUAL_VERSION\}/)
  })

  it('only orb-residential-shell.css is imported and no duplicate shell classes are active', () => {
    const layout = read('app/orb/layout.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-convergence-phase|orb-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
    assert.doesNotMatch(companion, /data-orb-flagship-shell|orb-second-shell|OrbFlagshipShell/)
  })

  it('placeholder chat titles are not shown as visible recent chat labels', () => {
    assert.equal(formatOrbChatDisplayTitle('[NAME_1].'), 'Untitled chat')
    assert.equal(formatOrbChatDisplayTitle('[PERSON_2]'), 'Untitled chat')
    const menu = read('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    assert.match(menu, /formatOrbChatDisplayTitle/)
    assert.doesNotMatch(menu, /\{chat\.title\}/)
  })

  it('home keeps safety line and composer', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-home-safety-line/)
    assert.equal(
      ORB_HOME_SAFETY_LINE,
      'ORB supports professional judgement. Review before use and follow local safeguarding procedures.'
    )
    assert.match(companion, /OrbStandaloneComposer|orb-composer/)
  })

  it('dictate renders capture journey, actions, review sections and safety copy', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const checklist = read('components/orb/dictate/OrbDictateReviewChecklist.tsx')
    assert.match(workspace, /data-orb-dictate-journey-step="capture"/)
    assert.match(capture, /data-orb-dictate-capture-methods/)
    assert.match(capture, /data-orb-dictate-paste-notes/)
    assert.match(workspace, /ORB_DICTATE_ADULT_RESPONSIBILITY|ORB_DICTATE_CAPTURE_BOUNDARY/)
    assert.match(workspace, /data-orb-dictate-review-supporting/)
    assert.match(checklist, /data-orb-dictate-review-checklist/)
    assert.match(checklist, /ORB_DICTATE_REVIEW_CHECKLIST_ITEMS/)
    assert.match(read('lib/orb/dictate/orb-dictate-capture-copy.ts'), /child say, show or communicate/i)
    assert.match(workspace, /data-orb-dictate-safety-footer/)
  })

  it('voice main screen renders styles, reasoning modes, carousel and push to talk', () => {
    const selector = read('components/orb-residential/orb-voice-mode-selector.tsx')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const carousel = read('lib/orb/orb-voice-mode-carousel.ts')
    assert.match(selector, /data-orb-voice-style-carousel/)
    assert.match(selector, /data-orb-voice-reasoning-carousel/)
    assert.match(selector, /data-orb-voice-mode-headline/)
    assert.match(selector, /describeVoiceModeSelection/)
    for (const label of ['Calm', 'Warm', 'Direct', 'Reflective']) {
      assert.match(carousel, new RegExp(`label: '${label}'`))
    }
    for (const label of [
      'Talk it through',
      'Safeguarding thinking',
      'Supervision prep',
      'Clear summary'
    ]) {
      assert.match(carousel, new RegExp(`label: '${label}'`))
    }
    const launch = read('components/orb-standalone/orb-voice-launch-controls.tsx')
    assert.match(voice, /data-orb-voice-start-conversation|handlePrimary/)
    assert.match(launch, /data-orb-voice-ptt-primary|Start talking/i)
  })

  it('ORB Write renders care studio language, review panel and dignity checks', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const checklist = read('components/orb-write/orb-write-studio-review-checklist.tsx')
    const toolbar = read('components/orb-write/orb-write-toolbar.tsx')
    assert.match(panel, /Care documentation studio/)
    assert.match(panel, /data-orb-write-review-panel/)
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(checklist, /ORB_WRITE_STUDIO_REVIEW_CHECKS/)
    assert.match(copy, /What am I missing/)
    assert.match(copy, /observation from interpretation/)
    assert.match(copy, /preserve dignity/)
    assert.doesNotMatch(panel, /data-orb-write-second-shell/)
    assert.match(toolbar, /data-orb-write-toolbar-group="structure"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="format"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="review"/)
    assert.match(toolbar, /data-orb-write-toolbar-group="export"/)
    assert.match(checklist, /ORB_WRITE_STUDIO_REVIEW_CHECKS/)
  })

  it('communicate renders support-pack creator language and placeholder visual cards', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /ORB_COMMUNICATE_CREATOR_HEADLINE/)
    assert.match(flow, /Describe the communication need/)
    assert.match(flow, /Create support pack/)
    assert.match(flow, /data-orb-communicate-visual-preview/)
    assert.doesNotMatch(flow, /Widgit|Makaton|universally understood/i)
    for (const card of ['Now', 'Next', 'Choice', 'Feeling', 'Safe adult', 'Break', 'Later', 'Finished']) {
      assert.match(flow, new RegExp(`'${card}'`))
    }
  })

  it('login renders capability groups, request demo and above-fold layout hooks', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    const auth = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(hero, /data-orb-login-capability-groups/)
    assert.match(hero, /data-orb-login-above-fold/)
    assert.match(auth, /OrbRequestDemoLink|data-orb-login-demo-route/)
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((g) => g.id === 'think'))
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((g) => g.id === 'evidence'))
  })

  it('records empty state mentions all stations and billing stays under settings', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Chat, Dictate, Voice, Communicate and ORB Write/)
    assert.match(panel, /ORB_RECORDS_EMPTY_SUBTITLE/)
    assert.doesNotMatch(sidebar, /data-orb-sidebar-billing/)
    assert.match(settings, /account_billing/)
  })

  it('safety language remains visible', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(voice, /ORB_VOICE_V2_SAFETY_FOOTER|ORB_VOICE_V2_TRANSCRIPT_NOTE/)
  })

  it('sidebar powered-by tagline uses shorter IndiCare label', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(copy, /Powered by IndiCare/)
    assert.doesNotMatch(copy, /ORB_RESIDENTIAL_TAGLINE = 'Powered by IndiCare Intelligence'/)
  })
})
