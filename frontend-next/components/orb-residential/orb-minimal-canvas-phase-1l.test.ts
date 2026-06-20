import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_HOME_SAFETY_LINE } from '../../lib/orb/orb-residential-shell-copy.ts'
import { ORB_VISIBLE_SIDEBAR_NAV } from '../../lib/orb/orb-user-facing-names.ts'
import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential minimal canvas (Phase 1L)', () => {
  it('layout imports only orb-residential-shell.css', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.doesNotMatch(layout, /orb-theme\.css|orb-shell\.css|orb-mobile\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('home does not render large right rail or provider walkthrough card', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const entry = read('components/orb-residential/orb-guided-demo-entry.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.doesNotMatch(companion, /data-orb-workspace-home-rail/)
    assert.doesNotMatch(companion, /data-orb-workspace-rail-trust/)
    assert.doesNotMatch(companion, /orb-guided-demo-continue-card--flagship/)
    assert.doesNotMatch(entry, /Provider walkthrough/)
    assert.doesNotMatch(entry, /rounded-2xl border p-4/)
    assert.match(css, /\[data-orb-workspace-home-rail\]/)
  })

  it('home keeps one composer and compact safety in hero', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-composer="main"/)
    assert.doesNotMatch(companion, /data-orb-workspace-starters/)
    assert.match(companion, /data-orb-home-safety-line/)
    assert.match(companion, /ORB_HOME_SAFETY_LINE/)
    assert.equal(ORB_HOME_SAFETY_LINE, ORB_HOME_SAFETY_LINE)
  })

  it('records empty state hides filters until data exists', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /showRecordsEmptyCanvas/)
    assert.match(panel, /data-orb-records-empty/)
    assert.match(panel, /ORB_RECORDS_EMPTY_SUBTITLE/)
  })

  it('dictate keeps capture and review without workflow strip clutter', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /OrbTranscriptPanel/)
    assert.match(workspace, /OrbDictateBrainPanel/)
    assert.doesNotMatch(workspace, /OrbWorkflowStrip/)
    assert.doesNotMatch(workspace, /OrbDictatePrivacyStrip/)
    assert.match(workspace, /data-orb-dictate-safety-footer/)
  })

  it('voice keeps one quiet safety note on idle', () => {
    const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
    assert.match(voice, /ORB_VOICE_STATUS_CARD_COPY/)
    assert.match(voice, /workspaceMode !== 'idle'/)
    assert.match(voice, /OrbVoiceResponsibilityStrip/)
  })

  it('help modal uses scroll-safe layout', () => {
    const help = read('components/orb-standalone/orb-help-panel.tsx')
    assert.match(help, /orb-modal--plain/)
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(help, /What ORB can help with/)
    assert.match(help, /Safeguarding boundaries/)
    assert.doesNotMatch(help, /rounded-xl border border-\[var\(--orb-line\)\] bg-\[var\(--orb-surface\)\]/)
  })

  it('sidebar keeps approved nav without helper subtitles', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.doesNotMatch(sidebar, /Speak or paste rough notes for a clearer draft/)
    assert.doesNotMatch(sidebar, /<IndiCareOsComingLaterButton/)
  })

  it('no legacy shell classes reintroduced in active components', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.doesNotMatch(companion, /orb-flagship-shell|orb-chat-shell|orb-composer-v2/)
  })
})
