import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER,
  ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE,
  ORB_DICTATE_WORKING_DOC_LABEL
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3S Dictate document quality', () => {
  it('build version marker is phase-4a-voice-reflective-companion', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-4a-voice-reflective-companion')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Dictate document uses ORB Write-style document surface hooks and paragraph blocks', () => {
    const working = read('components/orb/dictate/OrbDictateWorkingDocument.tsx')
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.match(working, /data-orb-write-canvas-workspace/)
    assert.match(working, /data-orb-write-print-page/)
    assert.match(working, /data-orb-dictate-document-blocks/)
    assert.match(working, /orb-dictate-write-paragraph-block/)
    assert.match(workspace, /data-orb-dictate-document-quality/)
    assert.doesNotMatch(working, /rows=\{12\}.*data-orb-dictate-working-document-section-body/s)
  })

  it('transcript text is mapped into multiple document sections for daily record', () => {
    const util = read('lib/orb/dictate/orb-dictate-working-document.ts')
    assert.match(util, /mapTranscriptToSections/)
    assert.match(util, /buildInitialWorkingDocument/)
    assert.match(util, /football/)
    assert.match(util, /friendship/)
    assert.match(util, /Summary of the day/)
    assert.match(util, /Key interactions/)
  })

  it('missing sections show not captured yet or needs adult confirmation guidance', () => {
    const util = read('lib/orb/dictate/orb-dictate-working-document.ts')
    assert.match(util, /ORB_DICTATE_SECTION_PLACEHOLDER_NOT_CAPTURED/)
    assert.match(util, /ORB_DICTATE_SECTION_PLACEHOLDER_ADULT_SUPPORT/)
    assert.match(util, /isOrbDictateSectionPlaceholder/)
    assert.match(util, /Not captured yet\. Add what was observed or known\./)
    assert.match(util, /Needs adult confirmation\./)
  })

  it('people panel uses neutral surface not pale yellow warning styling', () => {
    const people = read('components/orb/dictate/OrbDictatePeopleConfirm.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(people, /data-orb-dictate-people-confirm-surface="neutral"/)
    assert.doesNotMatch(people, /bg-amber-50/)
    assert.match(css, /phase-3s-dictate-document-quality/)
  })

  it('detects my name is Tom Kelly and redacted NAME patterns cautiously', () => {
    const util = read('lib/orb/dictate/orb-dictate-people-identification.ts')
    assert.match(util, /NAME_INTRO_PATTERNS/)
    assert.match(util, /\[NAME_/)
    assert.match(util, /Appears to be speaker/)
    assert.match(util, /detectNamedSpeakers/)
  })

  it('speaker rows are editable and confirmable', () => {
    const people = read('components/orb/dictate/OrbDictatePeopleConfirm.tsx')
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.match(people, /data-orb-dictate-people-confirm-label/)
    assert.match(people, /data-orb-dictate-people-confirm-confirm/)
    assert.match(people, /data-orb-dictate-people-confirm-remove/)
    assert.match(workspace, /onPeopleToConfirmChange/)
  })

  it('registered manager role detection appears when transcript includes it', () => {
    const util = read('lib/orb/dictate/orb-dictate-people-identification.ts')
    assert.match(util, /REGISTERED_MANAGER_PATTERN/)
    assert.match(util, /registered_manager/)
    assert.match(util, /may apply to speaker/)
  })

  it('Dictate buttons use accessible visible label classes', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    const modal = read('components/orb/dictate/OrbDictateWriteTransitionModal.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(capture, /data-orb-dictate-hero-record/)
    assert.match(workspace, /orb-dictate-primary-action/)
    assert.match(workspace, /orb-dictate-secondary-action/)
    assert.match(assistant, /orb-dictate-primary-action/)
    assert.match(modal, /orb-dictate-primary-action/)
    assert.match(css, /\.orb-dictate-secondary-action/)
  })

  it('assistant rail keeps free-text instruction and applies to working document', () => {
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(assistant, /data-orb-dictate-edit-instruction/)
    assert.match(studio, /applyDictateIntelligenceEdit/)
    assert.match(studio, /setWorkingDocument\(result\.workingDocument\)/)
  })

  it('document type dropdown, source transcript and recording attachment remain available', () => {
    const workspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    assert.match(workspace, /OrbDictateWriteTemplateSelector/)
    assert.match(selector, /data-orb-dictate-template-select/)
    assert.match(workspace, /data-orb-dictate-source-transcript/)
    assert.match(workspace, /OrbDictateRecordingAttachment/)
  })

  it('permanent storage is not overclaimed and adult review label remains', () => {
    const persistence = read('lib/orb/dictate/orb-dictate-media-persistence.ts')
    const working = read('components/orb/dictate/OrbDictateWorkingDocument.tsx')
    assert.equal(ORB_DICTATE_WORKING_DOC_LABEL, 'Generated for adult review')
    assert.equal(
      ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE,
      'Recording attached locally. Permanent recording storage is not yet enabled.'
    )
    assert.match(persistence, /permanent_not_enabled/)
    assert.match(working, /ORB_DICTATE_WORKING_DOC_LABEL/)
    assert.doesNotMatch(working, /guarantee compliance|Ofsted approved/i)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    const util = read('lib/orb/dictate/orb-dictate-working-document.ts')
    assert.match(companion, /orb-app-shell/)
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.match(util, /serializeWorkingDocument/)
    assert.equal(ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER, 'ORB may identify speakers or people mentioned, but adults must confirm accuracy.')
  })
})
