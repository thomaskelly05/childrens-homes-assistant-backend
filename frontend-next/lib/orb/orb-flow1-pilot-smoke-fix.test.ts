import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { orbDraftNoticeHasReadableContrast, ORB_DRAFT_NOTICE_CLASS } from './orb-draft-notice.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Flow 1 pilot smoke fix', () => {
  it('daily record chat suggestions include ORB Write and Records actions', () => {
    const suggestions = read('lib/orb/orb-chat-template-suggestions.ts')
    assert.match(suggestions, /Open in ORB Write using Daily Record template/)
    assert.match(suggestions, /Save to Records & Drafts/)
    assert.match(suggestions, /save_to_records/)
    assert.match(suggestions, /ROUTINE_DAILY_UNRELATED_TEMPLATES/)
    assert.match(suggestions, /suggestionKey/)
  })

  it('saved output detail exposes primary Open in ORB Write workflow', () => {
    const actions = read('components/orb-standalone/orb-saved-output-detail-actions.tsx')
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(actions, /data-orb-saved-output-open-write/)
    assert.match(actions, /Open in ORB Write/)
    assert.match(actions, /data-orb-saved-output-finalise/)
    assert.match(actions, /data-orb-saved-output-archive/)
    assert.match(panel, /onOpenSavedOutputInOrbWrite/)
    assert.match(panel, /variant="records"/)
  })

  it('chat-created draft reopen builds working document when structure is missing', () => {
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(handoff, /convertAnswerToWorkingDocument/)
    assert.match(handoff, /handoffSavedOutputAsWorkingDocument/)
  })

  it('warning banner and draft notice use readable contrast tokens', () => {
    assert.equal(orbDraftNoticeHasReadableContrast(ORB_DRAFT_NOTICE_CLASS), true)
    assert.match(ORB_DRAFT_NOTICE_CLASS, /border-2/)
    assert.match(ORB_DRAFT_NOTICE_CLASS, /text-amber-950/)
    const stationStates = read('components/orb-standalone/orb-station-panel-states.tsx')
    assert.match(stationStates, /border-2 border-amber-500/)
    assert.match(stationStates, /text-amber-950/)
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(mobileCss, /\[data-orb-draft-notice\]/)
    assert.match(mobileCss, /\[data-orb-station-reconnect-banner\]/)
  })

  it('records preview uses readable contrast classes', () => {
    const output = read('components/orb-standalone/orb-intelligence-output.tsx')
    const shellCss = read('app/orb/orb-residential-shell.css')
    assert.match(output, /variant\?: 'default' \| 'records'/)
    assert.match(output, /--orb-mobile-ws-text/)
    assert.match(shellCss, /\[data-orb-intelligence-output='records'\]/)
  })
})
