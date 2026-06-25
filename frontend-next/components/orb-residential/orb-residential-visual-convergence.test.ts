import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_HOME_QUICK_ACTIONS,
  ORB_STATION_DICTATE_SUBTITLE,
  ORB_STATION_SAFETY_FOOTER,
  ORB_STATION_WRITE_SUBTITLE,
  ORB_VOICE_POST_CALL_ACTIONS,
  ORB_WRITE_REVIEW_ACTION_CHECKS
} from '../../lib/orb/orb-residential-station-copy.ts'
import { ORB_RESIDENTIAL_STATION_DEFINITIONS } from '../../lib/orb/orb-residential-stations.ts'
import { isOrbCommunicateLaunchVisible } from '../../lib/orb/orb-navigation-convergence.ts'
import {
  ORB_CHAT_EMPTY_HEADING,
  ORB_DICTATE_SUBTITLE,
  ORB_RECORDS_EMPTY_SUBTITLE,
  ORB_RECORDS_PANEL_SUBTITLE
} from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_HOME_SAFETY_LINE } from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_DICTATE_RECORD_TYPE_SUGGESTIONS, ORB_DICTATE_RECENT_CAPTURES_EMPTY } from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential visual convergence pass', () => {
  it('shared station header component exists with DOM markers', () => {
    const header = read('components/orb-residential/orb-residential-station-ui.tsx')
    assert.match(header, /OrbResidentialStationHeader/)
    assert.match(header, /data-orb-residential-station-header/)
    assert.match(read('components/orb/dictate/OrbDictateStudioWorkspace.tsx'), /data-orb-dictate-subtitle-header/)
    assert.match(read('components/orb-standalone/orb-saved-outputs-panel.tsx'), /OrbStudioHeader/)
  })

  it('Chat home copy remains unchanged', () => {
    assert.equal(ORB_CHAT_EMPTY_HEADING, 'What do you need help thinking through?')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP/)
    assert.match(companion, /data-orb-home-quick-actions/)
    assert.equal(ORB_HOME_QUICK_ACTIONS.length, 4)
  })

  it('Dictate uses new ORB station copy and defaults', () => {
    assert.match(ORB_DICTATE_SUBTITLE, /Speak naturally/)
    assert.match(ORB_STATION_DICTATE_SUBTITLE, /adult-reviewed draft/)
    assert.equal(ORB_DICTATE_RECORD_TYPE_SUGGESTIONS[0]?.label, 'Quick Record')
    assert.doesNotMatch(ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.map((r) => r.label).join(' '), /General [Dd]ictation/)
    assert.match(ORB_DICTATE_RECENT_CAPTURES_EMPTY, /No captures yet/)
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    assert.match(selector, /OrbResidentialTemplateActionChip/)
    assert.match(read('lib/orb/recording/orb-recording-framework.json'), /"label": "Quick Record"/)
  })

  it('Voice tabs and post-call actions remain accessible', () => {
    const rail = read('components/orb-standalone/orb-voice-live-rail.tsx')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(rail, /role="tablist"/)
    assert.match(rail, /data-orb-voice-transcript-empty/)
    assert.match(voice, /data-orb-voice-create-draft-record/)
    assert.match(voice, /ORB_VOICE_POST_CALL_ACTIONS/)
    assert.equal(ORB_VOICE_POST_CALL_ACTIONS.openInOrbWrite, 'Open in ORB Write')
    assert.equal(ORB_VOICE_POST_CALL_ACTIONS.saveToMyDrafts, 'Save to My Drafts')
  })

  it('ORB Write shows Use a template and actionable review panel', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const checklist = read('components/orb-write/orb-write-studio-review-checklist.tsx')
    assert.match(panel, /Use a template/)
    assert.match(panel, /data-orb-write-use-template/)
    assert.match(checklist, /data-orb-write-review-action/)
    assert.ok(ORB_WRITE_REVIEW_ACTION_CHECKS.some((c) => c.actionLabel === 'Add child voice prompt'))
    assert.match(checklist, /ORB_WRITE_ADULT_RESPONSIBILITY_LINE/)
    assert.match(read('components/orb-write/orb-write-toolbar.tsx'), /More formatting/)
  })

  it('Records empty state hides Communicate unless feature flag enabled', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /isOrbCommunicateLaunchVisible/)
    assert.match(panel, /data-orb-saved-start-chat/)
    assert.match(panel, /data-orb-saved-start-dictate/)
    assert.match(panel, /data-orb-saved-start-write/)
    assert.match(ORB_RECORDS_EMPTY_SUBTITLE, /Chat, Dictate, Voice and ORB Write/)
    assert.doesNotMatch(ORB_RECORDS_EMPTY_SUBTITLE, /Communicate/)
    assert.equal(isOrbCommunicateLaunchVisible(), process.env.NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE === '1')
  })

  it('footer and safeguarding copy appears consistently', () => {
    assert.match(ORB_HOME_SAFETY_LINE, /professional judgement/)
    assert.match(ORB_STATION_SAFETY_FOOTER, /professional judgement/)
    assert.match(ORB_STATION_SAFETY_FOOTER, /safeguarding procedures/)
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
    assert.doesNotMatch(ORB_HOME_SAFETY_LINE, /guarantee|compliant|certified/i)
  })

  it('sidebar active nav and station copy converge', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(sidebar, /activeNavId/)
    assert.match(sidebar, /isNavActive/)
    assert.match(companion, /activeNavId=/)
    assert.equal(ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_write.tagline, ORB_STATION_WRITE_SUBTITLE)
    assert.match(ORB_RECORDS_PANEL_SUBTITLE, /ready to review/)
  })

  it('mobile sidebar remains usable and Communicate hidden from primary nav', () => {
    const names = read('lib/orb/orb-user-facing-names.ts')
    assert.match(names, /ORB_HIDDEN_LAUNCH_STATION_IDS/)
    assert.doesNotMatch(names, /id: 'orb_communicate'[\s\S]*ORB_VISIBLE_SIDEBAR_NAV/)
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /data-orb-sidebar-mobile-quick-nav/)
    assert.match(sidebar, /safe-area-inset-bottom/)
  })

  it('audit document exists', () => {
    const audit = readFileSync(join(root, '..', 'docs/audits/orb-residential-visual-convergence-audit.md'), 'utf8')
    assert.match(audit, /Visual Convergence Audit/)
    assert.match(audit, /Quick Record/)
  })
})
