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
  ORB_DICTATE_QUICK_EDIT_PROMPTS,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE,
  ORB_DICTATE_WORKING_DOC_LABEL,
  ORB_DICTATE_WORKING_DOC_TITLE,
  ORB_DICTATE_WORKING_DOC_UPDATED,
  ORB_DICTATE_WRITE_TEMPLATE_TITLE
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3O Dictate working document', () => {
  it('build version marker is phase-5h-voice-v2-specialist-brain', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5h-voice-v2-specialist-brain')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('transcript workspace shows working document panel', () => {
    const panel = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const working = read('components/orb/dictate/OrbDictateWorkingDocument.tsx')
    assert.equal(ORB_DICTATE_TRANSCRIPT_WORKSPACE_TITLE, 'Transcript workspace')
    assert.equal(ORB_DICTATE_WORKING_DOC_TITLE, 'ORB working document')
    assert.equal(ORB_DICTATE_WORKING_DOC_LABEL, 'Generated for adult review')
    assert.match(panel, /OrbDictateWorkingDocument/)
    assert.match(working, /data-orb-dictate-working-document/)
  })

  it('ORB instruction accepts natural language and Apply ORB change updates working document', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    assert.match(assistant, /data-orb-dictate-edit-instruction/)
    assert.equal(ORB_DICTATE_APPLY_ORB_CHANGE, 'Apply change')
    assert.match(workspace, /applyDictateIntelligenceEdit/)
    assert.match(workspace, /setWorkingDocument\(result\.workingDocument\)/)
    assert.match(workspace, /ORB_DICTATE_WORKING_DOC_UPDATED/)
    assert.equal(ORB_DICTATE_WORKING_DOC_UPDATED, 'ORB updated the working document for adult review.')
  })

  it('Apply ORB change and Review with ORB enabled when transcript or working document exists', () => {
    const panel = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    assert.match(panel, /const canAct = hasTranscript \|\| hasWorkingDoc/)
    assert.match(assistant, /canApply/)
    assert.match(panel, /disabled=\{!canAct\}/)
    assert.match(assistant, /disabled=\{disabled \|\| applying \|\| !canApply\}/)
  })

  it('quick edit chips populate instruction without auto-submit', () => {
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    assert.ok(ORB_DICTATE_QUICK_EDIT_PROMPTS.length >= 6)
    assert.match(assistant, /onClick=\{\(\) => onInstructionChange\(prompt\.instruction\)\}/)
  })

  it('ORB Write template selector reshapes working document headings', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const util = read('lib/orb/dictate/orb-dictate-working-document.ts')
    assert.equal(ORB_DICTATE_WRITE_TEMPLATE_TITLE, 'Document type')
    assert.match(workspace, /reshapeWorkingDocument/)
    assert.match(util, /workingDocumentSectionsForTemplate/)
    assert.match(util, /What was known/)
    assert.match(util, /ORB_DICTATE_WORKING_SECTIONS_MISSING/)
    assert.match(workspace, /handleTemplateSelect/)
  })

  it('Review with ORB uses working document and leads to ORB Review', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.equal(ORB_DICTATE_REVIEW_WITH_ORB, 'Review with ORB')
    assert.match(workspace, /reviewInputText/)
    assert.match(workspace, /input_text: reviewInputText/)
    assert.match(workspace, /handleReviewWithOrb/)
    assert.match(workspace, /showOrbReview \?/)
  })

  it('safer draft uses working document base and output actions remain', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const draft = read('components/orb/dictate/OrbDictateSaferDraftPanel.tsx')
    assert.match(workspace, /onGenerate\(\{ input_text: text \}\)/)
    assert.match(workspace, /onEditedNoteChange/)
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
    assert.doesNotMatch(workspace, /guarantee compliance|final record|official record/i)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5h-voice-v2-specialist-brain/)
    assert.match(read('app/orb/orb-residential-shell.css'), /Phase 3O/)
  })
})
