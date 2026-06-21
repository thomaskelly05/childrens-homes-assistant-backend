import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_HOME_SAFETY_LINE } from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_LOGIN_CAPABILITY_GROUPS } from '../../lib/orb/orb-login-stations-copy.ts'
import { ORB_RECORDS_EMPTY_SUBTITLE } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3A specialist station alignment', () => {
  it('build version marker is phase-3b', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4e-voice-free-flowing-katherine')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /data-orb-build-version=\{ORB_BUILD_VISUAL_VERSION\}/)
    assert.match(layout, /data-orb-build-visual-version=\{ORB_BUILD_VISUAL_VERSION\}/)
  })

  it('single stylesheet import remains canonical', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-flagship-phase|orb-convergence-phase|orb-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice main screen renders all voice styles and reasoning modes', () => {
    const selector = read('components/orb-residential/orb-voice-mode-selector.tsx')
    const carousel = read('lib/orb/orb-voice-mode-carousel.ts')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /OrbVoiceModeSelector/)
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
    assert.match(selector, /data-orb-voice-style-option/)
    assert.match(selector, /data-orb-voice-reasoning-option/)
  })

  it('dictate renders Capture → ORB Review → Safer Draft journey', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /data-orb-dictate-journey-step="capture"/)
    assert.match(workspace, /data-orb-dictate-journey-step="orb-review"/)
    assert.match(workspace, /data-orb-dictate-journey-step="safer-draft"/)
    assert.match(workspace, /Safer Draft/)
    assert.match(workspace, /ORB Review/)
  })

  it('ORB Write renders visible ORB Review panel and care documentation studio language', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.match(panel, /data-orb-write-review-panel/)
    assert.match(panel, /Care documentation studio/)
    assert.match(panel, /data-orb-write-care-studio/)
    assert.match(brain, /ORB Review/)
  })

  it('communicate renders support-pack creator language and placeholder visual cards', () => {
    const flow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(flow, /data-orb-communicate-create-flow/)
    assert.match(flow, /Create support pack/)
    assert.match(flow, /data-orb-communicate-visual-preview/)
    for (const card of ['Now', 'Next', 'Choice', 'Feeling', 'Safe adult', 'Break', 'Later', 'Finished']) {
      assert.match(flow, new RegExp(`'${card}'`))
    }
  })

  it('login renders capability groups', () => {
    const hero = read('components/orb-residential/orb-login-desktop-hero.tsx')
    assert.match(hero, /data-orb-login-capability-groups/)
    assert.match(hero, /ORB_LOGIN_CAPABILITY_GROUPS/)
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((g) => g.id === 'think'))
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((g) => g.id === 'capture'))
    assert.ok(ORB_LOGIN_CAPABILITY_GROUPS.some((g) => g.id === 'evidence'))
  })

  it('records empty state mentions all stations', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /ORB_RECORDS_EMPTY_SUBTITLE/)
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Chat, Dictate, Voice, Communicate and ORB Write/)
    assert.match(panel, /data-orb-saved-start-dictate/)
    assert.match(panel, /data-orb-saved-start-communicate/)
    assert.match(panel, /data-orb-saved-start-write/)
  })

  it('billing remains under settings only', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.doesNotMatch(sidebar, /data-orb-sidebar-billing/)
    assert.match(settings, /account_billing/)
  })

  it('safety language remains visible across stations', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const voiceCopy = read('lib/orb/orb-residential-ui-copy.ts')
    const dictate = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const communicatePlan = read('lib/orb/communicate/orb-communicate-plan.ts')
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(ORB_HOME_SAFETY_LINE, /professional judgement/)
    assert.match(voiceCopy, /ORB_VOICE_AUDIO_NOT_STORED|Review any summary/)
    assert.match(dictate, /data-orb-dictate-safety-footer/)
    assert.match(communicatePlan, /personalise and review before use/)
  })
})
