import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_ACTION_COPY,
  ORB_DICTATE_ACTION_OPEN_WRITE,
  ORB_DICTATE_ACTION_SAVE,
  ORB_DICTATE_CAPTURE_AGAIN,
  ORB_DICTATE_CAPTURE_HEADLINE,
  ORB_DICTATE_CAPTURE_JOURNEY,
  ORB_DICTATE_CONSENT_REMINDER,
  ORB_DICTATE_CREATE_ROUGH_CAPTURE,
  ORB_DICTATE_CREATE_SAFER_DRAFT,
  ORB_DICTATE_DRAFT_REVIEW_LABEL,
  ORB_DICTATE_NOT_YET_RECORD,
  ORB_DICTATE_PASTE_LABEL,
  ORB_DICTATE_RECENT_CAPTURES_EMPTY,
  ORB_DICTATE_RECENT_CAPTURES_TITLE,
  ORB_DICTATE_REVIEW_CHECKLIST_ITEMS,
  ORB_DICTATE_REVIEW_STATUS_MAY_MISSING,
  ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION,
  ORB_DICTATE_REVIEW_TITLE,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_SAFER_DRAFT_TITLE,
  ORB_DICTATE_SPEAK_LABEL,
  ORB_DICTATE_UPLOAD_LABEL
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3M Dictate staged recording', () => {
  it('build version marker is phase-3s-dictate-document-quality', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-3s-dictate-document-quality')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('first Dictate screen shows heading and capture station without ORB Review or Safer Draft', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.equal(ORB_DICTATE_CAPTURE_HEADLINE, 'Dictate')
    assert.match(workspace, /ORB_DICTATE_CAPTURE_HEADLINE/)
    assert.match(workspace, /data-orb-dictate-capture-station/)
    assert.match(workspace, /showCaptureStation \?/)
    assert.match(workspace, /showOrbReview \?/)
    assert.match(workspace, /showSaferDraft \?/)
    assert.match(workspace, /OrbDictateReviewChecklist/)
    assert.match(workspace, /showOrbReview \? \([\s\S]*OrbDictateReviewChecklist/)
  })

  it('first screen shows large record button and capture methods', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /data-orb-dictate-hero-record/)
    assert.match(workspace, /h-20 w-20/)
    assert.equal(ORB_DICTATE_SPEAK_LABEL, 'Speak')
    assert.equal(ORB_DICTATE_PASTE_LABEL, 'Paste notes')
    assert.equal(ORB_DICTATE_UPLOAD_LABEL, 'Upload audio')
    assert.match(workspace, /data-orb-dictate-capture-method=\{method\.id\}/)
  })

  it('first screen shows Recent captures list with honest empty state', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const recent = read('components/orb/dictate/OrbDictateRecentCaptures.tsx')
    assert.equal(ORB_DICTATE_RECENT_CAPTURES_TITLE, 'Recent captures')
    assert.equal(ORB_DICTATE_RECENT_CAPTURES_EMPTY, 'No recent captures yet.')
    assert.match(workspace, /OrbDictateRecentCaptures/)
    assert.match(recent, /data-orb-dictate-recent-captures/)
    assert.match(recent, /listOrbDictateRecentCaptures/)
  })

  it('paste notes creates rough capture rather than jumping to ORB Review', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.equal(ORB_DICTATE_CREATE_ROUGH_CAPTURE, 'Create rough capture')
    const pastePanel = workspace.match(/data-orb-dictate-paste-panel[\s\S]*?\{captureMethod === 'upload'/)?.[0] ?? ''
    assert.match(pastePanel, /data-orb-dictate-create-rough-capture/)
    assert.match(pastePanel, /onClick=\{handleCreateRoughCapture\}/)
    assert.doesNotMatch(pastePanel, /data-orb-dictate-review-with-orb/)
    assert.match(workspace, /handleReviewWithOrb/)
  })

  it('rough capture stage shows not-yet-record label and Review with ORB', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const panel = read('components/orb/dictate/OrbDictateTranscriptWorkspace.tsx')
    assert.equal(ORB_DICTATE_NOT_YET_RECORD, 'Not yet a record')
    assert.equal(ORB_DICTATE_REVIEW_WITH_ORB, 'Review with ORB')
    assert.equal(ORB_DICTATE_CAPTURE_AGAIN, 'Capture again')
    assert.match(panel, /data-orb-dictate-rough-capture-stage/)
    assert.match(panel, /data-orb-dictate-review-with-orb/)
    assert.match(workspace, /stage === 'transcript-workspace'/)
  })

  it('ORB Review only appears after Review with ORB is requested', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /reviewRequested/)
    assert.match(workspace, /setReviewRequested\(true\)/)
    assert.match(workspace, /if \(reviewRequested && hasCommittedCapture\) return 'orb-review'/)
    assert.match(workspace, /data-orb-dictate-orb-review-stage/)
    assert.equal(ORB_DICTATE_REVIEW_TITLE, 'ORB Review')
  })

  it('ORB Review checklist includes child voice and uncertain status labels', () => {
    const checklist = read('components/orb/dictate/OrbDictateReviewChecklist.tsx')
    assert.ok(ORB_DICTATE_REVIEW_CHECKLIST_ITEMS.some((item) => /child say, show or communicate/i.test(item)))
    assert.equal(ORB_DICTATE_REVIEW_STATUS_MAY_MISSING, 'May be missing')
    assert.equal(ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION, 'Needs adult decision')
    assert.match(checklist, /data-orb-dictate-review-checklist/)
    assert.match(checklist, /data-orb-dictate-review-status/)
  })

  it('Safer Draft only appears after draft output exists', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const draft = read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx')
    assert.equal(ORB_DICTATE_CREATE_SAFER_DRAFT, 'Create safer draft')
    assert.match(workspace, /showSaferDraft/)
    assert.match(workspace, /hasDraft/)
    assert.equal(ORB_DICTATE_SAFER_DRAFT_TITLE, 'Safer Draft')
    assert.equal(ORB_DICTATE_DRAFT_REVIEW_LABEL, 'Generated for adult review')
    assert.match(draft, /data-orb-dictate-safer-draft/)
    assert.match(draft, /data-orb-dictate-draft-review-label/)
  })

  it('Safer Draft output actions include Open in ORB Write, Copy and Save draft', () => {
    const draft = read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx')
    assert.equal(ORB_DICTATE_ACTION_COPY, 'Copy')
    assert.equal(ORB_DICTATE_ACTION_SAVE, 'Save draft')
    assert.equal(ORB_DICTATE_ACTION_OPEN_WRITE, 'Open in ORB Write')
    assert.match(draft, /data-orb-dictate-copy/)
    assert.match(draft, /data-orb-dictate-save/)
    assert.match(draft, /data-orb-dictate-open-write/)
  })

  it('does not claim compliance or finalisation', () => {
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(copy, /reviewed by an adult before use/)
    assert.match(copy, /Adults remain responsible/)
    assert.doesNotMatch(workspace, /guarantee compliance|final record|official record/i)
    assert.doesNotMatch(copy, /guarantee compliance|certified compliant/i)
  })

  it('staged journey map and consent reminder are present', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(workspace, /ORB_DICTATE_CAPTURE_JOURNEY/)
    assert.match(workspace, /data-orb-dictate-stage="capture-station"/)
    assert.match(workspace, /data-orb-dictate-stage="transcript-workspace"/)
    assert.match(workspace, /data-orb-dictate-stage="orb-review"/)
    assert.match(workspace, /data-orb-dictate-stage="safer-draft"/)
    assert.match(workspace, /ORB_DICTATE_CONSENT_REMINDER/)
    assert.match(workspace, /data-orb-dictate-consent-reminder/)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-3s-dictate-document-quality/)
    assert.match(read('app/orb/orb-residential-shell.css'), /Phase 3N/)
  })
})
