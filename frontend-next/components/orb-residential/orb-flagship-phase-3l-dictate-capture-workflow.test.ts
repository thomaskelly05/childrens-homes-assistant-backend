import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_ACTION_COPY,
  ORB_DICTATE_ACTION_OPEN_WRITE,
  ORB_DICTATE_ACTION_SAVE,
  ORB_DICTATE_CAPTURE_HEADLINE,
  ORB_DICTATE_CAPTURE_JOURNEY,
  ORB_DICTATE_CONSENT_REMINDER,
  ORB_DICTATE_DRAFT_REVIEW_LABEL,
  ORB_DICTATE_PASTE_LABEL,
  ORB_DICTATE_PASTE_PLACEHOLDER,
  ORB_DICTATE_REVIEW_CHECKLIST_ITEMS,
  ORB_DICTATE_REVIEW_STATUS_MAY_MISSING,
  ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION,
  ORB_DICTATE_REVIEW_TITLE,
  ORB_DICTATE_SAFER_DRAFT_TITLE,
  ORB_DICTATE_SPEAK_LABEL,
  ORB_DICTATE_UPLOAD_LABEL
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3L Dictate capture workflow', () => {
  it('build version marker is phase-5e-render-build-memory-fix', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5e-render-build-memory-fix')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Dictate renders the core headline and journey', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.equal(ORB_DICTATE_CAPTURE_HEADLINE, 'Dictate')
    assert.match(workspace, /ORB_DICTATE_CAPTURE_HEADLINE/)
    assert.match(workspace, /data-orb-dictate-journey/)
    assert.match(workspace, /ORB_DICTATE_CAPTURE_JOURNEY/)
    assert.match(workspace, /data-orb-dictate-stage="capture-station"/)
    assert.match(workspace, /data-orb-dictate-stage="orb-review"/)
    assert.match(workspace, /data-orb-dictate-stage="safer-draft"/)
  })

  it('capture methods exist: Speak, Paste notes, Upload audio', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    assert.equal(ORB_DICTATE_SPEAK_LABEL, 'Speak')
    assert.equal(ORB_DICTATE_PASTE_LABEL, 'Paste notes')
    assert.equal(ORB_DICTATE_UPLOAD_LABEL, 'Upload audio')
    assert.match(capture, /data-orb-dictate-capture-method=\{method\.id\}/)
  })

  it('paste notes area and consent reminder are present', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    assert.equal(ORB_DICTATE_PASTE_PLACEHOLDER, 'Paste rough notes here. Use only necessary details for this working draft.')
    assert.match(capture, /data-orb-dictate-paste-notes/)
    assert.match(capture, /data-orb-dictate-consent-reminder/)
    assert.match(capture, /ORB_DICTATE_CONSENT_REMINDER/)
  })

  it('ORB Review section uses checklist with child voice and uncertain status labels', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const checklist = read('components/orb/dictate/OrbDictateReviewChecklist.tsx')
    assert.equal(ORB_DICTATE_REVIEW_TITLE, 'ORB Review')
    assert.match(workspace, /data-orb-dictate-orb-review-stage/)
    assert.match(checklist, /data-orb-dictate-review-checklist/)
    assert.ok(ORB_DICTATE_REVIEW_CHECKLIST_ITEMS.some((item) => /child say, show or communicate/i.test(item)))
    assert.equal(ORB_DICTATE_REVIEW_STATUS_MAY_MISSING, 'May be missing')
    assert.equal(ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION, 'Needs adult decision')
    assert.match(checklist, /data-orb-dictate-review-status/)
  })

  it('Safer Draft is labelled for adult review with output actions', () => {
    const draft = read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx')
    assert.equal(ORB_DICTATE_SAFER_DRAFT_TITLE, 'Safer Draft')
    assert.equal(ORB_DICTATE_DRAFT_REVIEW_LABEL, 'Generated for adult review')
    assert.equal(ORB_DICTATE_ACTION_COPY, 'Copy')
    assert.equal(ORB_DICTATE_ACTION_SAVE, 'Save draft')
    assert.equal(ORB_DICTATE_ACTION_OPEN_WRITE, 'Open in ORB Write')
    assert.match(draft, /data-orb-dictate-safer-draft/)
    assert.match(draft, /data-orb-dictate-draft-review-label/)
    assert.match(draft, /data-orb-dictate-copy/)
    assert.match(draft, /data-orb-dictate-save/)
    assert.match(draft, /data-orb-dictate-open-write/)
  })

  it('record type suggestion selector exists', () => {
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    assert.match(selector, /data-orb-dictate-write-template-section/)
    assert.match(selector, /data-orb-dictate-write-template-option/)
    assert.match(read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx'), /OrbDictateWriteTemplateSelector/)
  })

  it('does not claim compliance or finalisation', () => {
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(copy, /reviewed by an adult before use/)
    assert.match(copy, /Adults remain responsible/)
    assert.doesNotMatch(workspace, /guarantee compliance|final record|official record/i)
    assert.doesNotMatch(copy, /guarantee compliance|certified compliant/i)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5e-render-build-memory-fix/)
    assert.match(read('app/orb/orb-residential-shell.css'), /Phase 3N/)
  })
})
