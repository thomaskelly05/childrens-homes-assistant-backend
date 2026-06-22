import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_ACTION_COPY,
  ORB_DICTATE_ACTION_OPEN_WRITE,
  ORB_DICTATE_ACTION_SAVE,
  ORB_DICTATE_APPLY_ORB_CHANGE,
  ORB_DICTATE_DRAFT_REVIEW_LABEL,
  ORB_DICTATE_EDIT_ASSISTANT_TITLE,
  ORB_DICTATE_EDIT_INSTRUCTION_PLACEHOLDER,
  ORB_DICTATE_ORIGINAL_NOTES_LABEL,
  ORB_DICTATE_ORIGINAL_TRANSCRIPT_LABEL,
  ORB_DICTATE_QUICK_EDIT_PROMPTS,
  ORB_DICTATE_RECORD_TYPE_SUGGESTIONS,
  ORB_DICTATE_REVIEW_TITLE,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_SAFER_DRAFT_TITLE,
  ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE,
  ORB_DICTATE_WORKING_DOC_LABEL,
  ORB_DICTATE_WORKING_DOC_TITLE,
  ORB_DICTATE_WRITE_TEMPLATE_TITLE
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3N Dictate transcript workspace', () => {
  it('build version marker is phase-5o-orb-premium-ui-voice-timing-cleanup', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5o-orb-premium-ui-voice-timing-cleanup')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('transcript workspace shows title and editable original transcript', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const panel = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.equal(ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE, 'Transcript workspace')
    assert.equal(ORB_DICTATE_ORIGINAL_TRANSCRIPT_LABEL, 'Original transcript \u2014 not yet a record')
    assert.equal(ORB_DICTATE_ORIGINAL_NOTES_LABEL, 'Original notes \u2014 not yet a record')
    assert.match(workspace, /OrbDictateDocumentWorkspace/)
    assert.match(panel, /data-orb-dictate-transcript-workspace/)
    assert.match(panel, /data-orb-dictate-original-transcript/)
    assert.match(panel, /onTranscriptChange/)
  })

  it('Review with ORB is enabled when transcript or working document text exists', () => {
    const panel = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.match(panel, /data-orb-dictate-review-with-orb/)
    assert.match(panel, /const canAct = hasTranscript \|\| hasWorkingDoc/)
    assert.match(panel, /disabled=\{!canAct\}/)
    assert.doesNotMatch(panel, /data-orb-dictate-review-with-orb[\s\S]{0,120}props\.generating/)
  })

  it('ORB edit assistant panel and instruction input exist', () => {
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    assert.equal(ORB_DICTATE_EDIT_ASSISTANT_TITLE, 'What changes should ORB make?')
    assert.match(ORB_DICTATE_EDIT_INSTRUCTION_PLACEHOLDER, /missing from home report/)
    assert.match(assistant, /data-orb-dictate-edit-assistant/)
    assert.match(assistant, /data-orb-dictate-edit-instruction/)
    assert.match(assistant, /ORB_DICTATE_APPLY_ORB_CHANGE/)
    assert.equal(ORB_DICTATE_APPLY_ORB_CHANGE, 'Apply change')
  })

  it('quick edit chips populate instruction input without auto-submit', () => {
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    assert.ok(ORB_DICTATE_QUICK_EDIT_PROMPTS.some((p) => /child-centred/i.test(p.label)))
    assert.match(assistant, /data-orb-dictate-quick-edit-prompt/)
    assert.match(assistant, /onClick=\{\(\) => onInstructionChange\(prompt\.instruction\)\}/)
  })

  it('ORB Write template section includes required template options', () => {
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    assert.equal(ORB_DICTATE_WRITE_TEMPLATE_TITLE, 'Document type')
    assert.match(selector, /data-orb-dictate-write-template-section/)
    assert.ok(ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.some((o) => o.label === 'Daily record'))
    assert.ok(ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.some((o) => o.label === 'Incident reflection'))
    assert.ok(ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.some((o) => o.label === 'Missing from home'))
    assert.match(selector, /data-orb-dictate-write-template-option/)
  })

  it('workspace wires template selection, working document, ORB review and edit API', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const panel = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.match(workspace, /handleTemplateSelect/)
    assert.match(workspace, /handleReviewWithOrb/)
    assert.match(workspace, /applyDictateIntelligenceEdit/)
    const intelligence = read('lib/orb/dictate/orb-dictate-intelligence.ts')
    assert.match(intelligence, /buildLocalDictateEditFallback/)
    assert.match(workspace, /adult_instruction/)
    assert.match(workspace, /setWorkingDocument/)
    assert.match(panel, /OrbDictateWorkingDocument/)
    assert.equal(ORB_DICTATE_WORKING_DOC_TITLE, 'ORB working document')
    assert.equal(ORB_DICTATE_WORKING_DOC_LABEL, 'Generated for adult review')
  })

  it('ORB Review and Safer Draft remain gated with honest output actions', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const draft = read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx')
    assert.equal(ORB_DICTATE_REVIEW_TITLE, 'ORB Review')
    assert.equal(ORB_DICTATE_REVIEW_WITH_ORB, 'Review with ORB')
    assert.match(workspace, /showOrbReview \?/)
    assert.match(workspace, /OrbDictateReviewChecklist/)
    assert.equal(ORB_DICTATE_SAFER_DRAFT_TITLE, 'Safer Draft')
    assert.equal(ORB_DICTATE_DRAFT_REVIEW_LABEL, 'Generated for adult review')
    assert.equal(ORB_DICTATE_ACTION_COPY, 'Copy')
    assert.equal(ORB_DICTATE_ACTION_SAVE, 'Save draft')
    assert.equal(ORB_DICTATE_ACTION_OPEN_WRITE, 'Open in ORB Write')
    assert.match(draft, /data-orb-dictate-open-write/)
  })

  it('does not claim compliance or finalisation', () => {
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(copy, /reviewed by an adult before use/)
    assert.match(copy, /Adults remain responsible/)
    assert.doesNotMatch(workspace, /guarantee compliance|final record|official record/i)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5o-orb-premium-ui-voice-timing-cleanup/)
    assert.match(read('app/orb/orb-residential-shell.css'), /Phase 3O/)
  })
})
