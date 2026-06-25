import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_MOBILE_FRAMING,
  ORB_HELP_WHEN_TO_SPEAK_TO_MANAGER,
  ORB_RECORDS_LEGACY_DRAFT_LABEL,
  ORB_VOICE_MOBILE_FRAMING,
  ORB_WRITE_MOBILE_ASK_ORB_CHECK_WORDING,
  ORB_WRITE_MOBILE_HEADER,
  ORB_WRITE_MOBILE_PART_LABEL,
  ORB_WRITE_MOBILE_REVIEW_BEFORE_USE,
  ORB_WRITE_MOBILE_SAVE_DRAFT
} from '../../lib/orb/orb-care-led-mobile-copy.ts'
import { ORB_HOME_QUICK_ACTIONS } from '../../lib/orb/orb-residential-station-copy.ts'
import { ORB_DICTATE_QUICK_RECORD_EXPLANATION } from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_VOICE_V2_IDLE_PROMPT } from '../../lib/orb/voice-v2/orb-voice-v2-copy.ts'
import {
  ORB_CHAT_EMPTY_HEADING,
  ORB_DICTATE_SUBTITLE,
  ORB_RECORDS_PANEL_SUBTITLE,
  ORB_RECORDS_STATUS_CHIPS
} from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_LOGIN_PROFESSIONAL_BOUNDARY } from '../../lib/orb/orb-login-stations-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential care-led mobile UX pass', () => {
  const workspace = read('components/orb-write/orb-write-mobile-section-workspace.tsx')
  const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
  const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
  const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
  const login = read('components/orb-residential/orb-login-auth-card.tsx')
  const dictateMobile = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
  const voiceContent = read('components/orb-standalone/orb-voice-station-content.tsx')
  const help = read('components/orb-standalone/orb-help-panel.tsx')
  const companion = read('components/orb-standalone/orb-care-companion.tsx')
  const css = read('app/orb/orb-residential-shell.css')

  it('ORB Write mobile uses Shape the record and care-led subheader', () => {
    assert.equal(ORB_WRITE_MOBILE_HEADER, 'Shape the record')
    assert.match(workspace, /ORB_WRITE_MOBILE_HEADER/)
    assert.match(workspace, /ORB_WRITE_MOBILE_SUBHEADER/)
    assert.match(panel, /OrbWriteMobileCareHeader/)
    assert.match(workspace, /data-orb-write-mobile-care-header/)
  })

  it('ORB Write mobile uses Part not Section in visible navigation', () => {
    assert.equal(ORB_WRITE_MOBILE_PART_LABEL, 'Part')
    assert.match(workspace, /ORB_WRITE_MOBILE_PART_LABEL/)
    assert.match(workspace, /of \{sectionCount\}/)
    assert.match(workspace, /ORB_WRITE_MOBILE_PREVIOUS_PART/)
    assert.match(workspace, /ORB_WRITE_MOBILE_NEXT_PART/)
    assert.match(workspace, /ORB_WRITE_MOBILE_ALL_PARTS/)
    assert.doesNotMatch(workspace, />\s*Section \{sectionIndex/)
    assert.doesNotMatch(workspace, />\s*Sections</)
  })

  it('ORB Write mobile shows one care-led prompt at a time', () => {
    assert.match(workspace, /OrbWriteMobileActiveSection/)
    assert.match(workspace, /orbWriteMobileCareLedSectionTitle/)
    assert.match(workspace, /data-orb-write-mobile-part-title/)
    assert.match(panel, /data-orb-write-mobile-layout=\{isMobile \? 'one-section'/)
  })

  it('ORB Write mobile primary actions include Save draft and Ask ORB to check wording', () => {
    assert.equal(ORB_WRITE_MOBILE_SAVE_DRAFT, 'Save draft')
    assert.equal(ORB_WRITE_MOBILE_ASK_ORB_CHECK_WORDING, 'Ask ORB to check wording')
    assert.equal(ORB_WRITE_MOBILE_REVIEW_BEFORE_USE, 'Review before use')
    assert.match(toolbar, /data-orb-write-save-draft/)
    assert.match(toolbar, /ORB_WRITE_MOBILE_SAVE_DRAFT/)
    assert.match(toolbar, /ORB_WRITE_MOBILE_ASK_ORB_CHECK_WORDING/)
    assert.match(toolbar, /ORB_WRITE_MOBILE_REVIEW_BEFORE_USE/)
  })

  it('Records default mobile view hides legacy broken drafts and marks legacy badge', () => {
    assert.match(saved, /isLegacyLocalSavedOutput\(item\)/)
    assert.match(saved, /showLegacyLocal/)
    assert.match(saved, /ORB_RECORDS_LEGACY_DRAFT_LABEL/)
    assert.equal(ORB_RECORDS_LEGACY_DRAFT_LABEL, 'Legacy draft')
    assert.match(saved, /data-orb-records-legacy-toggle/)
    assert.match(saved, /data-orb-records-mobile-list-header/)
    assert.match(ORB_RECORDS_PANEL_SUBTITLE, /ready to review/i)
  })

  it('Login mobile has one safety boundary only', () => {
    assert.match(login, /ORB_LOGIN_PROFESSIONAL_BOUNDARY/)
    assert.match(login, /data-orb-login-professional-boundary/)
    assert.equal((login.match(/data-orb-login-professional-boundary/g) ?? []).length, 1)
    assert.match(login, /data-orb-login-adult-reviewed[\s\S]*hidden/)
    assert.match(ORB_LOGIN_PROFESSIONAL_BOUNDARY, /does not replace safeguarding procedures/)
  })

  it('Home mobile quick actions remain care-led', () => {
    assert.equal(ORB_CHAT_EMPTY_HEADING, 'What do you need help thinking through?')
    assert.match(companion, /ORB_HOME_QUICK_ACTIONS/)
    assert.equal(ORB_HOME_QUICK_ACTIONS[0]?.label, 'Write a record')
    assert.equal(ORB_HOME_QUICK_ACTIONS[1]?.label, 'Reflect on an incident')
    assert.equal(ORB_HOME_QUICK_ACTIONS[2]?.label, 'Find a template')
    assert.equal(ORB_HOME_QUICK_ACTIONS[3]?.label, 'Use home document')
  })

  it('Dictate mobile uses adult-reviewed draft wording', () => {
    assert.match(ORB_DICTATE_SUBTITLE, /adult-reviewed draft/)
    assert.match(ORB_DICTATE_MOBILE_FRAMING, /adult-reviewed draft/)
    assert.match(dictateMobile, /ORB_DICTATE_MOBILE_FRAMING/)
    assert.match(dictateMobile, /ORB_DICTATE_QUICK_RECORD_EXPLANATION/)
    assert.match(ORB_DICTATE_QUICK_RECORD_EXPLANATION, /rough notes/)
  })

  it('Voice mobile includes Talk it through before you write', () => {
    assert.equal(ORB_VOICE_V2_IDLE_PROMPT, 'Talk it through before you write.')
    assert.equal(ORB_VOICE_MOBILE_FRAMING, 'Talk it through before you write.')
    assert.match(voiceContent, /data-orb-voice-v2-subtitle/)
    assert.match(voiceContent, /data-orb-voice-mobile-care-framing/)
  })

  it('Help and Safety uses care-led headings including manager guidance', () => {
    assert.match(help, /What ORB can help with/)
    assert.match(help, /What ORB cannot do/)
    assert.match(help, /Safe use/)
    assert.match(help, /ORB_HELP_WHEN_TO_SPEAK_TO_MANAGER/)
    assert.equal(ORB_HELP_WHEN_TO_SPEAK_TO_MANAGER, 'When to speak to a manager')
    assert.doesNotMatch(help, /data-orb-help-safeguarding-boundary/)
    assert.match(help, /data-orb-help-panel-safe-bottom/)
  })

  it('Records status chips use care-led pilot labels', () => {
    const labels = ORB_RECORDS_STATUS_CHIPS.map((chip) => chip.label)
    assert.ok(labels.includes('Open and continue'))
    assert.ok(labels.includes('Ready for review'))
    assert.ok(labels.includes('Finalised'))
    assert.ok(labels.includes('Archived'))
  })

  it('no regression to mobile shell fixed header scroll region bottom composer', () => {
    const layout = read('components/orb/orb-layout.tsx')
    assert.match(companion, /data-orb-home-mobile-station/)
    assert.match(companion, /data-orb-mobile-shell-scroll-region/)
    assert.match(layout, /data-orb-mobile-header/)
    assert.match(css, /data-orb-home-mobile-station/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('no horizontal overflow on mobile write and home surfaces', () => {
    assert.match(css, /overflow-x:\s*hidden/)
    assert.match(css, /\[data-orb-write-mobile-section-workspace\]/)
    assert.match(css, /\[data-orb-write-mobile-layout='one-section'\]/)
  })

  it('secondary ORB Write metadata is de-emphasised on mobile', () => {
    assert.match(workspace, /data-orb-write-mobile-metadata-secondary/)
    assert.match(css, /orb-write-mobile-status-badge/)
    assert.match(css, /orb-write-mobile-word-count/)
  })
})
