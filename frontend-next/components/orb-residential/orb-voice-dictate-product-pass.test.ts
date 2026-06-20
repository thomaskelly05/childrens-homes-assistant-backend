import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildOrbVoiceAfterCallContent,
  orbVoiceNeedsEscalationPrompt,
  orbVoiceNeedsManagementOversight
} from '../../lib/orb/voice/orb-voice-after-call.ts'
import { dictateMobileStatusLine } from '../../lib/orb/dictate/orb-dictate-mobile-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice + Dictate product pass', () => {
  it('Dictate mobile has premium capture stage without form card border', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(dictate, /data-orb-dictate-capture-stage/)
    assert.match(dictate, /orb-dictate-mobile-capture-stage/)
    assert.match(dictate, /GlassOrbMark/)
    assert.match(dictate, /data-orb-dictate-primary-action/)
    assert.match(dictate, /data-orb-dictate-paste-secondary/)
    assert.match(dictate, /data-orb-dictate-upload-secondary/)
    assert.doesNotMatch(dictate, /rounded-2xl border border-\[var\(--orb-primary\)\]/)
    assert.match(mobileCss, /\[data-orb-dictate-capture-stage='true'\]/)
    assert.match(mobileCss, /border: none/)
  })

  it('Dictate state labels cover idle listening processing and review-ready', () => {
    assert.equal(
      dictateMobileStatusLine({
        dictateState: 'ready',
        recordingUiState: 'idle',
        hasTranscript: false,
        speechError: null,
        userStatus: null,
        listening: false
      }),
      'Ready to capture'
    )
    assert.equal(
      dictateMobileStatusLine({
        dictateState: 'listening',
        recordingUiState: 'recording',
        hasTranscript: false,
        speechError: null,
        userStatus: null,
        listening: true
      }),
      'Listening…'
    )
    assert.equal(
      dictateMobileStatusLine({
        dictateState: 'generating',
        recordingUiState: 'idle',
        hasTranscript: true,
        speechError: null,
        userStatus: null,
        listening: false
      }),
      'Structuring your note…'
    )
    assert.equal(
      dictateMobileStatusLine({
        dictateState: 'generated',
        recordingUiState: 'stopped',
        hasTranscript: true,
        hasGeneratedOutput: true,
        speechError: null,
        userStatus: null,
        listening: false
      }),
      'Ready to review'
    )
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(dictate, /data-orb-dictate-capture-orb-state/)
    assert.match(dictate, /review_ready/)
  })

  it('Voice idle has ORB presence start voice type instead and turn speech into record', () => {
    const actions = read('components/orb-standalone/orb-voice-actions.tsx')
    const companion = read('components/orb-residential/orb-voice-companion.tsx')
    const hero = read('components/orb-standalone/orb-voice-hero-stage.tsx')
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(companion, /Ready to talk/)
    assert.match(actions, /Push to talk/)
    assert.match(actions, /Type instead/)
    assert.match(actions, /Turn speech into a record/)
    assert.match(hero, /OrbVoiceCompanion/)
    assert.match(content, /OrbVoiceResponsibilityStrip/)
    assert.match(content, /data-orb-voice-responsibility-strip/)
    assert.match(content, /data-orb-voice-privacy-strip/)
  })

  it('Voice live and after-call panels exist with controls and shared record type framework', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')
    const after = read('components/orb-standalone/orb-voice-after-call-panel.tsx')
    assert.match(station, /OrbVoiceLivePanel/)
    assert.match(station, /OrbVoiceAfterCallPanel/)
    assert.match(station, /workspaceMode=\{voiceWorkspaceMode\}/)
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(content, /data-orb-voice-workspace-mode/)
    assert.match(after, /data-orb-voice-after-call/)
    assert.match(live, /data-orb-voice-live-transcript/)
    assert.match(live, /data-orb-voice-end/)
    assert.match(after, /data-orb-voice-after-call/)
    assert.match(after, /Create final draft/)
    assert.match(after, /Send to ORB Write/)
    assert.match(after, /OrbDictateTemplateSelector/)
    assert.match(after, /Turn speech into a record/)
  })

  it('after-call content does not invent summary when transcript empty', () => {
    const empty = buildOrbVoiceAfterCallContent([])
    assert.equal(empty.summary, null)
    assert.equal(empty.hasTranscript, false)
    assert.equal(empty.recordingHints.length, 0)
    const withTurn = buildOrbVoiceAfterCallContent([
      { id: '1', role: 'user', text: 'Rough note about handover', startedAt: '', mode: 'general', provider: 'browser' }
    ])
    assert.ok(withTurn.summary?.includes('handover'))
    assert.ok(orbVoiceNeedsEscalationPrompt('There is immediate risk and a disclosure'))
    assert.ok(orbVoiceNeedsManagementOversight('Concern about restraint during handover'))
  })

  it('mobile safe-area action dock and voice modes use workspace scroll containment', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(content, /data-orb-voice-mobile-action-dock/)
    assert.match(content, /env\(safe-area-inset-bottom\)/)
    assert.match(mobileCss, /\[data-orb-voice-workspace-mode='live'\]/)
    assert.match(mobileCss, /\[data-orb-voice-after-call\]/)
  })

  it('no duplicate ORB shell — single voice station content source', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /OrbVoiceStationContent/)
    assert.doesNotMatch(station, /orb-voice-mobile-experience/)
    assert.doesNotMatch(station, /OrbVoiceMobileExperience/)
  })
})
