import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DICTATE_APPLY_CHANGE,
  ORB_DICTATE_ASSISTANT_TITLE,
  ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED,
  ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE,
  ORB_DICTATE_PROCESSING_STAGES,
  ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE,
  ORB_DICTATE_SOURCE_TRANSCRIPT_TOGGLE,
  ORB_DICTATE_WHAT_ARE_YOU_RECORDING,
  ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE
} from '../../lib/orb/dictate/orb-dictate-capture-copy.ts'
import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3Q Dictate template document workspace', () => {
  it('build version marker is phase-5b-voice-v2-safari-katherine-hardening', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5b-voice-v2-safari-katherine-hardening')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('first Dictate screen asks what are you recording before capture', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    assert.equal(ORB_DICTATE_WHAT_ARE_YOU_RECORDING, 'What are you recording?')
    assert.match(capture, /ORB_DICTATE_WHAT_ARE_YOU_RECORDING/)
    assert.match(capture, /data-orb-dictate-what-are-you-recording/)
  })

  it('template options appear before record with missing from home selectable', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    const selector = read('components/orb/dictate/OrbDictateWriteTemplateSelector.tsx')
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    assert.match(copy, /Missing from home/)
    assert.match(capture, /OrbDictateWriteTemplateSelector/)
    assert.match(selector, /data-orb-dictate-write-template-option/)
    assert.match(capture, /data-orb-dictate-hero-record/)
  })

  it('selected template is visible before capture and record button remains primary', () => {
    const capture = read('components/orb/dictate/OrbDictateCaptureStation.tsx')
    assert.match(capture, /data-orb-dictate-recording-as/)
    assert.match(capture, /ORB_DICTATE_RECORDING_AS_PREFIX/)
    assert.match(capture, /data-orb-dictate-top-record/)
    assert.match(capture, /orb-dictate-hero-record/)
  })

  it('processing states include saving audio transcribing and structuring document', () => {
    const stages = read('components/orb/dictate/OrbDictateProcessingStages.tsx')
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const labels = ORB_DICTATE_PROCESSING_STAGES.map((item) => item.label)
    assert.ok(labels.includes('Saving recording'))
    assert.ok(labels.includes('Transcribing audio'))
    assert.ok(labels.includes('Structuring document'))
    assert.match(stages, /data-orb-dictate-processing-stages/)
    assert.match(copy, /identifying_people/)
  })

  it('people and speakers confirmation section exists after capture', () => {
    const people = read('components/orb/dictate/OrbDictatePeopleConfirm.tsx')
    const util = read('lib/orb/dictate/orb-dictate-people-identification.ts')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(people, /data-orb-dictate-people-confirm/)
    assert.match(util, /buildPeopleToConfirm/)
    assert.match(station, /peopleToConfirm/)
  })

  it('after capture document workspace appears with working document as main surface', () => {
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const documentWorkspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.equal(ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE, 'Document workspace')
    assert.match(workspace, /OrbDictateDocumentWorkspace/)
    assert.match(documentWorkspace, /data-orb-dictate-document-workspace/)
    assert.match(documentWorkspace, /orb-dictate-document-main/)
    const working = read('components/orb/dictate/OrbDictateWorkingDocument.tsx')
    assert.match(documentWorkspace, /OrbDictateWorkingDocument/)
    assert.match(documentWorkspace, /prominent/)
    assert.match(working, /data-orb-dictate-working-document-prominent/)
  })

  it('source transcript is secondary and collapsible', () => {
    const documentWorkspace = read('components/orb/dictate/OrbDictateDocumentWorkspace.tsx')
    assert.equal(ORB_DICTATE_SOURCE_TRANSCRIPT_TOGGLE, 'View original transcript')
    assert.match(documentWorkspace, /data-orb-dictate-source-transcript/)
    assert.match(documentWorkspace, /data-orb-dictate-original-transcript/)
  })

  it('assistant panel asks what changes ORB should make with natural language input', () => {
    const assistant = read('components/orb/dictate/OrbDictateEditAssistant.tsx')
    assert.equal(ORB_DICTATE_ASSISTANT_TITLE, 'What changes should ORB make?')
    assert.match(assistant, /data-orb-dictate-edit-instruction/)
    assert.equal(ORB_DICTATE_APPLY_CHANGE, 'Apply change')
    assert.match(assistant, /ORB_DICTATE_APPLY_ORB_CHANGE/)
  })

  it('applying an instruction updates the working document', () => {
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(studio, /applyDictateIntelligenceEdit/)
    assert.match(studio, /setWorkingDocument\(result\.workingDocument\)/)
    assert.match(studio, /handleApplyOrbChange/)
  })

  it('changing template reshapes document headings with structure updated status', () => {
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(studio, /reshapeWorkingDocument/)
    assert.match(studio, /ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED/)
    assert.equal(ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED, 'Document structure updated for adult review.')
  })

  it('recording attachment shows local-only or saved-with-draft honest status', () => {
    const attachment = read('components/orb/dictate/OrbDictateRecordingAttachment.tsx')
    const persistence = read('lib/orb/dictate/orb-dictate-media-persistence.ts')
    assert.match(attachment, /persistenceStatus/)
    assert.match(attachment, /data-orb-dictate-recording-local-note/)
    assert.match(persistence, /permanent_not_enabled/)
    assert.equal(
      ORB_DICTATE_RECORDING_LOCAL_PERSISTENCE_NOTE,
      'Recording attached locally. Permanent recording storage is not yet enabled.'
    )
  })

  it('save draft and ORB Write handoff include dictate metadata without permanent storage claims', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const handoff = read('lib/orb/write/orb-write-handoff.ts')
    assert.match(station, /working_document/)
    assert.match(station, /people_to_confirm/)
    assert.match(station, /ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE/)
    assert.equal(ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE, 'Created from ORB Dictate')
    assert.match(handoff, /people_to_confirm\?:/)
    assert.match(handoff, /working_document\?:/)
    assert.doesNotMatch(station, /permanently stored|permanent storage enabled/i)
  })

  it('does not claim compliance guarantee language', () => {
    const copy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(copy, /reviewed by an adult before use/)
    assert.doesNotMatch(workspace, /guarantee compliance|Ofsted approved|official record/i)
  })

  it('single shell and one CSS import remain true', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(layout, /import '\.\/.*\.css'[\s\S]*import '\.\/.*\.css'/)
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5b-voice-v2-safari-katherine-hardening/)
  })
})
